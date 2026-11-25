// Integration tests against a real MongoDB (set TEST_MONGODB_URI, e.g. mongodb://127.0.0.1:27017).
// Skipped automatically when no URI is provided so `npm test` still works anywhere.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { createToken, verifyToken } from '../src/auth.js';
import { buildPrompt, summarize } from '../src/ai.js';

const uri = process.env.TEST_MONGODB_URI;
const skip = uri ? false : 'TEST_MONGODB_URI not set';

let server; let base; let client;
const mk = (billNo, ts, outlet, group, item, orderType, settlement, price, qty) => ({
  billNo, outlet, brand: 'Burger Town', ts: new Date(ts), group, item, orderType, settlement, price, qty,
  revenue: price * qty, hour: new Date(ts).getUTCHours(), dow: new Date(ts).getUTCDay() + 1,
});
const FIXTURE = [
  mk(1, '2025-07-01T12:10:00Z', 'HSR Layout', 'Burgers', 'Zinger', 'Dine-In', 'Cash/Card/Coupon', 200, 2),
  mk(1, '2025-07-01T12:10:00Z', 'HSR Layout', 'Drinks', 'Coke', 'Dine-In', 'Cash/Card/Coupon', 50, 1),
  mk(2, '2025-07-02T20:30:00Z', 'MG Road', 'Burgers', 'Zinger', 'Delivery', 'ZomatoPay', 200, 1),
  mk(3, '2025-07-03T20:45:00Z', 'MG Road', 'Extras', '=cmd|calc', 'Delivery', 'SwiggyPay', 0, 1),
];

before(async () => {
  if (skip) return;
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = 'cb_test';
  client = new MongoClient(uri);
  await client.connect();
  await client.db('cb_test').collection('lines').deleteMany({});
  await client.db('cb_test').collection('lines').insertMany(FIXTURE.map((d) => ({ ...d })));
  const { connect } = await import('../src/db.js');
  await connect();
  const { createApp } = await import('../src/app.js');
  server = createApp({ staticDir: null }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (skip) return;
  server?.close();
  await client?.db('cb_test').dropDatabase();
  await client?.close();
  const { close } = await import('../src/db.js');
  await close();
});

const json = (p, init) => fetch(base + p, init).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null), headers: r.headers }));

test('dashboard KPIs count distinct orders and revenue', { skip }, async () => {
  const { body } = await json('/api/dashboard');
  assert.equal(body.kpis.records, 4);
  assert.equal(body.kpis.orders, 3);
  assert.equal(body.kpis.revenue, 650);
  assert.equal(body.kpis.aov, 650 / 3);
});

test('filters: outlet, hour range, weekday, bill, item', { skip }, async () => {
  assert.equal((await json('/api/dashboard?outlets=MG%20Road')).body.kpis.orders, 2);
  assert.equal((await json('/api/dashboard?hourFrom=18&hourTo=23')).body.kpis.orders, 2);
  assert.equal((await json('/api/dashboard?bill=1')).body.kpis.revenue, 450);
  assert.equal((await json('/api/dashboard?items=Coke')).body.kpis.records, 1);
  assert.equal((await json('/api/dashboard?from=2025-07-02&to=2025-07-02')).body.kpis.orders, 1);
  assert.equal((await json('/api/dashboard?weekdays=3')).body.kpis.orders, 1); // 2025-07-01 is a Tuesday (dow 3)
});

test('menu: item stats use distinct orders; basket pairs counted', { skip }, async () => {
  const { body } = await json('/api/menu');
  const zinger = body.items.find((i) => i.name === 'Zinger');
  assert.deepEqual([zinger.units, zinger.revenue, zinger.orders], [3, 600, 2]);
  assert.deepEqual(body.pairs, [{ a: 'Coke', b: 'Zinger', orders: 1 }]);
  assert.equal(body.totals.revenue, 650);
});

