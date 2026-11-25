import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useFilters } from '../filters-context.jsx';
import { exportUrl } from '../api.js';
import { num, fmtDate } from '../format.js';
import FilterBar, { datePresets } from './FilterBar.jsx';
import Icon from './Icons.jsx';
import { TopProgress } from './Motion.jsx';
import Logo from './Logo.jsx';
import { useToast } from './Toast.jsx';
import CommandPalette from './CommandPalette.jsx';

const NAV = [
  ['/', 'Overview', 'overview', 'Sales performance at a glance'],
  ['/menu', 'Menu', 'menu', 'What sells, and what sells together'],
  ['/outlets', 'Outlets', 'pin', 'Compare locations side by side'],
  ['/orders', 'Orders', 'receipt', 'Every order, down to the receipt'],
];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function Shell({ session, dark, toggleTheme, onSignOut, children }) {
  const { filters, setFilters, toggle, active, reset, meta } = useFilters();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const page = NAV.find(([to]) => to === pathname) ?? NAV[0];
  const [palette, setPalette] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sidebar') === 'mini'; } catch { return false; } });

  useEffect(() => { document.title = `${page[1]} · Burger Town Analytics`; }, [page]);
  useEffect(() => { try { localStorage.setItem('sidebar', collapsed ? 'mini' : 'full'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]); // each page starts at the top

  // Ctrl/Cmd + K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast('Link to this view copied', 'link'); }
    catch { toast('Couldn’t copy – copy the address bar instead', 'x'); }
  };
  const go = (to) => navigate({ pathname: to, search });
  const clearAll = () => { reset(); toast('All filters cleared', 'filter'); };

  const actions = useMemo(() => {
    const a = NAV.map(([to, label, icon, sub]) => ({ id: `p${to}`, group: 'Pages', label, hint: sub, icon, run: () => go(to) }));
    datePresets(meta).forEach(([name, from, to]) => a.push({ id: `d${name}`, group: 'Date range', label: name, icon: 'calendar', run: () => setFilters((f) => ({ ...f, from, to })) }));
    for (const [key, group, icon] of [['outlets', 'Outlet', 'pin'], ['groups', 'Category', 'menu'], ['orderTypes', 'Order type', 'bag'], ['settlements', 'Payment', 'tag']]) {
      (meta?.[key] ?? []).forEach((v) => a.push({
        id: `${key}${v}`, group: `Filter by ${group.toLowerCase()}`, label: v, icon,
        hint: filters[key].includes(v) ? 'active – select to remove' : undefined, run: () => toggle(key, v),
      }));
    }
    a.push(
      { id: 'share', group: 'Actions', label: 'Copy link to this view', icon: 'link', run: copyLink },
      { id: 'csv', group: 'Actions', label: 'Export filtered rows as CSV', icon: 'download', run: () => { window.location.href = exportUrl(filters); toast('Preparing your CSV download…', 'download'); } },
      { id: 'theme', group: 'Actions', label: dark ? 'Switch to light mode' : 'Switch to dark mode', icon: dark ? 'sun' : 'moon', run: toggleTheme },
      { id: 'side', group: 'Actions', label: collapsed ? 'Expand sidebar' : 'Collapse sidebar', icon: 'panel', run: () => setCollapsed((c) => !c) },
    );
    if (active) a.push({ id: 'clear', group: 'Actions', label: 'Clear all filters', icon: 'x', run: clearAll });
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, filters, search, dark, collapsed, active]);

  const links = (cls) => NAV.map(([to, label, icon]) => (
    <NavLink key={to} to={{ pathname: to, search }} end={to === '/'} title={collapsed ? label : undefined}
      className={({ isActive }) => `${cls} ${isActive ? 'on' : ''}`}>
      <Icon name={icon} size={19} /><span className="lbl">{label}</span>
    </NavLink>
  ));

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <TopProgress />

      {/* Desktop sidebar. Links carry the query string, so active filters follow you between pages. */}
      <aside className="sidebar">
        <Logo />
        <button className="side-search" onClick={() => setPalette(true)} title="Search (Ctrl K)">
          <Icon name="search" size={16} /><span className="lbl">Search…</span><kbd className="lbl">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <nav className="side-nav" aria-label="Pages">{links('side-link')}</nav>
        <div className="side-foot">
          {meta && (
            <div className="dataset" title={`${num(meta.totalRecords)} line items`}>
              <span className="dot" aria-hidden />
              <div className="lbl"><b>{num(meta.totalRecords)}</b> line items<br /><small>{fmtDate(meta.minDate)} – {fmtDate(meta.maxDate)}</small></div>
            </div>
          )}
          <button className="side-btn" onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={17} /><span className="lbl">{dark ? 'Light mode' : 'Dark mode'}</span></button>
          {session.authEnabled && <button className="side-btn" onClick={onSignOut} title={`Sign out (${session.user})`}><Icon name="logout" size={17} /><span className="lbl">Sign out</span></button>}
          <button className="side-btn collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Icon name="panel" size={17} /><span className="lbl">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="mobile-top">
          <Logo size={36} />
          <div className="actions">
            <button className="btn icon" onClick={() => setPalette(true)} aria-label="Search"><Icon name="search" size={17} /></button>
            <button className="btn icon" onClick={toggleTheme} aria-label="Toggle dark mode"><Icon name={dark ? 'sun' : 'moon'} size={17} /></button>
            {session.authEnabled && <button className="btn icon" onClick={onSignOut} aria-label="Sign out"><Icon name="logout" size={17} /></button>}
          </div>
        </header>

        <header className="page-head" key={pathname}>
          <div>
            <h1>{page[1]}</h1>
            <p>{page[3]}</p>
          </div>
          <div className="actions">
            <button className="btn" onClick={copyLink} title="Copy a link to exactly this view"><Icon name="link" size={16} /> Share</button>
            <a className="btn" href={exportUrl(filters)} download onClick={() => toast('Preparing your CSV download…', 'download')} title="Download the rows matching the current filters">
              <Icon name="download" size={16} /> Export CSV
            </a>
          </div>
        </header>

        <FilterBar meta={meta} filters={filters} setFilters={setFilters} active={active} onReset={clearAll} />

        <div key={pathname} className="route">{children}</div>

        <footer>Built for the California Burrito technical assessment · React · Express · MongoDB · Recharts · Press <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd> to search</footer>
      </div>

      <button className={`to-top ${showTop ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" tabIndex={showTop ? 0 : -1}>
        <Icon name="arrowUp" size={18} />
      </button>
      <nav className="bottomnav" aria-label="Pages">{links('bn-link')}</nav>
      <CommandPalette open={palette} onClose={() => setPalette(false)} actions={actions} />
    </div>
  );
}
