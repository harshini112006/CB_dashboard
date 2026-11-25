import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import Icon from './Icons.jsx';
import { CountUp } from './Motion.jsx';
import { num, money, moneyCompact, fmtDate, hourLong, dateLabel } from '../format.js';

// Story-style banner at the top of the Overview: the headline numbers as a sentence, plus a live trend line.
export default function Hero({ data, filters, meta }) {
  const k = data.kpis;
  const ranged = filters.from || filters.to;
  const range = `${fmtDate(filters.from || meta?.minDate)} – ${fmtDate(filters.to || meta?.maxDate)}`;
  const peak = data.hours.reduce((b, h) => (h.orders > (b?.orders ?? -1) ? h : b), null);
  const topOutlet = data.outlets[0];
  const topItem = data.topItemsByRevenue[0];
  const delta = data.previous ? ((k.revenue - data.previous.revenue) / data.previous.revenue) * 100 : null;
  const rows = data.trend.map((t) => ({ ...t, label: dateLabel(t.date, data.granularity) }));

  return (
    <section className="hero" aria-label="Summary">
      <div className="hero-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /><span className="orb o3" /><span className="hero-grid" /></div>
      <div className="hero-main">
        <span className="eyebrow"><Icon name="calendar" size={14} /> {range}{ranged ? '' : ' · all time'}</span>
        <h2 className="hero-title">
          <span className="hl"><CountUp value={k.revenue} format={moneyCompact} ms={1100} /></span> in revenue from{' '}
          <span className="hl"><CountUp value={k.orders} format={num} ms={1100} /></span> orders
        </h2>
        <p className="hero-sub">
          Average order {money(k.aov)} · {k.itemsPerOrder.toFixed(1)} items per order
          {delta != null && (
            <span className={`hero-delta ${delta >= 0 ? 'up' : 'down'}`}>
              <Icon name={delta >= 0 ? 'up' : 'down'} size={13} /> {Math.abs(delta).toFixed(1)}% revenue vs previous period
            </span>
          )}
        </p>
        <div className="hero-tags">
          {topOutlet && <span style={{ '--i': 0 }}><Icon name="pin" size={14} /> Top outlet <b>{topOutlet.name}</b></span>}
          {peak && <span style={{ '--i': 1 }}><Icon name="clock" size={14} /> Busiest hour <b>{hourLong(peak.hour)}</b></span>}
          {topItem && <span style={{ '--i': 2 }}><Icon name="trophy" size={14} /> Best seller <b>{topItem.name}</b></span>}
        </div>
      </div>
      <div className="hero-chart" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 6, left: 6, bottom: 4 }}>
            <defs>
              <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity={0.35} /><stop offset="100%" stopColor="#fff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip cursor={{ stroke: 'rgba(255,255,255,.4)' }} content={({ active, payload }) => (active && payload?.length
              ? <div className="tip"><b>{payload[0].payload.label}</b><div>Revenue <span>{money(payload[0].payload.revenue)}</span></div></div> : null)} />
            <Area type="monotone" dataKey="revenue" stroke="#fff" strokeWidth={2.4} fill="url(#heroFill)" dot={false}
              isAnimationActive animationDuration={1400} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
