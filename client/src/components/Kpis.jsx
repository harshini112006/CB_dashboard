import { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import Icon from './Icons.jsx';
import { spot, useCountUp } from './Motion.jsx';
import { num, money, moneyCompact, fmtDate } from '../format.js';

export function Spark({ data, color, height = 40 }) {
  const id = useId().replace(/:/g, '');
  if (!data || data.length < 2) return <div className="spark" style={{ height }} />;
  const rows = data.map((y, i) => ({ i, y }));
  return (
    <div className="spark" style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Scale to the series' own range (standard for sparklines) so the shape is visible, not a flat line near the top. */}
          <YAxis hide domain={[(min) => min - (Math.abs(min) * 0.04 || 1), 'dataMax']} />
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} dot={false} baseValue="dataMin"
            isAnimationActive animationDuration={1100} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Delta({ cur, prev, title }) {
  if (prev == null || !prev) return null;
  const ch = ((cur - prev) / prev) * 100;
  const up = ch >= 0;
  return (
    <span className={`delta ${up ? 'up' : 'down'}`} title={title}>
      <Icon name={up ? 'up' : 'down'} size={12} />{Math.abs(ch).toFixed(1)}%
    </span>
  );
}

function Card({ c, previous, i }) {
  const shown = useCountUp(c.value);
  return (
    <div className="card kpi spot" style={{ '--i': i }} {...spot}>
      <div className="kpi-top">
        <span className="kpi-ico" style={{ '--tone': c.color }}><Icon name={c.icon} size={17} /></span>
        <span className="kpi-label">{c.label}</span>
        {previous && <Delta cur={c.value} prev={c.prev} title={`vs ${fmtDate(previous.from)} – ${fmtDate(previous.to)}`} />}
      </div>
      <strong className="kpi-value" title={c.full}>{c.fmt(shown)}</strong>
      <div className="kpi-bottom">
        <span className="kpi-sub">{c.sub}</span>
        <Spark data={c.series} color={c.color} />
      </div>
    </div>
  );
}

export default function Kpis({ data }) {
  const { kpis: k, trend, previous } = data;
  const cards = [
    { label: 'Total revenue', icon: 'dollar', color: '#f2542d', value: k.revenue, fmt: moneyCompact, full: money(k.revenue), prev: previous?.revenue, series: trend.map((t) => t.revenue), sub: money(k.revenue) },
    { label: 'Orders', icon: 'bag', color: '#2e86ab', value: k.orders, fmt: num, prev: previous?.orders, series: trend.map((t) => t.orders), sub: `${num(k.records)} line items` },
    { label: 'Avg order value', icon: 'tag', color: '#76b041', value: k.aov, fmt: money, prev: previous?.aov, series: trend.map((t) => (t.orders ? t.revenue / t.orders : 0)), sub: 'revenue ÷ orders' },
    { label: 'Units sold', icon: 'box', color: '#f2a900', value: k.units, fmt: num, prev: previous?.units, series: trend.map((t) => t.units), sub: `${k.itemsPerOrder.toFixed(1)} items per order` },
  ];
  return (
    <section className="kpis" aria-label="Key metrics">
      {cards.map((c, i) => <Card key={c.label} c={c} previous={previous} i={i} />)}
      {previous && <p className="kpi-note">Change vs previous period ({fmtDate(previous.from)} – {fmtDate(previous.to)})</p>}
    </section>
  );
}
