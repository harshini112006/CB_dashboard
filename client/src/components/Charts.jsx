import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { num, money, moneyCompact, compact, dateLabel, hourLabel, pct } from '../format.js';

// Categorical palette: distinct in light and dark, colour-blind friendly ordering.
export const COLORS = ['#e4572e', '#2e86ab', '#76b041', '#f2a900', '#8e6c8a', '#17bebb', '#a8554e'];
const AXIS = { fontSize: 12, fill: 'var(--muted)' };

function Card({ title, right, children, className = '' }) {
  return (
    <div className={`card chart ${className}`}>
      <div className="chart-head"><h2>{title}</h2>{right}</div>
      {children}
    </div>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>
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
      {p.revenue != null && <div>Revenue: {money(p.revenue)}</div>}
      {p.orders != null && <div>Orders: {num(p.orders)}</div>}
      {p.units != null && <div>Units: {num(p.units)}</div>}
    </div>
  );
}

export function TrendChart({ data, granularity, onGranularity }) {
  const [metric, setMetric] = useState('revenue');
  const g = data.granularity;
  const rows = data.trend.map((r) => ({ ...r, label: dateLabel(r.date, g) }));
  const fmt = metric === 'revenue' ? moneyCompact : compact;
  return (
    <Card
      title={`${metric === 'revenue' ? 'Revenue' : 'Orders'} trend (${g}ly)`}
      right={
        <div className="toggles">
          <Toggle value={metric} onChange={setMetric} options={[['revenue', 'Revenue'], ['orders', 'Orders']]} />
          <Toggle value={granularity} onChange={onGranularity} options={[['', 'Auto'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']]} />
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} width={64} />
          <Tooltip content={<Tip labelFmt={(l) => `${g === 'week' ? 'Week of ' : ''}${l}`} />} />
          <Area type="monotone" dataKey={metric} stroke={COLORS[0]} strokeWidth={2.5} fill="url(#trendFill)" dot={rows.length < 40} isAnimationActive={rows.length < 120} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Horizontal bar; clicking a bar toggles it as a dashboard filter (cross-filtering).
export function BarBreakdown({ title, rows, selected, onPick }) {
  const h = Math.max(220, rows.length * 38 + 20);
  return (
    <Card title={title} right={<span className="hint">click a bar to filter</span>}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={moneyCompact} />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={96} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => onPick(d.name)} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.name} fill={COLORS[0]} fillOpacity={selected.length && !selected.includes(r.name) ? 0.3 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function DonutBreakdown({ title, rows, selected, onPick }) {
  const total = rows.reduce((s, r) => s + r.orders, 0);
  return (
    <Card title={title} right={<span className="hint">share of orders</span>}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={rows} dataKey="orders" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} cursor="pointer"
            onClick={(d) => onPick(d.name)} isAnimationActive={false} stroke="var(--card)">
            {rows.map((r, i) => (
              <Cell key={r.name} fill={COLORS[i % COLORS.length]} fillOpacity={selected.length && !selected.includes(r.name) ? 0.3 : 1} />
            ))}
          </Pie>
          <Tooltip content={<Tip />} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }}
            formatter={(v, e) => <span style={{ color: 'var(--text)' }}>{v} · {pct(e.payload.orders, total)}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function TopItems({ byRevenue, byUnits }) {
  const [by, setBy] = useState('revenue');
  const rows = by === 'revenue' ? byRevenue : byUnits;
  return (
    <Card title="Top 10 items" right={<Toggle value={by} onChange={setBy} options={[['revenue', 'By revenue'], ['units', 'By units']]} />}>
      <ResponsiveContainer width="100%" height={Math.max(260, rows.length * 34 + 20)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={by === 'revenue' ? moneyCompact : compact} />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={150} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey={by} fill={COLORS[1]} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function HourChart({ rows }) {
  const data = rows.map((r) => ({ ...r, name: hourLabel(r.hour) }));
  const max = Math.max(...rows.map((r) => r.orders));
  return (
    <Card title="Orders by hour of day">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey="orders" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((r) => <Cell key={r.hour} fill={r.orders === max ? COLORS[0] : COLORS[3]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function WeekdayChart({ rows }) {
  return (
    <Card title="Revenue by weekday">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={moneyCompact} width={64} />
          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<Tip />} />
          <Bar dataKey="revenue" fill={COLORS[2]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
