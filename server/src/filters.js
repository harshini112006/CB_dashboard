// Parses + validates query-string filters and turns them into a Mongo $match.
const list = (v) => (v == null || v === '' ? [] : String(v).split('|').map((s) => s.trim()).filter(Boolean));
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function parseFilters(q = {}) {
  const f = {
    from: isDay(q.from) ? q.from : null,
    to: isDay(q.to) ? q.to : null,
    outlets: list(q.outlets),
    groups: list(q.groups),
    orderTypes: list(q.orderTypes),
    settlements: list(q.settlements),
    items: list(q.items),
  };
  return f;
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
