// Shared loading / error / empty handling for every page.
export function PageState({ data, loading, error, empty, onReset, children }) {
  return (
    <main className={loading ? 'loading' : ''} aria-busy={loading}>
      {error && <div className="error" role="alert">Couldn’t load data: {error}</div>}
      {!data && !error ? (
        <div className="skeleton-grid"><div className="sk" /><div className="sk" /><div className="sk" /></div>
      ) : empty ? (
        <div className="empty card">No orders match these filters. <button className="link" onClick={onReset}>Clear filters</button></div>
      ) : children}
    </main>
  );
}
