import { useMemo, useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { fetchMenu } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import { PageState } from '../components/PageState.jsx';
import { Reveal, spot, CountUp } from '../components/Motion.jsx';
import { COLORS, ChartCard, Toggle } from '../components/Charts.jsx';
import Icon from '../components/Icons.jsx';
import { num, money, moneyCompact, compact } from '../format.js';

const AXIS = { fontSize: 12, fill: 'var(--muted)' };
const MEDALS = ['🥇', '🥈', '🥉'];
const COLS = [
  ['name', 'Item'], ['group', 'Category'], ['avgPrice', 'Avg price', true], ['units', 'Units', true],
  ['orders', 'Orders', true], ['revenue', 'Revenue', true], ['revenueShare', 'Share', true],
];

function Stat({ i, label, icon, color, value, format, sub }) {
  return (
    <div className="card kpi spot" style={{ '--i': i }} {...spot}>
      <div className="kpi-top">
        <span className="kpi-ico" style={{ '--tone': color }}><Icon name={icon} size={17} /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <strong className="kpi-value"><CountUp value={value} format={format} /></strong>
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
      <div>Avg price <span>{money(p.avgPrice)}</span></div><div>Units <span>{num(p.units)}</span></div><div>Revenue <span>{moneyCompact(p.revenue)}</span></div>
    </div>
  );
}

export default function Menu() {
  const { filters, toggle, reset } = useFilters();
  const { data, loading, error } = useApi((s) => fetchMenu(filters, s), [filters]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [hl, setHl] = useState('all');
  const [sort, setSort] = useState({ key: 'revenue', dir: -1 });

  const groups = useMemo(() => [...new Set((data?.items ?? []).map((i) => i.group))].sort(), [data]);
  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.items
      .filter((i) => (cat === 'all' || i.group === cat) && (!needle || i.name.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const x = a[sort.key]; const y = b[sort.key];
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
      });
  }, [data, q, cat, sort]);

  const byGroup = useMemo(() => {
    const g = {};
    (data?.items ?? []).forEach((i) => { (g[i.group] ??= []).push({ ...i, x: i.avgPrice, y: i.units }); });
    return Object.entries(g);
  }, [data]);

  const maxShare = Math.max(0.0001, ...(data?.items ?? []).map((i) => i.revenueShare));
  const maxPair = Math.max(1, ...(data?.pairs ?? []).map((p) => p.orders));
  const t = data?.totals;

  return (
    <PageState kind="dashboard" data={data} loading={loading} error={error} empty={data?.items.length === 0} onReset={reset}>
      {data && (
        <>
          <section className="kpis" aria-label="Menu summary">
            <Stat i={0} label="Items on the menu" icon="menu" color="var(--s2)" value={t.items} format={num} sub="distinct items sold" />
            <Stat i={1} label="Units sold" icon="box" color="var(--s3)" value={t.units} format={num} sub="across all orders" />
            <Stat i={2} label="Menu revenue" icon="dollar" color="var(--s1)" value={t.revenue} format={moneyCompact} sub={money(t.revenue)} />
            <Stat i={3} label="Avg price per unit" icon="tag" color="var(--s4)" value={t.units ? t.revenue / t.units : 0} format={money} sub="revenue ÷ units" />
          </section>

          <section className="podium" aria-label="Top sellers">
            {data.items.slice(0, 3).map((it, i) => (
              <button type="button" key={it.name} className={`card pod p${i + 1} spot ${filters.items.includes(it.name) ? 'sel' : ''}`} style={{ '--i': i }} {...spot}
                onClick={() => toggle('items', it.name)} title="Click to filter the dashboard to this item">
                <span className="medal" aria-hidden>{MEDALS[i]}</span>
                <span className="pod-rank">#{i + 1} best seller</span>
                <b className="pod-name">{it.name}</b>
                <span className="pill">{it.group}</span>
                <strong className="pod-value"><CountUp value={it.revenue} format={moneyCompact} ms={1000} /></strong>
                <span className="hint">{num(it.units)} units · {(it.revenueShare * 100).toFixed(1)}% of revenue</span>
                <span className="meter"><i style={{ width: `${(it.revenueShare / maxShare) * 100}%` }} /></span>
              </button>
            ))}
          </section>

          <Reveal><section className="grid g2">
            <ChartCard title="Price vs volume" subtitle="Each dot is a menu item · size = revenue · hover for details"
              right={<label className="inline">Highlight<select value={hl} onChange={(e) => setHl(e.target.value)}><option value="all">All categories</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select></label>}>
              <ResponsiveContainer width="100%" height={330}>
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--grid)" />
                  <XAxis type="number" dataKey="x" name="Avg price" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + v} />
                  <YAxis type="number" dataKey="y" name="Units" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
                  <ZAxis type="number" dataKey="revenue" range={[50, 420]} name="Revenue" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTip />} />
                  {byGroup.map(([g, pts]) => {
                    const on = hl === 'all' || hl === g;
                    return (
                      <Scatter key={g} name={g} data={pts} fill={on ? 'var(--s1)' : 'var(--muted)'} fillOpacity={on ? 0.85 : 0.18}
                        stroke="var(--card)" strokeWidth={2} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Frequently bought together" subtitle="Orders that contain both items">
              <ol className="pairs">
                {data.pairs.map((p, i) => (
                  <li key={`${p.a}|${p.b}`} style={{ '--r': i }}>
                    <span className="pair-rank">{i + 1}</span>
                    <div className="pair-body">
                      <div className="pair-names"><span>{p.a}</span><em>+</em><span>{p.b}</span></div>
                      <span className="meter"><i style={{ width: `${(p.orders / maxPair) * 100}%` }} /></span>
                    </div>
                    <b>{num(p.orders)}</b>
                  </li>
                ))}
                {!data.pairs.length && <li className="hint">Not enough multi-item orders for this selection.</li>}
              </ol>
            </ChartCard>
          </section></Reveal>

          <Reveal><section className="card table-card">
            <div className="chart-head">
              <div><h2>Item performance</h2><p className="sub">{rows.length} of {data.items.length} items · click a column to sort</p></div>
              <div className="ms-searchbox search-inline"><Icon name="search" size={14} />
                <input type="search" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
              </div>
            </div>
            <div className="tabs-scroll">
              <Toggle label="Category" value={cat} onChange={setCat} options={[['all', 'All'], ...groups.map((g) => [g, g])]} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th aria-label="Rank">#</th>
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
                <tbody key={`${cat}-${sort.key}-${sort.dir}`}>
                  {rows.map((i, n) => (
                    <tr key={i.name} style={{ '--r': Math.min(n, 14) }}>
                      <td className="rank-cell">{n + 1}</td>
                      <td><b>{i.name}</b></td><td><span className="pill">{i.group}</span></td>
                      <td className="r">{money(i.avgPrice)}</td><td className="r">{num(i.units)}</td>
                      <td className="r">{num(i.orders)}</td><td className="r">{money(i.revenue)}</td>
                      <td className="r">{(i.revenueShare * 100).toFixed(1)}%</td>
                      <td className="bar-cell"><span className="bar" style={{ width: `${(i.revenueShare / maxShare) * 100}%` }} /></td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={9} className="hint">No items match “{q}”.</td></tr>}
                </tbody>
              </table>
            </div>
          </section></Reveal>
        </>
      )}
    </PageState>
  );
}
