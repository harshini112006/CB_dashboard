import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from 'recharts';
import { fetchMenu } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import { PageState } from '../components/PageState.jsx';
import { Reveal, spot } from '../components/Motion.jsx';
import { COLORS } from '../components/Charts.jsx';
import { num, money, moneyCompact, compact } from '../format.js';

const AXIS = { fontSize: 12, fill: 'var(--muted)' };
const COLS = [
  ['name', 'Item'], ['group', 'Category'], ['avgPrice', 'Avg price', true], ['units', 'Units', true],
  ['orders', 'Orders', true], ['revenue', 'Revenue', true], ['revenueShare', 'Share', true],
];

export default function Menu() {
  const { filters, reset } = useFilters();
  const { data, loading, error } = useApi((s) => fetchMenu(filters, s), [filters]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'revenue', dir: -1 });

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.items
      .filter((i) => !needle || i.name.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle))
      .sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
      });
  }, [data, q, sort]);

  const byGroup = useMemo(() => {
    const g = {};
    (data?.items ?? []).forEach((i) => { (g[i.group] ??= []).push({ ...i, x: i.avgPrice, y: i.units }); });
    return Object.entries(g);
  }, [data]);

  const maxShare = Math.max(0.0001, ...(data?.items ?? []).map((i) => i.revenueShare));
  const top = data?.items[0];
  const pairRows = (data?.pairs ?? []).map((p) => ({ name: `${p.a} + ${p.b}`, orders: p.orders })).reverse();

  return (
    <PageState kind="dashboard" data={data} loading={loading} error={error} empty={data?.items.length === 0} onReset={reset}>
      {data && (
        <>
          <section className="kpis k4">
            <Stat i={0} label="Menu items sold" value={num(data.totals.items)} sub="distinct items" />
            <Stat i={1} label="Units sold" value={num(data.totals.units)} sub={money(data.totals.revenue) + ' revenue'} />
            <Stat i={2} label="Top item" value={top?.name} small sub={top ? `${money(top.revenue)} · ${(top.revenueShare * 100).toFixed(1)}% of revenue` : ''} />
            <Stat i={3} label="Most ordered" value={[...data.items].sort((a, b) => b.orders - a.orders)[0]?.name} small
              sub={`in ${num([...data.items].sort((a, b) => b.orders - a.orders)[0]?.orders)} orders`} />
          </section>

          <Reveal><section className="grid g2">
            <div className="card chart">
              <div className="chart-head"><h2>Price vs volume</h2><span className="hint">each dot is a menu item</span></div>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--grid)" />
                  <XAxis type="number" dataKey="x" name="Avg price" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + v} />
                  <YAxis type="number" dataKey="y" name="Units" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
                  <ZAxis type="number" dataKey="revenue" range={[50, 400]} name="Revenue" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {byGroup.map(([g, pts], i) => <Scatter key={g} name={g} data={pts} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} isAnimationActive animationDuration={800} animationEasing="ease-out" />)}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart">
              <div className="chart-head"><h2>Frequently bought together</h2><span className="hint">orders containing both items</span></div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={pairRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--grid)" horizontal={false} />
                  <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={260} />
                  <Tooltip cursor={{ fill: 'var(--hover)' }} formatter={(v) => [num(v) + ' orders', 'Together']} />
                  <Bar dataKey="orders" fill={COLORS[1]} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section></Reveal>

          <Reveal><section className="card table-card">
            <div className="chart-head">
              <h2>Item performance <small>{rows.length} of {data.items.length} items</small></h2>
              <input className="search" type="search" placeholder="Search item or category…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {COLS.map(([key, label, right]) => (
                      <th key={key} className={right ? 'r' : ''} aria-sort={sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                        <button className="th-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : (key === 'name' || key === 'group' ? 1 : -1) }))}>
                          {label}{sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i, n) => (
                    <tr key={i.name} style={{ '--r': Math.min(n, 14) }}>
                      <td><b>{i.name}</b></td><td><span className="pill">{i.group}</span></td>
                      <td className="r">{money(i.avgPrice)}</td><td className="r">{num(i.units)}</td>
                      <td className="r">{num(i.orders)}</td><td className="r">{money(i.revenue)}</td>
                      <td className="r">{(i.revenueShare * 100).toFixed(1)}%</td>
                      <td className="bar-cell"><span className="bar" style={{ width: `${(i.revenueShare / maxShare) * 100}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section></Reveal>
        </>
      )}
    </PageState>
  );
}

function Stat({ label, value, sub, small, i = 0 }) {
  return (
    <div className="card kpi spot" style={{ '--i': i }} {...spot}>
      <span className="kpi-label">{label}</span>
      <strong className={`kpi-value ${small ? 'sm' : ''}`}>{value}</strong>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function ScatterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <b>{p.name}</b><div>{p.group}</div>
      <div>Avg price: {money(p.avgPrice)}</div><div>Units: {num(p.units)}</div><div>Revenue: {moneyCompact(p.revenue)}</div>
    </div>
  );
}
