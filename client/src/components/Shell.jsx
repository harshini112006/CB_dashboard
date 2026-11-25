import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useFilters } from '../filters-context.jsx';
import { exportUrl } from '../api.js';
import { num, fmtDate } from '../format.js';
import FilterBar from './FilterBar.jsx';
import Icon from './Icons.jsx';
import { TopProgress } from './Motion.jsx';

const NAV = [
  ['/', 'Overview', 'overview', 'Sales performance at a glance'],
  ['/menu', 'Menu', 'menu', 'What sells, what sells together'],
  ['/outlets', 'Outlets', 'pin', 'Compare locations side by side'],
  ['/orders', 'Orders', 'receipt', 'Every order, down to the receipt'],
];

export default function Shell({ session, dark, toggleTheme, onSignOut, children }) {
  const { filters, setFilters, active, reset, meta } = useFilters();
  const { search, pathname } = useLocation();
  const page = NAV.find(([to]) => to === pathname) ?? NAV[0];

  useEffect(() => { document.title = `${page[1]} · Burger Town Analytics`; }, [page]);

  const links = (cls) => NAV.map(([to, label, icon]) => (
    <NavLink key={to} to={{ pathname: to, search }} end={to === '/'} className={({ isActive }) => `${cls} ${isActive ? 'on' : ''}`}>
      <Icon name={icon} size={19} /><span>{label}</span>
    </NavLink>
  ));

  return (
    <div className="layout">
      <TopProgress />
      {/* Desktop sidebar. Links carry the query string, so active filters follow you between pages. */}
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>🍔</span>
          <div><strong>Burger Town</strong><small>Analytics</small></div>
        </div>
        <nav className="side-nav" aria-label="Pages">{links('side-link')}</nav>
        <div className="side-foot">
          {meta && (
            <div className="dataset">
              <span className="dot" aria-hidden />
              <div><b>{num(meta.totalRecords)}</b> line items<br /><small>{fmtDate(meta.minDate)} – {fmtDate(meta.maxDate)}</small></div>
            </div>
          )}
          <button className="side-btn" onClick={toggleTheme}><Icon name={dark ? 'sun' : 'moon'} size={17} /><span>{dark ? 'Light mode' : 'Dark mode'}</span></button>
          {session.authEnabled && <button className="side-btn" onClick={onSignOut} title={`Signed in as ${session.user}`}><Icon name="logout" size={17} /><span>Sign out</span></button>}
        </div>
      </aside>

      <div className="content">
        <header className="mobile-top">
          <div className="brand"><span className="logo" aria-hidden>🍔</span><strong>Burger Town</strong></div>
          <div className="actions">
            <button className="btn icon" onClick={toggleTheme} aria-label="Toggle dark mode"><Icon name={dark ? 'sun' : 'moon'} size={17} /></button>
            {session.authEnabled && <button className="btn icon" onClick={onSignOut} aria-label="Sign out"><Icon name="logout" size={17} /></button>}
          </div>
        </header>

        <header className="page-head">
          <div>
            <h1>{page[1]}</h1>
            <p>{page[3]}</p>
          </div>
          <a className="btn" href={exportUrl(filters)} download title="Download the rows matching the current filters"><Icon name="download" size={16} /> Export CSV</a>
        </header>

        <FilterBar meta={meta} filters={filters} setFilters={setFilters} active={active} onReset={reset} />

        <div key={pathname} className="route">{children}</div>

        <footer>Built for the California Burrito technical assessment · React · Express · MongoDB · Recharts</footer>
      </div>

      <nav className="bottomnav" aria-label="Pages">{links('bn-link')}</nav>
    </div>
  );
}
