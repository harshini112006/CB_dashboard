// Aggregations behind the Menu, Outlets and Orders pages.
import { lines } from './db.js';
import { toMatch } from './filters.js';

const OPTS = { allowDiskUse: true };
const agg = (pipeline) => lines().aggregate(pipeline, OPTS).toArray();

// Market basket: which two items most often share an order? Pairs are generated and counted inside MongoDB
// (only the top rows travel back), because shipping ~110k per-bill item lists to Node is slow over a remote
// database connection (measured: ~10 s on Atlas free tier vs ~1 s in-database).
const SEP = '';
export async function topPairs(match, limit = 12) {
  const rows = await agg([
    { $match: match },
    { $group: { _id: '$billNo', items: { $addToSet: '$item' } } },
    { $match: { 'items.1': { $exists: true } } },
    { $project: { _id: 0, s: { $sortArray: { input: '$items', sortBy: 1 } } } },
    {
      $project: {
        pairs: {
          $reduce: {
            input: { $range: [0, { $size: '$s' }] },
            initialValue: [],
            in: {
              $concatArrays: ['$$value', {
                $map: {
                  input: { $range: [{ $add: ['$$this', 1] }, { $size: '$s' }] },
                  as: 'j',
                  in: { $concat: [{ $arrayElemAt: ['$s', '$$this'] }, SEP, { $arrayElemAt: ['$s', '$$j'] }] },
                },
              }],
            },
          },
        },
      },
    },
    { $unwind: '$pairs' },
    { $group: { _id: '$pairs', orders: { $sum: 1 } } },
    { $sort: { orders: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map(({ _id, orders }) => { const [a, b] = _id.split(SEP); return { a, b, orders }; });
}

// ---------------------------------------------------------------- Menu
export async function menu(f) {
  const match = toMatch(f);
  const [items, pairs] = await Promise.all([
    agg([
      { $match: match },
      // distinct bills per item via $addToSet: exact, and ~7x faster than a (item, bill) compound group
      { $group: { _id: '$item', group: { $first: '$group' }, revenue: { $sum: '$revenue' }, units: { $sum: '$qty' }, bills: { $addToSet: '$billNo' } } },
      { $project: { group: 1, revenue: 1, units: 1, orders: { $size: '$bills' } } },
      { $sort: { revenue: -1 } },
    ]),
    topPairs(match),
  ]);
  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
  const totalUnits = items.reduce((s, i) => s + i.units, 0);
  return {
    items: items.map((i) => ({
      name: i._id, group: i.group, revenue: i.revenue, units: i.units, orders: i.orders,
      avgPrice: i.units ? i.revenue / i.units : 0,
      revenueShare: totalRevenue ? i.revenue / totalRevenue : 0,
      unitShare: totalUnits ? i.units / totalUnits : 0,
    })),
    pairs,
    totals: { revenue: totalRevenue, units: totalUnits, items: items.length },
  };
}

// ---------------------------------------------------------------- Outlets
export async function outlets(f) {
  const match = toMatch(f);
  const [r] = await agg([
    { $match: match },
    {
      $group: {
        _id: '$billNo', ts: { $first: '$ts' }, outlet: { $first: '$outlet' }, orderType: { $first: '$orderType' },
        settlement: { $first: '$settlement' }, revenue: { $sum: '$revenue' }, units: { $sum: '$qty' },
      },
    },
    {
      $facet: {
        types: [{ $group: { _id: { o: '$outlet', k: '$orderType' }, orders: { $sum: 1 }, revenue: { $sum: '$revenue' } } }],
        channels: [{ $group: { _id: { o: '$outlet', k: '$settlement' }, orders: { $sum: 1 } } }],
        hours: [{ $group: { _id: { o: '$outlet', h: { $hour: '$ts' } }, orders: { $sum: 1 } } }],
        months: [
          { $group: { _id: { o: '$outlet', m: { $dateTrunc: { date: '$ts', unit: 'month' } } }, revenue: { $sum: '$revenue' }, orders: { $sum: 1 } } },
          { $sort: { '_id.m': 1 } },
        ],
        totals: [{ $group: { _id: '$outlet', orders: { $sum: 1 }, revenue: { $sum: '$revenue' }, units: { $sum: '$units' } } }],
      },
    },
  ]);

  const names = r.totals.map((t) => t._id).sort();
  const grand = r.totals.reduce((s, t) => s + t.revenue, 0);
  const typeNames = [...new Set(r.types.map((t) => t._id.k))].sort();
  const chanNames = [...new Set(r.channels.map((t) => t._id.k))].sort();
  const list = r.totals.map((t) => {
    const hours = Array.from({ length: 24 }, (_, h) => r.hours.find((x) => x._id.o === t._id && x._id.h === h)?.orders ?? 0);
    const peak = hours.indexOf(Math.max(...hours));
    const typeOrders = Object.fromEntries(typeNames.map((k) => [k, r.types.find((x) => x._id.o === t._id && x._id.k === k)?.orders ?? 0]));
    const chanOrders = Object.fromEntries(chanNames.map((k) => [k, r.channels.find((x) => x._id.o === t._id && x._id.k === k)?.orders ?? 0]));
    return {
      name: t._id, orders: t.orders, revenue: t.revenue, units: t.units,
      aov: t.orders ? t.revenue / t.orders : 0,
      unitsPerOrder: t.orders ? t.units / t.orders : 0,
      revenueShare: grand ? t.revenue / grand : 0,
      peakHour: peak, hours, typeOrders, chanOrders,
      deliveryShare: t.orders ? (typeOrders.Delivery ?? 0) / t.orders : 0,
      aggregatorShare: t.orders ? ((chanOrders.ZomatoPay ?? 0) + (chanOrders.SwiggyPay ?? 0)) / t.orders : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const months = [...new Set(r.months.map((m) => m._id.m.toISOString().slice(0, 7)))].sort();
  return {
    outlets: list, orderTypes: typeNames, channels: chanNames, outletNames: names,
    monthly: months.map((m) => ({
      month: m,
      ...Object.fromEntries(names.map((n) => [n, r.months.find((x) => x._id.o === n && x._id.m.toISOString().slice(0, 7) === m)?.revenue ?? 0])),
    })),
  };
}

// ---------------------------------------------------------------- Orders (bill level)
const SORTS = {
  newest: { ts: -1, _id: 1 }, oldest: { ts: 1, _id: 1 },
  revenue: { revenue: -1, _id: 1 }, lowest: { revenue: 1, _id: 1 }, units: { units: -1, _id: 1 },
};
export const SORT_KEYS = Object.keys(SORTS);

// Max rows a sorted page may need to look past. $sort + $skip + $limit is executed as a top-k sort, so memory
// stays bounded (a full sort of 110k bills exceeds the 32 MB in-memory limit on Atlas's free tier).
export const MAX_ORDER_PAGE = 2000;

export async function orders(f, page, limit, sort = 'newest') {
  page = Math.min(page, MAX_ORDER_PAGE);
  const match = toMatch(f);
  const perBill = {
    _id: '$billNo', ts: { $first: '$ts' }, outlet: { $first: '$outlet' }, orderType: { $first: '$orderType' },
    settlement: { $first: '$settlement' }, revenue: { $sum: '$revenue' }, units: { $sum: '$qty' }, lines: { $sum: 1 },
  };
  const [rows, total] = await Promise.all([
    agg([
      { $match: match },
      { $group: perBill },
      { $sort: SORTS[sort] ?? SORTS.newest },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]),
    agg([{ $match: match }, { $group: { _id: '$billNo' } }, { $count: 'n' }]),
  ]);
  const n = total[0]?.n ?? 0;
  return {
    rows: rows.map(({ _id, ...o }) => ({ billNo: _id, ...o })),
    total: n, page, limit, pages: Math.ceil(n / limit), maxPage: MAX_ORDER_PAGE,
  };
}

export async function orderDetail(billNo) {
  const rows = await lines().find({ billNo }, { projection: { _id: 0 } }).sort({ item: 1 }).toArray();
  if (!rows.length) return null;
  const h = rows[0];
  return {
    billNo, ts: h.ts, outlet: h.outlet, brand: h.brand, orderType: h.orderType, settlement: h.settlement,
    items: rows.map((r) => ({ item: r.item, group: r.group, price: r.price, qty: r.qty, total: r.revenue })),
    units: rows.reduce((s, r) => s + r.qty, 0),
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
  };
}
