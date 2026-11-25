import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { connect, lines } from './db.js';
import { Cache } from './cache.js';
import { parseFilters, cacheKey, autoGranularity } from './filters.js';
import * as analytics from './analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const cache = new Cache();
const GRANS = ['day', 'week', 'month'];

app.use(cors());
app.use(compression());

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const getMeta = async () => (await cache.wrap('meta', analytics.meta)).value;

app.get('/api/health', wrap(async (_req, res) => {
  res.json({ ok: true, records: await lines().estimatedDocumentCount(), cache: cache.stats() });
}));

app.get('/api/meta', wrap(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json(await getMeta());
}));

app.get('/api/dashboard', wrap(async (req, res) => {
  const t0 = performance.now();
  const f = parseFilters(req.query);
  const meta = await getMeta();
  const gran = GRANS.includes(req.query.granularity)
    ? req.query.granularity
    : autoGranularity(f, Date.parse(meta.minDate), Date.parse(meta.maxDate));
  const { value, cached } = await cache.wrap(cacheKey('dash', f, gran), () => analytics.dashboard(f, gran));
  res
    .set('X-Cache', cached ? 'HIT' : 'MISS')
    .set('X-Response-Time', `${(performance.now() - t0).toFixed(0)}ms`)
    .json(value);
}));

app.get('/api/records', wrap(async (req, res) => {
  const f = parseFilters(req.query);
  const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const { value } = await cache.wrap(cacheKey('rec', f, `${page}:${limit}`), () => analytics.records(f, page, limit));
  res.json(value);
}));

// Streams the filtered rows as CSV without buffering them in memory.
app.get('/api/export.csv', wrap(async (req, res) => {
  const f = parseFilters(req.query);
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cb-orders.csv"' });
  res.write('BillNo,Outlet,Brand,Order_Datetime,Group,Item,Order_Type,Settlement,Price,Quantity,Revenue\n');
  const cursor = analytics.exportCursor(f);
  req.on('close', () => cursor.close().catch(() => {}));
  for await (const d of cursor) {
    const row = [d.billNo, d.outlet, d.brand, d.ts.toISOString().replace('T', ' ').slice(0, 19), d.group, d.item,
      d.orderType, d.settlement, d.price, d.qty, d.revenue].map(esc).join(',');
    if (!res.write(row + '\n')) await new Promise((r) => res.once('drain', r));
  }
  res.end();
}));

// Serve the built React app in production (single deployable service).
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
await connect();
app.listen(port, () => console.log(`API listening on :${port}`));
// Warm the cache so the first visitor doesn't pay for the default (unfiltered) query.
fetch(`http://127.0.0.1:${port}/api/dashboard`).catch(() => {});
