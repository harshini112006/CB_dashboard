const toQuery = (f, extra = {}) => {
  const p = new URLSearchParams();
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  for (const k of ['outlets', 'groups', 'orderTypes', 'settlements']) if (f[k]?.length) p.set(k, f[k].join('|'));
  for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') p.set(k, v);
  return p.toString();
};

async function get(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

export const fetchMeta = (signal) => get('/api/meta', signal);
export const fetchDashboard = (f, granularity, signal) => get(`/api/dashboard?${toQuery(f, { granularity })}`, signal);
export const fetchRecords = (f, page, signal) => get(`/api/records?${toQuery(f, { page, limit: 20 })}`, signal);
export const exportUrl = (f) => `/api/export.csv?${toQuery(f)}`;
