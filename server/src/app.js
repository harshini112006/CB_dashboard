import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { lines } from './db.js';
import { Cache } from './cache.js';
import { parseFilters, cacheKey, autoGranularity } from './filters.js';
import * as analytics from './analytics.js';
import * as auth from './auth.js';
import * as ai from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRANS = ['day', 'week', 'month'];

export function createApp({ staticDir = path.resolve(__dirname, '../../client/dist') } = {}) {
  const app = express();
  const cache = new Cache();
  const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
  const getMeta = async () => (await cache.wrap('meta', analytics.meta)).value;

  app.set('trust proxy', 1); // behind Render / any reverse proxy: correct client IP + https detection
  app.use(cors({ origin: false })); // same-origin only; the SPA is served by this server
  app.use(compression());
  app.use(express.json({ limit: '2kb' }));

  // ---- public routes
  app.get('/api/health', wrap(async (_req, res) => {
    res.json({ ok: true, records: await lines().estimatedDocumentCount(), cache: cache.stats() });
  }));

  app.get('/api/auth/me', (req, res) => {
    const user = auth.currentUser(req);
    res.json({ authEnabled: auth.authEnabled(), user: user || null, features: { ai: ai.aiEnabled() } });
  });

  app.post('/api/auth/login', auth.loginLimiter, (req, res) => {
    const { username, password } = req.body || {};
    if (!auth.authEnabled()) return res.json({ user: 'anonymous' });
    if (typeof username !== 'string' || typeof password !== 'string' || !auth.checkCredentials(username, password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    auth.setSession(req, res, username);
    res.json({ user: username });
  });

  app.post('/api/auth/logout', (_req, res) => { auth.clearSession(res); res.json({ ok: true }); });

  // ---- protected routes
  app.use('/api', auth.requireAuth);

  app.get('/api/meta', wrap(async (_req, res) => {
    res.set('Cache-Control', 'private, max-age=300').json(await getMeta());
  }));

  const dashboardFor = async (f, requested) => {
    const meta = await getMeta();
    const gran = GRANS.includes(requested) ? requested : autoGranularity(f, Date.parse(meta.minDate), Date.parse(meta.maxDate));
    return cache.wrap(cacheKey('dash', f, gran), () => analytics.dashboard(f, gran));
  };

  app.get('/api/dashboard', wrap(async (req, res) => {
    const t0 = performance.now();
    const f = parseFilters(req.query);
    const { value, cached } = await dashboardFor(f, req.query.granularity);
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
    // Prefix cells that start with = + - @ so spreadsheets never interpret them as formulas (CSV injection).
    const esc = (v) => {
      let s = String(v);
      if (/^[=+@]/.test(s) || (/^-/.test(s) && Number.isNaN(Number(s)))) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
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

  // LLM executive summary (optional: needs ANTHROPIC_API_KEY). Cached per filter set and globally rate limited.
  let aiWindow = { start: 0, n: 0 };
  app.post('/api/ai-summary', wrap(async (req, res) => {
    if (!ai.aiEnabled()) return res.status(501).json({ error: 'AI summaries are not configured on this server.' });
    const f = parseFilters(req.body || {});
    const { value: text, cached } = await cache.wrap(cacheKey('ai', f), async () => {
      const now = Date.now();
      if (now - aiWindow.start > 60000) aiWindow = { start: now, n: 0 };
      if (++aiWindow.n > 10) throw Object.assign(new Error('rate'), { status: 429 });
      const { value: d } = await dashboardFor(f, undefined);
      if (!d.kpis.orders) return 'No orders match the current filters.';
      return ai.summarize(d, f);
    });
    res.json({ summary: text, cached });
  }));

  // Serve the built React app in production (single deployable service).
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, _req, res, _next) => {
    if (err.status === 429) return res.status(429).json({ error: 'AI summary rate limit reached, try again in a minute.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.locals.cache = cache;
  return app;
}
