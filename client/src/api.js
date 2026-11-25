const ARRAYS = ['outlets', 'groups', 'orderTypes', 'settlements', 'items', 'weekdays'];
const SCALARS = ['from', 'to', 'hourFrom', 'hourTo', 'bill'];

export const EMPTY_FILTERS = {
  from: '', to: '', hourFrom: '', hourTo: '', bill: '',
  outlets: [], groups: [], orderTypes: [], settlements: [], items: [], weekdays: [],
};

export const toQuery = (f, extra = {}) => {
  const p = new URLSearchParams();
  for (const k of SCALARS) if (f[k] !== '' && f[k] != null) p.set(k, f[k]);
  for (const k of ARRAYS) if (f[k]?.length) p.set(k, f[k].join('|'));
  for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') p.set(k, v);
  return p.toString();
};

// Shareable links: filters live in the URL (?outlets=MG Road&from=2025-07-01 ...)
export function filtersFromUrl(search = window.location.search) {
  const p = new URLSearchParams(search);
  const f = { ...EMPTY_FILTERS };
  for (const k of SCALARS) f[k] = p.get(k) ?? '';
  for (const k of ARRAYS) f[k] = p.get(k) ? p.get(k).split('|').filter(Boolean) : [];
  f.weekdays = f.weekdays.map(Number).filter((n) => n >= 1 && n <= 7); // weekdays are numeric (1 = Sunday)
  return f;
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    // An expired session on any data call sends the user back to the login screen (handled in App).
    if (r.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('cb-unauthorized'));
    const body = await r.json().catch(() => ({}));
    throw new HttpError(r.status, body.error || `Request failed (${r.status})`);
  }
  return r.json();
}
const post = (url, body, signal) =>
  request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });

export const fetchSession = (signal) => request('/api/auth/me', { signal });
export const login = (username, password) => post('/api/auth/login', { username, password });
export const logout = () => post('/api/auth/logout', {});
export const fetchMeta = (signal) => request('/api/meta', { signal });
export const fetchDashboard = (f, granularity, signal) => request(`/api/dashboard?${toQuery(f, { granularity })}`, { signal });
export const fetchRecords = (f, page, signal) => request(`/api/records?${toQuery(f, { page, limit: 20 })}`, { signal });
export const fetchMenu = (f, signal) => request(`/api/menu?${toQuery(f)}`, { signal });
export const fetchOutlets = (f, signal) => request(`/api/outlets?${toQuery(f)}`, { signal });
export const fetchOrders = (f, page, sort, signal) => request(`/api/orders?${toQuery(f, { page, sort, limit: 15 })}`, { signal });
export const fetchOrder = (billNo, signal) => request(`/api/orders/${encodeURIComponent(billNo)}`, { signal });
export const fetchAiSummary = (f, signal) =>
  post('/api/ai-summary', Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v.join('|') : v])), signal);
export const exportUrl = (f) => `/api/export.csv?${toQuery(f)}`;
