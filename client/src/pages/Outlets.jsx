import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts';
import { fetchOutlets } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import { PageState } from '../components/PageState.jsx';
import Heatmap from '../components/Heatmap.jsx';
import { COLORS } from '../components/Charts.jsx';
import { num, money, moneyCompact, compact, dateLabel } from '../format.js';

const AXIS = { fontSize: 12, fill: 'var(--muted)' };
const ph = (h) => `${String(h).padStart(2, '0')}:00`;

export default function Outlets() {
  const { filters, toggle, reset } = useFilters();
  const { data, loading, error } = useApi((s) => fetchOutlets(filters, s), [filters]);

  const typeRows = useMemo(() => data?.outlets.map((o) => ({ name: o.name, ...o.typeOrders })) ?? [], [data]);
  const chanRows = useMemo(() => data?.outlets.map((o) => {
    const t = Object.values(o.chanOrders).reduce((a, b) => a + b, 0) || 1;
    return { name: o.name, ...Object.fromEntries(Object.entries(o.chanOrders).map(([k, v]) => [k, +((v / t) * 100).toFixed(1)])) };
  }) ?? [], [data]);
  const colorOf = (name) => COLORS[data.outletNames.indexOf(name) % COLORS.length];

  return (
    <PageState data={data} loading={loading} error={error} empty={data?.outlets.length === 0} onReset={reset}>
      {data && (
        <>
          <section className="outlet-cards" aria-label="Outlet scorecards">
            {data.outlets.map((o, i) => {
              const on = filters.outlets.includes(o.name);
              return (
                <button key={o.name} type="button" className={`card outlet ${on ? 'sel' : ''}`} aria-pressed={on} onClick={() => toggle('outlets', o.name)}
                  title="Click to filter the whole dashboard to this outlet">
                  <div className="outlet-head">
                    <span className="rank" style={{ background: colorOf(o.name) }}>{i + 1}</span>
                    <b>{o.name}</b>
                    <span className="hint">{(o.revenueShare * 100).toFixed(1)}% of revenue</span>
                  </div>
                  <strong className="outlet-rev">{moneyCompact(o.revenue)}</strong>
                  <dl>
                    <div><dt>Orders</dt><dd>{num(o.orders)}</dd></div>
                    <div><dt>Avg order</dt><dd>{money(o.aov)}</dd></div>
                    <div><dt>Items / order</dt><dd>{o.unitsPerOrder.toFixed(1)}</dd></div>
                    <div><dt>Delivery</dt><dd>{(o.deliveryShare * 100).toFixed(0)}%</dd></div>
                    <div><dt>Zomato+Swiggy</dt><dd>{(o.aggregatorShare * 100).toFixed(0)}%</dd></div>
                    <div><dt>Peak hour</dt><dd>{ph(o.peakHour)}</dd></div>
                  </dl>
                </button>
              );
            })}
          </section>

          <section className="grid g2">
            <div className="card chart">
              <div className="chart-head"><h2>Orders by type</h2><span className="hint">per outlet</span></div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--grid)" vertical={false} />
                  <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
                  <Tooltip cursor={{ fill: 'var(--hover)' }} formatter={(v, n) => [num(v), n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {data.orderTypes.map((t, i) => <Bar key={t} dataKey={t} stackId="a" fill={COLORS[i]} isAnimationActive={false} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card chart">
              <div className="chart-head"><h2>Payment channel mix</h2><span className="hint">% of orders</span></div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chanRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--grid)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => v + '%'} />
                  <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={90} />
                  <Tooltip cursor={{ fill: 'var(--hover)' }} formatter={(v, n) => [v + '%', n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {data.channels.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i]} isAnimationActive={false} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="card chart">
            <div className="chart-head"><h2>Monthly revenue by outlet</h2><span className="hint">first and last months are partial</span></div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.monthly.map((m) => ({ ...m, label: dateLabel(m.month + '-01', 'month') }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={moneyCompact} width={64} />
                <Tooltip formatter={(v, n) => [money(v), n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {data.outletNames.map((n) => <Line key={n} type="monotone" dataKey={n} stroke={colorOf(n)} strokeWidth={2} dot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart">
            <div className="chart-head"><h2>When each outlet is busy</h2><span className="hint">orders by hour · darker = busier</span></div>
            <Heatmap rows={data.outlets.map((o) => ({ name: o.name, values: o.hours }))} />
          </div>
        </>
      )}
    </PageState>
  );
}
