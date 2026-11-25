import Icon from './Icons.jsx';

// Layout-shaped placeholders: the page keeps its structure while data loads, so nothing jumps.
export function Skeleton({ kind = 'dashboard' }) {
  return (
    <div className="skeleton" aria-hidden>
      {kind === 'dashboard' && <div className="skel-kpis"><div className="sk kpi-sk" /><div className="sk kpi-sk" /><div className="sk kpi-sk" /><div className="sk kpi-sk" /></div>}
      {kind === 'cards' && <div className="skel-cards"><div className="sk" style={{ height: 150 }} /><div className="sk" style={{ height: 150 }} /><div className="sk" style={{ height: 150 }} /></div>}
      <div className="sk" style={{ height: kind === 'table' ? 420 : 300 }} />
      {kind !== 'table' && <div className="grid g2"><div className="sk" style={{ height: 240 }} /><div className="sk" style={{ height: 240 }} /></div>}
    </div>
  );
}

// Shared loading / error / empty handling for every page.
export function PageState({ data, loading, error, empty, onReset, kind, children }) {
  return (
    <main className={loading && data ? 'loading' : ''} aria-busy={loading}>
      {error && <div className="error" role="alert">Couldn’t load data: {error}</div>}
      {!data && !error ? (
        <Skeleton kind={kind} />
      ) : empty ? (
        <div className="empty card">
          <span className="empty-ico"><Icon name="inbox" size={30} /></span>
          <h2>No orders match these filters</h2>
          <p>Try widening the date range or removing a filter.</p>
          <button className="btn primary" onClick={onReset}>Clear all filters</button>
        </div>
      ) : children}
    </main>
  );
}
