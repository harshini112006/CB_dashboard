import { lines } from './db.js';
import { toMatch } from './filters.js';

// Two aggregations run in parallel:
//  1. BILL level  - collapse line items into orders first ($group by billNo), so that order counts and
//     average order value are exact, then fan out into many metrics with a single $facet.
//  2. LINE level  - category / item breakdowns, which only need line items.
// Everything is computed inside MongoDB; the API only ships small, already aggregated payloads.
const metrics = { orders: { $sum: 1 }, revenue: { $sum: '$revenue' }, units: { $sum: '$units' } };
const by = (expr) => [{ $group: { _id: expr, ...metrics } }, { $sort: { revenue: -1 } }];

export async function dashboard(f, granularity) {
  const match = toMatch(f);
  const billPipeline = [
    { $match: match },
    {
      $group: {
        _id: '$billNo',
        ts: { $first: '$ts' },
        outlet: { $first: '$outlet' },
        orderType: { $first: '$orderType' },
        settlement: { $first: '$settlement' },
        revenue: { $sum: '$revenue' },
        units: { $sum: '$qty' },
        lines: { $sum: 1 },
      },
    },
    {
      $facet: {
        kpi: [{ $group: { _id: null, ...metrics, lines: { $sum: '$lines' } } }],
        trend: [
          { $group: { _id: { $dateTrunc: { date: '$ts', unit: granularity, startOfWeek: 'monday' } }, ...metrics } },
          { $sort: { _id: 1 } },
        ],
        outlets: by('$outlet'),
        orderTypes: by('$orderType'),
        settlements: by('$settlement'),
        hours: [{ $group: { _id: { $hour: '$ts' }, ...metrics } }, { $sort: { _id: 1 } }],
        weekdays: [{ $group: { _id: { $dayOfWeek: '$ts' }, ...metrics } }, { $sort: { _id: 1 } }],
      },
    },
  ];
  const linePipeline = [
    { $match: match },
    {
      $facet: {
        groups: [
          { $group: { _id: '$group', revenue: { $sum: '$revenue' }, units: { $sum: '$qty' }, lines: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
        ],
        items: [
          { $group: { _id: { item: '$item', group: '$group' }, revenue: { $sum: '$revenue' }, units: { $sum: '$qty' } } },
          { $sort: { revenue: -1 } },
        ],
      },
    },
  ];
  const [[b], [l]] = await Promise.all([
    lines().aggregate(billPipeline, { allowDiskUse: true }).toArray(),
    lines().aggregate(linePipeline, { allowDiskUse: true }).toArray(),
  ]);

  const k = b.kpi[0] || { orders: 0, revenue: 0, units: 0, lines: 0 };
  const rename = (rows) => rows.map(({ _id, ...r }) => ({ name: _id, ...r }));
  const items = l.items.map(({ _id, ...r }) => ({ name: _id.item, group: _id.group, ...r }));
  const out = {
    kpis: {
      records: k.lines,
      orders: k.orders,
      revenue: k.revenue,
      units: k.units,
      aov: k.orders ? k.revenue / k.orders : 0,
      itemsPerOrder: k.orders ? k.units / k.orders : 0,
    },
    granularity,
    trend: b.trend.map(({ _id, ...r }) => ({ date: _id.toISOString().slice(0, 10), ...r })),
    outlets: rename(b.outlets),
    orderTypes: rename(b.orderTypes),
    settlements: rename(b.settlements),
    groups: rename(l.groups),
    topItemsByRevenue: items.slice(0, 10),
    topItemsByUnits: [...items].sort((x, y) => y.units - x.units).slice(0, 10),
    hours: Array.from({ length: 24 }, (_, h) => {
      const r = b.hours.find((x) => x._id === h);
      return { hour: h, orders: r?.orders ?? 0, revenue: r?.revenue ?? 0 };
    }),
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => {
      const r = b.weekdays.find((x) => x._id === i + 1); // $dayOfWeek: 1 = Sunday
      return { name, orders: r?.orders ?? 0, revenue: r?.revenue ?? 0 };
    }),
  };
  out.insights = buildInsights(out);
  return out;
}

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '0%');

