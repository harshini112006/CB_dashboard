import { num, money, moneyCompact } from '../format.js';

export default function Kpis({ k }) {
  const cards = [
    ['Total revenue', moneyCompact(k.revenue), money(k.revenue)],
    ['Orders', num(k.orders), 'distinct bills'],
    ['Avg order value', money(k.aov), 'revenue ÷ orders'],
    ['Units sold', num(k.units), `${k.itemsPerOrder.toFixed(1)} per order`],
    ['Line items', num(k.records), 'matching records'],
  ];
  return (
    <section className="kpis" aria-label="Key metrics">
      {cards.map(([label, value, sub]) => (
        <div className="card kpi" key={label}>
          <span className="kpi-label">{label}</span>
          <strong className="kpi-value">{value}</strong>
          <span className="kpi-sub">{sub}</span>
        </div>
      ))}
    </section>
  );
}
