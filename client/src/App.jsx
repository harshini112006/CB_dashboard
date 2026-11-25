import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  fetchSession, fetchMeta, fetchDashboard, exportUrl, logout, filtersFromUrl, toQuery, EMPTY_FILTERS,
} from './api.js';
import Filters from './components/Filters.jsx';
import Kpis from './components/Kpis.jsx';
import Insights from './components/Insights.jsx';
import Login from './components/Login.jsx';
import { TrendChart, BarBreakdown, DonutBreakdown, TopItems, HourChart, WeekdayChart } from './components/Charts.jsx';
import RecordsTable from './components/RecordsTable.jsx';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || ''; } catch { return ''; }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try { theme ? localStorage.setItem('theme', theme) : localStorage.removeItem('theme'); } catch { /* ignore */ }
  }, [theme]);
  const dark = theme ? theme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return [dark, () => setTheme(dark ? 'light' : 'dark')];
}

export default function App() {
  const [session, setSession] = useState(null); // { authEnabled, user, features }
  const [dark, toggleTheme] = useTheme();

  useEffect(() => {
    fetchSession().then(setSession).catch(() => setSession({ authEnabled: false, user: 'anonymous', features: {} }));
  }, []);

  if (!session) return <div className="app"><div className="skeleton-grid"><div className="sk" /></div></div>;
  if (session.authEnabled && !session.user) {
    return <Login onSuccess={(user) => setSession((s) => ({ ...s, user }))} />;
  }
  return (
    <Dashboard
      session={session} dark={dark} toggleTheme={toggleTheme}
      onSignOut={async () => { await logout().catch(() => {}); setSession((s) => ({ ...s, user: null })); }}
      onExpired={() => setSession((s) => ({ ...s, user: null }))}
    />
  );
}

function Dashboard({ session, dark, toggleTheme, onSignOut, onExpired }) {
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(filtersFromUrl);
  const [granularity, setGranularity] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fail = useCallback((e) => {
    if (e.name === 'AbortError') return;
    if (e.status === 401) return onExpired();
    setError(e.message); setLoading(false);
  }, [onExpired]);

  useEffect(() => {
    const ac = new AbortController();
    fetchMeta(ac.signal).then(setMeta).catch(fail);
    return () => ac.abort();
  }, [fail]);

  // Keep the URL in sync with the filters so any view can be shared / bookmarked.
  useEffect(() => {
    const q = toQuery(filters);
    window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
  }, [filters]);

  // Refetch whenever filters change. Older in-flight requests are aborted so a slow response
  // can never overwrite a newer one, and the previous data stays on screen (dimmed) meanwhile.
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetchDashboard(filters, granularity, ac.signal)
        .then((d) => { setData(d); setError(''); setLoading(false); })
        .catch(fail);
    }, 120);
    return () => { clearTimeout(t); ac.abort(); };
  }, [filters, granularity, fail]);

  const toggle = useCallback((key, value) => setFilters((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
  })), []);

  const active = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters],
  );
  const reset = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>🍔</span>
          <div>
            <h1>Burger Town Analytics</h1>
            <p>{meta ? `${meta.totalRecords.toLocaleString('en-IN')} line items · ${meta.minDate} → ${meta.maxDate}` : 'Loading dataset…'}</p>
          </div>
        </div>
        <div className="actions">
          <a className="btn" href={exportUrl(filters)} download>⬇ Export CSV</a>
          <button className="btn icon" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">{dark ? '☀' : '☾'}</button>
          {session.authEnabled && <button className="btn" onClick={onSignOut} title={`Signed in as ${session.user}`}>Sign out</button>}
        </div>
      </header>

      <Filters meta={meta} filters={filters} setFilters={setFilters} active={active} onReset={reset} />

      {error && <div className="error" role="alert">Couldn’t load data: {error}</div>}

      <main className={loading ? 'loading' : ''} aria-busy={loading}>
        {!data ? (
          <div className="skeleton-grid"><div className="sk" /><div className="sk" /><div className="sk" /></div>
        ) : data.kpis.orders === 0 ? (
          <div className="empty card">No orders match these filters. <button className="link" onClick={reset}>Clear filters</button></div>
        ) : (
          <>
            <Kpis k={data.kpis} />
            <Insights items={data.insights} filters={filters} aiEnabled={session.features?.ai} />
            <TrendChart data={data} granularity={granularity} onGranularity={setGranularity} />
            <section className="grid g3">
              <BarBreakdown title="Revenue by outlet" rows={data.outlets} selected={filters.outlets} onPick={(v) => toggle('outlets', v)} />
              <DonutBreakdown title="Order type" rows={data.orderTypes} selected={filters.orderTypes} onPick={(v) => toggle('orderTypes', v)} />
              <DonutBreakdown title="Payment / channel" rows={data.settlements} selected={filters.settlements} onPick={(v) => toggle('settlements', v)} />
            </section>
            <section className="grid g2">
              <BarBreakdown title="Revenue by category" rows={data.groups} selected={filters.groups} onPick={(v) => toggle('groups', v)} />
              <TopItems byRevenue={data.topItemsByRevenue} byUnits={data.topItemsByUnits} />
            </section>
            <section className="grid g2">
              <HourChart rows={data.hours} />
              <WeekdayChart rows={data.weekdays} />
            </section>
          </>
        )}
        <RecordsTable filters={filters} />
      </main>

      <footer>Built for the California Burrito technical assessment · React · Express · MongoDB · Recharts</footer>
    </div>
  );
}
