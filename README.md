# 🍔 Burger Town Analytics Dashboard

A web analytics dashboard built from a ~300,000-row Excel export of restaurant line items (6 outlets, 12 months of orders). Built for the California Burrito Software Developer Intern technical assessment.

| | |
|---|---|
| **Live app** | `<DEPLOYED_URL>` ← _replace after deploying (see [Deployment](#deployment))_ |
| **Repository** | https://github.com/harshini112006/CB_dashboard |
| **Stack** | React 18 + Vite · Recharts · Node.js/Express · MongoDB (native driver) |

---

## Features

- **KPIs** – total revenue, distinct orders, average order value, units sold, line-item count (all recalculated for the active filters).
- **Visualisations** – revenue/orders trend (area, with day/week/month granularity), revenue by outlet (bar), order-type and payment-channel split (donuts), revenue by category (bar), top-10 items (by revenue or units), orders by hour of day, revenue by weekday.
- **Filters** – date range + quick presets, and multi-select for outlet, category, order type and payment channel. Bars/donuts are **clickable cross-filters**.
- **Data explorer** – server-side paginated table of the underlying line items.
- **Bonus** – CSV export of the filtered data (streamed), auto-generated insights, dark mode, responsive/mobile layout, response caching, unit tests, Render blueprint.

## Run locally

Prerequisites: **Node.js ≥ 20** and a MongoDB (any one of: Docker, MongoDB Atlas, or the zero-install option below).

```bash
# 1. install everything
npm run install:all

# 2. configure the database connection
cp server/.env.example server/.env        # edit MONGODB_URI if not using localhost

# 3. start a MongoDB  (pick ONE)
docker compose up -d                      # a) Docker
npm run dev:db                            # b) no Docker: downloads & runs a local mongod (keep this terminal open)
#                                         # c) Atlas: just put your connection string in server/.env

# 4. load the dataset  (copy the provided Excel file to data/data.xlsx first)
npm run seed                              # ~10 s for 300k rows

# 5. run API (http://localhost:4000) and React dev server (http://localhost:5173)
npm run dev:server
npm run dev:client
```

**Production-style run (one process):** `npm run build && npm start` → open http://localhost:4000 (Express serves the built React app).

Tests: `npm test` (unit tests for filter parsing, query building, cache, insights).

## Deployment

The app is a **single Node web service** (Express serves `/api/*` and the built React app) plus a **MongoDB Atlas** free (M0) cluster.

1. **Atlas** – create a free M0 cluster, add a database user, allow network access (`0.0.0.0/0` for the demo), copy the `mongodb+srv://…` URI.
2. **Load the data once from your machine** (the Excel file is not stored in git):
   ```bash
   # server/.env  ->  MONGODB_URI=<atlas uri>
   npm run seed
   ```
3. **Render** – New → Blueprint → select this repo (`render.yaml` is included). Set the `MONGODB_URI` environment variable to the Atlas URI. Build/start commands and the `/api/health` check are preconfigured.
4. Paste the resulting URL into the table at the top of this README.

_(Any Node host works the same way: build command `npm --prefix server install && npm run build`, start command `npm start`, env var `MONGODB_URI`.)_

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/meta` | filter options, date range, total records |
| `GET /api/dashboard` | all KPIs + chart data for the filters, in **one** response |
| `GET /api/records?page=&limit=` | paginated line items |
| `GET /api/export.csv` | streamed CSV of the filtered rows |
| `GET /api/health` | liveness + cache stats |

Filter params (all optional): `from`, `to` (`YYYY-MM-DD`, inclusive), `outlets`, `groups`, `orderTypes`, `settlements` (values joined with `|`), `granularity` (`day|week|month`, default auto from range length).

## Architecture & decisions

### Data profile (checked before designing anything)
300,000 rows · 110,478 distinct `BillNo` (≈2.7 lines/order) · 6 outlets · 7 categories · 45 items · 3 order types · 4 settlement channels · single brand · 2025‑06‑17 → 2026‑06‑16 · no nulls, no duplicate rows. Every bill has exactly one outlet, timestamp, order type and settlement, so an order can be rebuilt reliably by grouping lines on `BillNo`.

### Why a database (MongoDB), and not "read the Excel on each request"?
- Parsing a 13 MB `.xlsx` takes several seconds, so it must happen **once**, not per request.
- Holding 300k rows in Node memory and filtering in JS works for one user but wastes RAM on a small host, can't use indexes, and doesn't scale to a bigger file.
- MongoDB lets the heavy lifting (filter + group) run next to the data with indexes, and the API ships only a few KB of aggregated results to the browser.

### Pipeline (ETL → query → cache → UI)
1. **ETL (`server/scripts/seed.js`)** – streams the workbook with ExcelJS (constant memory), validates/normalises each row, derives `revenue = price × quantity` **once at load time**, bulk-inserts in 10k batches (~10 s total), then builds indexes.
2. **Storage** – one `lines` collection, one document per line item (kept flat and close to the source; ~300k small docs). Indexes: `ts`, `billNo`, and `{outlet|group|orderType|settlement, ts}` so date-range + dimension filters can use an index.
3. **Query (`server/src/analytics.js`)** – two aggregations run in parallel:
   - *Bill-level*: `$match → $group by billNo → $facet` (KPIs, trend via `$dateTrunc`, outlet/order type/payment splits, hour, weekday). Grouping by bill first makes **order counts and AOV exact** instead of approximated.
   - *Line-level*: `$match → $facet` for category and item rankings.
4. **Cache (`server/src/cache.js`)** – the dataset is static, so results are cached in memory (LRU, 10 min TTL) keyed by the normalised filter set, with **in-flight de-duplication** (N identical concurrent requests → 1 query). The default view is pre-warmed at boot.
5. **Transport** – gzip compression, one `/api/dashboard` round trip per filter change (not 8 chart requests), `X-Cache` / `X-Response-Time` headers for observability.
6. **UI** – debounced requests with `AbortController` (stale responses can't overwrite fresh ones), previous data stays visible (dimmed) while loading to avoid layout flicker, skeleton on first load, charts and manual chunk split for caching, table paginated server-side (20 rows per page).

### Performance (measured locally, 300k rows, MongoDB 7, laptop)

| Request | Time |
|---|---|
| Dashboard, filtered (outlet / date range / multi-filter), cold | ~0.25 – 0.5 s |
| Dashboard, unfiltered (full scan of 300k rows), cold | ~0.5 – 1.6 s |
| Same query again (cache hit) | ~3 ms |
| Paginated records (page 500 / filtered) | 0.1 – 0.3 s |
| Seeding 300k rows from Excel | ~10 s |

On a free Atlas tier cold queries will be slower (shared CPU); the cache and boot-time warm-up keep typical interaction fast, and a re-visited filter combination is instant.

## Trade-offs & assumptions

- **Raw documents + on-demand aggregation vs pre-aggregated rollups.** Rollups (e.g. a daily table) would make cold queries ~instant, but distinct-order counts can't be summed across line-level rollups once a category/item filter is applied, and they add ETL complexity. At 300k rows, indexed aggregation + caching is fast enough and always exact. At ≥10M rows I would add rollup collections and/or bill-level documents.
- **In-memory cache** is per-process: simple and effective for one instance, but not shared if you scale horizontally (would move to Redis) and lost on restart (re-warmed at boot).
- **Timestamps have no timezone** in the source, so the wall-clock value is stored as-is (labelled UTC internally) and displayed unchanged. Hour-of-day and weekday are therefore the outlets' local times.
- **Revenue = Price × Quantity** per the brief; there is no tax, discount or coupon field, so the figures are gross item sales. ~8.6k lines (all free dips, `Price = 0`) contribute units but no revenue.
- **Category / outlet filters apply at line level.** With a category filter active, an "order" means "orders containing that category" and its revenue is the revenue of the matching lines.
- **First and last months are partial** (data starts 17 Jun 2025 and ends 16 Jun 2026), so the monthly view shows lower end points; use the weekly view for like-for-like comparison.
- **"AI insights" are rule-based**, computed from the aggregates (top outlet, peak hour, channel mix…). That keeps them free, instant and reproducible (no LLM key or latency); they update with the filters.
- **Weekday insight is suppressed when weekdays are statistically flat** (within 10% of average) rather than crowning a "best day" out of noise.
- **No authentication**: the data is a read-only sample and the brief lists auth as optional; the API only exposes aggregates and read-only queries, and filter values are always bound as `$in` lists (never raw operators), so there is no NoSQL-injection surface.
- The source Excel file is **not committed** (13 MB, `.gitignore`d); place it at `data/data.xlsx` to seed.

## Project structure

```
├── client/                 React + Vite app
│   └── src/
│       ├── App.jsx         state, data fetching, layout
│       ├── api.js          fetch helpers
│       ├── format.js       INR / compact (L, Cr) formatting
│       └── components/     Filters, Kpis, Insights, Charts, RecordsTable
├── server/
│   ├── src/
│   │   ├── index.js        Express app + routes (+ serves client build)
│   │   ├── analytics.js    aggregation pipelines + insights
│   │   ├── filters.js      query parsing / validation → Mongo $match
│   │   ├── cache.js        LRU/TTL cache with request de-duplication
│   │   └── db.js           Mongo connection
│   ├── scripts/            seed.js (ETL) · dev-db.js (local mongod)
│   └── test/               unit tests
├── data/                   put data.xlsx here (git-ignored)
├── docker-compose.yml      optional local MongoDB
└── render.yaml             Render deployment blueprint
```

## What I'd do next
Pre-aggregated rollups for cold-start speed, Redis cache for multi-instance deployments, period-over-period KPI deltas, saved filter views via URL query params, and an authenticated multi-brand mode.
