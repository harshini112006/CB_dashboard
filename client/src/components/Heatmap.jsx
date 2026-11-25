import { hourLabel } from '../format.js';

// rows: [{ name, values: number[24] }]. Colour intensity is relative to the busiest cell.
export default function Heatmap({ rows, unit = 'orders' }) {
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => rows.some((r) => r.values[h] > 0));
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className="heat" role="table" aria-label={`${unit} by outlet and hour`} style={{ '--cols': hours.length }}>
      <div className="heat-row" role="row">
        <span className="heat-label" />
        {hours.map((h) => <span key={h} className="heat-h" role="columnheader">{hourLabel(h)}</span>)}
      </div>
      {rows.map((r, ri) => (
        <div className="heat-row" role="row" key={r.name}>
          <span className="heat-label" role="rowheader">{r.name}</span>
          {hours.map((h, hi) => {
            const v = r.values[h];
            return (
              <span key={h} role="cell" className="heat-cell" title={`${r.name} · ${String(h).padStart(2, '0')}:00 · ${v.toLocaleString('en-IN')} ${unit}`}
                style={{ '--d': ri + hi, background: v ? `color-mix(in srgb, var(--s1) ${Math.round(10 + (v / max) * 90)}%, var(--card))` : 'var(--hover)' }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