// Deterministic, data-driven insights (no external LLM call: free, instant, reproducible).
export function buildInsights(d) {
  const out = [];
  const total = d.kpis.revenue;
  if (!d.kpis.orders) return out;
  const o = d.outlets[0];
  if (o) out.push(`${o.name} is the top outlet with ${inr(o.revenue)} (${pct(o.revenue, total)} of revenue).`);
  const best = [...d.outlets].sort((a, b) => b.revenue / b.orders - a.revenue / a.orders)[0];
  if (best && d.outlets.length > 1) out.push(`${best.name} has the highest average order value at ${inr(best.revenue / best.orders)}.`);
  const peak = [...d.hours].sort((a, b) => b.orders - a.orders)[0];
  if (peak?.orders) {
    out.push(`Peak ordering hour is ${String(peak.hour).padStart(2, '0')}:00–${String(peak.hour + 1).padStart(2, '0')}:00 with ${peak.orders.toLocaleString('en-IN')} orders.`);
  }
  const day = [...d.weekdays].sort((a, b) => b.revenue - a.revenue)[0];
  // Only call out a weekday when it is meaningfully above the average share (1/7 = 14.3%), not noise.
  if (day?.revenue && day.revenue > (total / 7) * 1.1) out.push(`${day.name} is the strongest weekday, generating ${pct(day.revenue, total)} of revenue.`);
  else if (day?.revenue) out.push('Revenue is spread evenly across weekdays (no day deviates more than 10% from average).');
  const del = d.orderTypes.find((x) => x.name === 'Delivery');
  if (del) out.push(`Delivery accounts for ${pct(del.orders, d.kpis.orders)} of orders and ${pct(del.revenue, total)} of revenue.`);
  const agg = d.settlements.filter((x) => x.name === 'ZomatoPay' || x.name === 'SwiggyPay');
  if (agg.length) out.push(`Aggregator channels (Zomato + Swiggy) bring ${pct(agg.reduce((s, x) => s + x.orders, 0), d.kpis.orders)} of orders.`);
  const g = d.groups[0];
  if (g) out.push(`${g.name} is the leading category (${pct(g.revenue, total)} of revenue).`);
  const it = d.topItemsByRevenue[0];
  if (it) out.push(`Best-selling item by revenue: ${it.name} (${inr(it.revenue)}, ${it.units.toLocaleString('en-IN')} units).`);
  if (d.granularity === 'month' && d.trend.length >= 4) {
    const full = d.trend.slice(1, -1); // first/last buckets may be partial months
    const a = full[0];
    const z = full[full.length - 1];
    if (a && z && a.revenue) {
      const ch = ((z.revenue - a.revenue) / a.revenue) * 100;
      out.push(`Monthly revenue moved ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(1)}% between ${a.date.slice(0, 7)} and ${z.date.slice(0, 7)}.`);
    }
  }
  return out;
}

export async function meta() {
  const [r] = await lines()
    .aggregate([
      {
        $facet: {
          outlets: [{ $group: { _id: '$outlet' } }, { $sort: { _id: 1 } }],
          groups: [{ $group: { _id: '$group' } }, { $sort: { _id: 1 } }],
          orderTypes: [{ $group: { _id: '$orderType' } }, { $sort: { _id: 1 } }],
          settlements: [{ $group: { _id: '$settlement' } }, { $sort: { _id: 1 } }],
          range: [{ $group: { _id: null, min: { $min: '$ts' }, max: { $max: '$ts' }, total: { $sum: 1 } } }],
        },
      },
    ])
    .toArray();
  const ids = (a) => a.map((x) => x._id);
  return {
    outlets: ids(r.outlets),
    groups: ids(r.groups),
    orderTypes: ids(r.orderTypes),
    settlements: ids(r.settlements),
    minDate: r.range[0]?.min?.toISOString().slice(0, 10) ?? null,
    maxDate: r.range[0]?.max?.toISOString().slice(0, 10) ?? null,
    totalRecords: r.range[0]?.total ?? 0,
  };
}

export async function records(f, page, limit) {
  const match = toMatch(f);
  const [rows, total] = await Promise.all([
    lines()
      .find(match, { projection: { _id: 0 } })
      .sort({ ts: -1, billNo: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    Object.keys(match).length ? lines().countDocuments(match) : lines().estimatedDocumentCount(),
  ]);
  return { rows, total, page, limit, pages: Math.ceil(total / limit) };
}

export function exportCursor(f) {
  return lines().find(toMatch(f), { projection: { _id: 0 } }).sort({ ts: 1, billNo: 1 });
}