test('outlets: per-outlet KPIs, mix and hourly distribution', { skip }, async () => {
  const { body } = await json('/api/outlets');
  const mg = body.outlets.find((o) => o.name === 'MG Road');
  assert.equal(mg.orders, 2);
  assert.equal(mg.revenue, 200);
  assert.equal(mg.deliveryShare, 1);
  assert.equal(mg.aggregatorShare, 1);
  assert.equal(mg.hours[20], 2);
  assert.equal(body.outlets[0].name, 'HSR Layout'); // sorted by revenue desc (450 vs 200)
  assert.equal(body.monthly[0].month, '2025-07');
});

test('orders: bill-level list with sorting, paging and detail', { skip }, async () => {
  const list = (await json('/api/orders?sort=revenue&limit=2')).body;
  assert.equal(list.total, 3);
  assert.equal(list.pages, 2);
  assert.deepEqual(list.rows.map((r) => r.billNo), [1, 2]);
  assert.equal(list.rows[0].revenue, 450);
  assert.equal((await json('/api/orders?sort=oldest&limit=1')).body.rows[0].billNo, 1);
  const d = await json('/api/orders/1');
  assert.equal(d.body.items.length, 2);
  assert.equal(d.body.revenue, 450);
  assert.equal((await json('/api/orders/99')).status, 404);
  assert.equal((await json('/api/orders/abc')).status, 400);
});

test('second identical request is a cache hit', { skip }, async () => {
  await json('/api/dashboard?outlets=HSR%20Layout');
  const r = await json('/api/dashboard?outlets=HSR%20Layout');
  assert.equal(r.headers.get('x-cache'), 'HIT');
});

test('filter values cannot inject Mongo operators', { skip }, async () => {
  const { body } = await json('/api/dashboard?outlets=' + encodeURIComponent('{"$ne":null}'));
  assert.equal(body.kpis.orders, 0);
});

test('CSV export neutralises spreadsheet formulas', { skip }, async () => {
  const text = await fetch(base + '/api/export.csv').then((r) => r.text());
  assert.match(text, /'=cmd\|calc/);
  assert.equal(text.trim().split('\n').length, 5);
});

test('auth: protected when AUTH_PASSWORD is set', { skip }, async () => {
  process.env.AUTH_PASSWORD = 's3cret';
  process.env.AUTH_USER = 'demo';
  try {
    assert.equal((await json('/api/dashboard')).status, 401);
    assert.equal((await json('/api/health')).status, 200);
    const bad = await json('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'demo', password: 'nope' }) });
    assert.equal(bad.status, 401);
    const ok = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'demo', password: 's3cret' }) });
    assert.equal(ok.status, 200);
    const cookie = ok.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    const authed = await json('/api/dashboard', { headers: { cookie: cookie.split(';')[0] } });
    assert.equal(authed.status, 200);
    assert.equal((await json('/api/dashboard', { headers: { cookie: 'cb_session=forged.token' } })).status, 401);
  } finally { delete process.env.AUTH_PASSWORD; delete process.env.AUTH_USER; }
});

test('AI summary is 501 without an API key', { skip }, async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = await json('/api/ai-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 501);
});

// ---- pure unit tests (no database needed)
test('session tokens: valid, tampered and expired', () => {
  const t = createToken('demo', 1000);
  assert.equal(verifyToken(t, 2000), 'demo');
  assert.equal(verifyToken(t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), 2000), null);
  assert.equal(verifyToken(t, 1000 + 13 * 3600 * 1000), null);
  assert.equal(verifyToken(undefined), null);
});

test('AI prompt contains aggregates only and summarize() parses the API response', async () => {
  const d = {
    kpis: { revenue: 1000, orders: 10, aov: 100, units: 30 }, granularity: 'month',
    outlets: [{ name: 'A', revenue: 1000, orders: 10 }], orderTypes: [], settlements: [], groups: [],
    topItemsByRevenue: [], hours: [{ hour: 20, orders: 5, revenue: 500 }], trend: [{ date: '2025-07-01', revenue: 1000 }],
  };
  const f = { outlets: ['A'], from: null };
  assert.match(buildPrompt(d, f), /outlets=A/);
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let seen;
  const text = await summarize(d, f, async (url, init) => {
    seen = { url, headers: init.headers };
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: '- Revenue is fine.' }] }) };
  });
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(text, '- Revenue is fine.');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.headers['x-api-key'], 'test-key');
});
