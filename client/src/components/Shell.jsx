import { NavLink, useLocation } from 'react-router-dom';
import { useFilters } from '../filters-context.jsx';
import { exportUrl } from '../api.js';
import Filters from './Filters.jsx';

const NAV = [
  ['/', 'Overview', '📊'],
  ['/menu', 'Menu', '🍔'],
  ['/outlets', 'Outlets', '📍'],
  ['/orders', 'Orders', '🧾'],
];

export default function Shell({ session, dark, toggleTheme, onSignOut, children }) {
  const { filters, setFilters, active, reset, meta } = useFilters();
  const { search } = useLocation();
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

      {/* Links carry the query string, so the active filters follow you from page to page. */}
      <nav className="tabs" aria-label="Pages">
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={{ pathname: to, search }} end={to === '/'} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
            <span aria-hidden>{icon}</span> {label}
          </NavLink>
        ))}
      </nav>

      <Filters meta={meta} filters={filters} setFilters={setFilters} active={active} onReset={reset} />

      {children}

      <footer>Built for the California Burrito technical assessment · React · Express · MongoDB · Recharts</footer>
    </div>
  );
}
