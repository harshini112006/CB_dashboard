// Parses + validates query-string filters and turns them into a Mongo $match.
// Every value is validated / coerced and bound as a literal ($in, $gte...), never passed through as an operator.
const list = (v) => (v == null || v === '' ? [] : String(v).split('|').map((s) => s.trim()).filter(Boolean));
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const intIn = (v, lo, hi) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

export function parseFilters(q = {}) {
  return {
    from: isDay(q.from) ? q.from : null,
    to: isDay(q.to) ? q.to : null,
    outlets: list(q.outlets),
    groups: list(q.groups),
    orderTypes: list(q.orderTypes),
    settlements: list(q.settlements),
    items: list(q.items),
    weekdays: list(q.weekdays).map((d) => intIn(d, 1, 7)).filter((d) => d !== null), // 1 = Sunday
    hourFrom: intIn(q.hourFrom, 0, 23),
    hourTo: intIn(q.hourTo, 0, 23),
    bill: /^\d{1,12}$/.test(String(q.bill ?? '').trim()) ? Number(String(q.bill).trim()) : null,
  };
}

export function toMatch(f) {
  const m = {};
  if (f.from || f.to) {
    m.ts = {};
    if (f.from) m.ts.$gte = new Date(`${f.from}T00:00:00.000Z`);
    if (f.to) m.ts.$lt = new Date(new Date(`${f.to}T00:00:00.000Z`).getTime() + 86400000); // inclusive end day
  }
  if (f.outlets.length) m.outlet = { $in: f.outlets };
  if (f.groups.length) m.group = { $in: f.groups };
  if (f.orderTypes.length) m.orderType = { $in: f.orderTypes };
  if (f.settlements.length) m.settlement = { $in: f.settlements };
  if (f.items.length) m.item = { $in: f.items };
  if (f.weekdays.length) m.dow = { $in: f.weekdays };
  if (f.hourFrom !== null || f.hourTo !== null) {
    m.hour = {};
    if (f.hourFrom !== null) m.hour.$gte = f.hourFrom;
    if (f.hourTo !== null) m.hour.$lte = f.hourTo;
  }
  if (f.bill !== null) m.billNo = f.bill;
  return m;
}

// Stable key so ?a=1&b=2 and ?b=2&a=1 share a cache entry.
export const cacheKey = (prefix, f, extra = '') =>
  `${prefix}:${JSON.stringify(Object.keys(f).sort().map((k) => [k, Array.isArray(f[k]) ? [...f[k]].sort() : f[k]]))}:${extra}`;

export function autoGranularity(f, minTs, maxTs) {
  const from = f.from ? Date.parse(f.from) : minTs;
  const to = f.to ? Date.parse(f.to) : maxTs;
  const days = Math.max(1, (to - from) / 86400000);
  return days <= 62 ? 'day' : days <= 200 ? 'week' : 'month';
}
