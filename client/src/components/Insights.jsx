export default function Insights({ items }) {
  if (!items?.length) return null;
  return (
    <section className="card insights" aria-label="Automated insights">
      <h2>✨ Auto-generated insights <small>for the current filters</small></h2>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );
}
