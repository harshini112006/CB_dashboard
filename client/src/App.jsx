import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchMeta, fetchDashboard, exportUrl } from './api.js';
import Filters from './components/Filters.jsx';
import Kpis from './components/Kpis.jsx';
import Insights from './components/Insights.jsx';
import { TrendChart, BarBreakdown, DonutBreakdown, TopItems, HourChart, WeekdayChart } from './components/Charts.jsx';
import RecordsTable from './components/RecordsTable.jsx';

const EMPTY = { from: '', to: '', outlets: [], groups: [], orderTypes: [], settlements: [] };

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
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [granularity, setGranularity] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dark, toggleTheme] = useTheme();

  useEffect(() => {
    const ac = new AbortController();
    fetchMeta(ac.signal).then(setMeta).catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ac.abort();
  }, []);

  // Refetch whenever filters change. Older in-flight requests are aborted so a slow response
  // can never overwrite a newer one, and the previous data stays on screen (dimmed) meanwhile.
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetchDashboard(filters, granularity, ac.signal)
        .then((d) => { setData(d); setError(''); setLoading(false); })
        .catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setLoading(false); } });
    }, 120);
    return () => { clearTimeout(t); ac.abort(); };
  }, [filters, granularity]);

  const toggle = useCallback((key, value) => setFilters((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
  })), []);

  const active = useMemo(
    () => filters.from || filters.to || ['outlets', 'groups', 'orderTypes', 'settlements'].some((k) => filters[k].length),
    [filters],
  );

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
        </div>
      </header>

      <Filters meta={meta} filters={filters} setFilters={setFilters} active={active} onReset={() => setFilters(EMPTY)} />

      {error && <div className="error" role="alert">Couldn’t load data: {error}</div>}

      <main className={loading ? 'loading' : ''} aria-busy={loading}>
        {!data ? (
          <div className="skeleton-grid"><div className="sk" /><div className="sk" /><div className="sk" /></div>
        ) : data.kpis.orders === 0 ? (
          <div className="empty card">No orders match these filters. <button className="link" onClick={() => setFilters(EMPTY)}>Clear filters</button></div>
        ) : (
          <>
            <Kpis k={data.kpis} />
            <Insights items={data.insights} />
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
