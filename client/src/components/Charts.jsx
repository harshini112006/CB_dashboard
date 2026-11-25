import { useLayoutEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Label, LabelList, ReferenceLine,
} from 'recharts';
import { num, money, moneyCompact, compact, dateLabel, hourLabel, hourLong, pct, fmtDate } from '../format.js';

// Categorical palette: distinct in light and dark, ordered for colour-blind friendliness.
export const COLORS = ['#f2542d', '#2e86ab', '#76b041', '#f2a900', '#8e6c8a', '#17bebb', '#a8554e'];
const AXIS = { fontSize: 12, fill: 'var(--muted)' };
const dim = (selected, name) => (selected.length && !selected.includes(name) ? 0.28 : 1);

export function ChartCard({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`card chart ${className}`}>
      <div className="chart-head">
        <div><h2>{title}</h2>{subtitle && <p className="sub">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

// Segmented control with a pill that slides to the selected option.
export function Toggle({ options, value, onChange, label }) {
  const ref = useRef(null);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector('button.on');
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    if (ro && ref.current) ro.observe(ref.current);
    return () => ro?.disconnect();
  }, [value, options.length]);
  return (
    <div className="seg" role="group" aria-label={label} ref={ref}>
      {pill && <span className="seg-pill" aria-hidden style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />}
      {options.map(([v, text]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, labelFmt }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <b>{labelFmt ? labelFmt(label ?? p.name) : label ?? p.name}</b>
      {p.revenue != null && <div><i style={{ background: COLORS[0] }} />Revenue <span>{money(p.revenue)}</span></div>}
      {p.orders != null && <div><i style={{ background: COLORS[1] }} />Orders <span>{num(p.orders)}</span></div>}
      {p.units != null && <div><i style={{ background: COLORS[3] }} />Units <span>{num(p.units)}</span></div>}
    </div>
  );
}

export function TrendChart({ data, granularity, onGranularity }) {
  const [metric, setMetric] = useState('revenue');
  const g = data.granularity;
  const rows = data.trend.map((r) => ({ ...r, label: dateLabel(r.date, g) }));
  const fmt = metric === 'revenue' ? moneyCompact : compact;
  const total = rows.reduce((s, r) => s + r[metric], 0);
  const avg = rows.length ? total / rows.length : 0;
  const peak = rows.reduce((b, r) => (r[metric] > (b?.[metric] ?? -1) ? r : b), null);
  return (
    <ChartCard
      title={`${metric === 'revenue' ? 'Revenue' : 'Orders'} trend`}
      subtitle={`Per ${g}${g === 'month' ? ' · first and last months are partial' : ''}`}
      right={
        <div className="toggles">
          <Toggle label="Metric" value={metric} onChange={setMetric} options={[['revenue', 'Revenue'], ['orders', 'Orders']]} />
          <Toggle label="Granularity" value={granularity} onChange={onGranularity} options={[['', 'Auto'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']]} />
        </div>
      }
    >
      <div className="stat-row">
        <div><span>Total</span><b>{(metric === 'revenue' ? moneyCompact : num)(total)}</b></div>
        <div><span>Avg / {g}</span><b>{fmt(avg)}</b></div>
        {peak && <div><span>Best {g}</span><b>{fmt(peak[metric])}</b><small>{g === 'month' ? peak.label : fmtDate(peak.date)}</small></div>}
      </div>
      <ResponsiveContainer width="100%" height={290}>
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} width={64} />
          <Tooltip content={<Tip labelFmt={(l) => `${g === 'week' ? 'Week of ' : ''}${l}`} />} />
          <ReferenceLine y={avg} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Area type="monotone" dataKey={metric} stroke={COLORS[0]} strokeWidth={2.5} fill="url(#trendFill)"
            dot={rows.length < 40} activeDot={{ r: 5 }} isAnimationActive={rows.length < 120} animationDuration={1000} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Horizontal bars with value labels; clicking a bar toggles it as a dashboard filter (cross-filtering).
export function BarBreakdown({ title, subtitle = 'Click a bar to filter', rows, selected, onPick, color = COLORS[0] }) {
  const h = Math.max(220, rows.length * 40 + 20);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={96} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => onPick(d.name)} isAnimationActive animationDuration={800} animationEasing="ease-out">
            {rows.map((r) => <Cell key={r.name} fill={color} fillOpacity={dim(selected, r.name)} />)}
            <LabelList dataKey="revenue" position="right" formatter={moneyCompact} style={{ fontSize: 12, fill: 'var(--text)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DonutBreakdown({ title, rows, selected, onPick }) {
  const total = rows.reduce((s, r) => s + r.orders, 0);
  return (
    <ChartCard title={title} subtitle="Share of orders · click to filter">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={rows} dataKey="orders" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} cursor="pointer"
            onClick={(d) => onPick(d.name)} isAnimationActive animationDuration={800} animationEasing="ease-out" stroke="var(--card)" strokeWidth={2}>
            {rows.map((r, i) => <Cell key={r.name} fill={COLORS[i % COLORS.length]} fillOpacity={dim(selected, r.name)} />)}
            <Label position="center" content={({ viewBox }) => (
              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                <tspan x={viewBox.cx} dy="-0.2em" fontSize="20" fontWeight="700" fill="var(--text)">{compact(total)}</tspan>
                <tspan x={viewBox.cx} dy="1.5em" fontSize="11" fill="var(--muted)">orders</tspan>
              </text>
            )} />
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="legend">
        {rows.map((r, i) => (
          <li key={r.name}>
            <button type="button" onClick={() => onPick(r.name)} aria-pressed={selected.includes(r.name)} style={{ opacity: dim(selected, r.name) }}>
              <i style={{ background: COLORS[i % COLORS.length] }} /><span>{r.name}</span><b>{pct(r.orders, total)}</b>
            </button>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

export function TopItems({ byRevenue, byUnits }) {
  const [by, setBy] = useState('revenue');
  const rows = by === 'revenue' ? byRevenue : byUnits;
  return (
    <ChartCard title="Top 10 items" subtitle="Best sellers in the selected period"
      right={<Toggle label="Rank by" value={by} onChange={setBy} options={[['revenue', 'Revenue'], ['units', 'Units']]} />}>
      <ResponsiveContainer width="100%" height={Math.max(260, rows.length * 38 + 20)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }} barCategoryGap={7}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={160} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey={by} fill={COLORS[1]} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
            <LabelList dataKey={by} position="right" formatter={by === 'revenue' ? moneyCompact : compact} style={{ fontSize: 12, fill: 'var(--text)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HourChart({ rows }) {
  const open = rows.filter((r) => r.orders > 0);
  const first = open[0]?.hour ?? 0;
  const last = open[open.length - 1]?.hour ?? 23;
  const data = rows.filter((r) => r.hour >= first && r.hour <= last).map((r) => ({ ...r, name: hourLabel(r.hour) }));
  const peak = data.reduce((b, r) => (r.orders > (b?.orders ?? -1) ? r : b), null);
  return (
    <ChartCard title="Orders by hour of day" subtitle={peak ? `Peak at ${hourLong(peak.hour)} · ${num(peak.orders)} orders` : ''}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip labelFmt={(l) => l} />} />
          <Bar dataKey="orders" radius={[5, 5, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
            {data.map((r) => <Cell key={r.hour} fill={r.hour === peak?.hour ? COLORS[0] : COLORS[3]} fillOpacity={r.hour === peak?.hour ? 1 : 0.8} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function WeekdayChart({ rows }) {
  const avg = rows.reduce((s, r) => s + r.revenue, 0) / (rows.length || 1);
  return (
    <ChartCard title="Revenue by weekday" subtitle="Dashed line = daily average">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={moneyCompact} width={64} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <ReferenceLine y={avg} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.7} />
          <Bar dataKey="revenue" fill={COLORS[2]} radius={[5, 5, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
