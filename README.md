# 🍔 Burger Town Analytics Dashboard

A web analytics dashboard built from a ~300,000-row Excel export of restaurant line items (6 outlets, 12 months of orders). Built for the California Burrito Software Developer Intern technical assessment.

| | |
|---|---|
| **Live app** | https://cb-dashboard-1.onrender.com _(hosted on Render's free tier – it sleeps when idle, so the first visit can take up to a minute to wake; no login needed)_ |
| **Repository** | https://github.com/harshini112006/CB_dashboard |
| **Stack** | React 18 + Vite · Recharts · Node.js/Express · MongoDB (native driver) |

---

## Pages

A four-page single-page app (React Router). One **shared filter bar** sits above every page; the filters live in the URL, so they follow you between pages and any view is a shareable link.

| Page | Route | What it answers |
|---|---|---|
| **Overview** | `/` | Headline KPIs, auto-insights (+ optional AI summary), revenue/orders trend (day/week/month), revenue by outlet and category, order-type and payment split, top-10 items, orders by hour, revenue by weekday, line-item explorer. |
| **Menu** | `/menu` | Item performance: sortable/searchable table with price, units, distinct orders, revenue and share; *price vs volume* scatter by category; **frequently-bought-together** item pairs (market-basket analysis). |
| **Outlets** | `/outlets` | Outlet scorecards (revenue, share, AOV, items/order, delivery %, aggregator %, peak hour) – click one to filter the whole app to it; order-type and payment-mix comparison; monthly revenue by outlet; **outlet × hour heatmap**. |
| **Orders** | `/orders` | Bill-level order list (110k orders): sortable (newest / highest value / most items…), server-side paginated, and a **click-through order detail drawer** (receipt with every line item). |
| _Login_ / _404_ | – | Optional sign-in screen (see Authentication); friendly not-found page. |

Every page shows loading skeletons, error and empty states ("No orders match these filters").

## Features

- **KPIs** – total revenue, distinct orders, average order value, units sold, line-item count (all recalculated for the active filters).
- **Visualisations** – area/line trends, bars, donuts, scatter, stacked bars and a heatmap (Recharts + CSS grid).
- **Filters** – date range + quick presets, multi-select for outlet, category, item, order type, payment and weekday, hour range and bill lookup. Bars/donuts/scorecards are **clickable cross-filters**.
- **Data explorer** – server-side paginated tables of line items and of whole orders.

### UI / UX details

- **App shell** – collapsible dark sidebar on desktop (remembers its state), bottom tab bar on phones, per-page headers and document titles, light/dark theme (follows the OS, manual toggle), back-to-top button.
- **Command palette (Ctrl/⌘ + K)** – jump to any page, apply a date preset or outlet/category/type/payment filter, export, share or switch theme by typing; full keyboard navigation.
- **Share & feedback** – "Share" copies a link to the exact view (filters live in the URL); toast notifications confirm copies, exports and cleared filters.
- **Page highlights** – Overview opens with an animated hero ("₹X in revenue from Y orders", change vs previous period, top outlet, busiest hour, best seller, live trend line); Menu has a top-3 podium, a ranked "bought together" list and category tabs; Outlets cards carry monthly sparklines and share bars; Orders has a summary strip, quick bill search (a single match opens its receipt), numbered pagination and a receipt-style order drawer with copy-bill.
- **Compact filter bar** – date-range popover with presets, one-click dropdowns, a "More filters" panel (weekday, time of day, bill, items) and **removable chips** for every active filter; sticky on wide screens.
- **KPI cards** – animated numbers, sparklines, and **change vs the previous period** (an equal-length window just before the selected range; shown whenever a date range is chosen).
- **Charts** – value labels, hover tooltips, click-to-filter, peak/average markers, donut totals with clickable legends.
- **Validated colour system** – an 8-slot brand palette (ember, teal, gold, indigo, rose, sky, green, violet) checked with a colour-vision validator in both themes: neighbouring colours stay distinguishable for red/green colour-blind readers (OKLab ΔE ≥ 10 light / ≥ 11.8 dark) and for everyone else (ΔE ≥ 18). Dark mode uses its own re-stepped shades, not an inversion. Each measure keeps one colour everywhere (revenue = ember, orders = teal, units = gold, average value = indigo), each category keeps its colour on every page, bars have 4 px rounded ends and stacked segments are separated by 2 px gaps.
- **Brand identity** – custom SVG logo mark (geometric burger on an ember-to-amber tile, also used as the favicon) with a tracked wordmark.
- **Motion & effects** – page transitions, staggered card/row entrances, scroll-reveal sections (IntersectionObserver), animated charts and sparklines, a thin top loading bar tied to in-flight requests, cursor-follow spotlight on cards, glass (blurred) filter bar, sliding order drawer with blurred backdrop, heatmap cells that ripple in, and drifting gradient blobs on the login screen. All of it is pure CSS/React (no animation library) and switches off under `prefers-reduced-motion`.
- **Feedback states** – layout-shaped skeleton loaders, friendly empty state, dimmed (not blank) refresh, error banner.
- **Accessibility** – keyboard-reachable controls with visible focus, ARIA labels/pressed states, semantic tables, Escape closes popovers and the order drawer.

### Bonus items (all implemented)

| Bonus from the brief | What was built |
|---|---|
| **Advanced filtering** | Searchable **item** filter, **weekday** filter, **hour-of-day range**, **bill-number lookup**, click-to-filter charts, and **shareable URLs** (filters are stored in the query string, so any view can be bookmarked/sent). |
| **Data export** | `GET /api/export.csv` streams the *currently filtered* rows (cursor → response, constant memory). Cells starting with `= + @ -` are neutralised against spreadsheet formula injection. |
| **Authentication** | Optional login (enabled when `AUTH_PASSWORD` is set): HMAC-signed session in an `HttpOnly`, `SameSite=Lax` (and `Secure` over HTTPS) cookie, constant-time credential check, login rate limiting (10 failures / 15 min / IP). All data endpoints return 401 without a session. Zero extra dependencies. |
| **AI-generated insights** | Two layers: (1) instant **rule-based insights** on every view (no API needed), and (2) an optional **“🤖 AI summary”** button that sends only the *aggregated* numbers for the current filters to an LLM (Anthropic API) and shows a short executive summary. Enabled by setting `ANTHROPIC_API_KEY`; cached per filter set and rate limited. |
| **Responsive / mobile** | Fluid grid down to phone width, filters wrap, tables scroll inside their card, dark mode (follows OS, manual toggle). |
| **Caching & performance** | Server-side LRU/TTL cache with in-flight de-duplication, pre-warmed default view, indexed aggregations, gzip, single round-trip per filter change, abortable/debounced requests, server-side pagination. |
| **Infrastructure automation** | `Dockerfile` (multi-stage, non-root, healthcheck), `docker-compose.yml` (Mongo + app + seed job), `render.yaml` (infrastructure-as-code blueprint with auto-deploy), and **GitHub Actions** CI/CD: tests against a real MongoDB service, client build, Docker image build, and a deploy-hook job on `main`. |

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

**Everything in Docker (no Node/Mongo install needed):**

```bash
docker compose up -d --build        # MongoDB + app  ->  http://localhost:4000
docker compose run --rm seed        # one-off: load data/data.xlsx
```

**Tests:** `npm test` runs the unit tests (filters, cache, auth tokens, AI prompt). To also run the API integration tests against a real MongoDB:
`TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test` (uses a throw-away `cb_test` database; CI does this automatically).

### Configuration (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` / `MONGODB_DB` | `mongodb://127.0.0.1:27017` / `cb_dashboard` | database |
| `PORT` | `4000` | HTTP port |
| `AUTH_USER` / `AUTH_PASSWORD` | `admin` / _unset_ | login is **required only if `AUTH_PASSWORD` is set** |
| `AUTH_SECRET` | random per boot | signs session cookies (set it so sessions survive restarts) |
| `ANTHROPIC_API_KEY` / `AI_MODEL` | _unset_ / `claude-haiku-5-5` | enables the AI summary button |

## Deployment

It is **one app on one branch (`main`)**: a React front end (`client/`) and an Express API (`server/`) backed by MongoDB Atlas.

### Quick deploy on Vercel (4 steps)

1. **Import** this repo in Vercel (Add New → Project). Framework Preset: **Other**. `vercel.json` already sets the install/build commands, serves `client/dist` as the site and runs the API as one serverless function (`api/index.mjs`) – nothing else to configure.
2. **Add one environment variable** (Settings → Environment Variables): `MONGODB_URI` = your Atlas connection string. That's all that is required. The login is **off** unless you also set `AUTH_PASSWORD`; the AI summary button appears only if you set `ANTHROPIC_API_KEY`.
3. **Deploy / Redeploy.**
4. Open `https://<your-app>.vercel.app/api/health` – it should report `"records":300000`; then open the site root.

### Quick deploy on Render (alternative, 3 steps)

1. In Render choose **New → Blueprint**, connect this repo (it reads `render.yaml`).
2. When asked, paste your Atlas connection string as `MONGODB_URI`. Nothing else is required (no login unless you add `AUTH_PASSWORD`).
3. **Apply.** Open `https://<your-service>.onrender.com/api/health` – it should report `"records":300000`. _(Free instances sleep after ~15 min idle, so the first visit afterwards takes about a minute.)_

Any container host also works via the `Dockerfile` / `docker compose`. Vercel's beta *Container Runtime* is intentionally not used (its image push step failed for this project).

### Full setup details

1. **Atlas** – create a free M0 cluster, add a database user, allow network access (`0.0.0.0/0` for the demo), copy the `mongodb+srv://…` URI.
2. **Load the data once from your machine** (the Excel file is not stored in git):
   ```bash
   # server/.env  ->  MONGODB_URI=<atlas uri>
   npm run seed          # 300k rows; takes a few minutes over a home connection (the upload dominates)
   ```
   If the seed fails with `querySrv ECONNREFUSED`, your network's DNS refuses SRV lookups – add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env`.
3. **Render** – New → Blueprint → select this repo (`render.yaml` is included). Set `MONGODB_URI` (the Atlas URI) and `AUTH_PASSWORD` (login password for reviewers; user is `reviewer`). Optionally set `ANTHROPIC_API_KEY` to enable the AI summary. Build/start commands, auto-deploy and the `/api/health` check are preconfigured.
4. Paste the resulting URL into the table at the top of this README.
5. _(Optional CD)_ Add the Render **Deploy Hook** URL as the GitHub repository secret `RENDER_DEPLOY_HOOK`; the workflow in `.github/workflows/ci.yml` then redeploys after every green push to `main`.

> The deployed instance runs **without login** (no `AUTH_PASSWORD` set). Set `AUTH_USER` / `AUTH_PASSWORD` to enable the optional login screen.

_(Any Node host works the same way: build command `npm --prefix server install && npm run build`, start command `npm start`, env var `MONGODB_URI`.)_

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/meta` | filter options, date range, total records |
| `GET /api/dashboard` | all KPIs + chart data for the filters, in **one** response |
| `GET /api/menu` | item stats (units, distinct orders, revenue, share) + top item pairs |
| `GET /api/outlets` | per-outlet KPIs, order-type / payment mix, monthly revenue, hourly distribution |
| `GET /api/orders?page=&limit=&sort=` | bill-level orders (`sort`: `newest`, `oldest`, `revenue`, `lowest`, `units`) |
| `GET /api/orders/:billNo` | one order with all its line items |
| `GET /api/records?page=&limit=` | paginated line items |
| `GET /api/export.csv` | streamed CSV of the filtered rows |
| `POST /api/ai-summary` | LLM executive summary for the filters (501 unless `ANTHROPIC_API_KEY` is set) |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | session handling |
| `GET /api/health` | liveness + cache stats (public) |

All endpoints except `health` and `auth/*` require a session when auth is enabled.

Filter params (all optional): `from`, `to` (`YYYY-MM-DD`, inclusive), `outlets`, `groups`, `orderTypes`, `settlements`, `items` (values joined with `|`), `weekdays` (`1`=Sun … `7`=Sat, joined with `|`), `hourFrom`, `hourTo` (0–23), `bill` (exact bill number), `granularity` (`day|week|month`, default auto from range length).

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

**Verified on MongoDB Atlas M0 (free tier)** with all 300k rows: every endpoint works; cold queries take ~0.2 s (filtered dashboard), ~1 – 1.6 s (outlets, menu, orders) and the cache makes repeats instant. Two free-tier constraints shaped the queries:

- **M0 ignores `allowDiskUse` and caps in-memory sorts at 32 MB**, so a full sort of 110k orders fails there. The Orders page therefore uses `$sort + $skip + $limit` (a bounded top-k sort) and limits browsing to the first 2,000 pages per sort order; narrow the filters or change the sort to reach the rest.
- **Moving data out of the database is the slow part on a remote cluster.** Item-pair ("bought together") counting originally streamed 110k per-order item lists to Node (~9.6 s on Atlas); it now generates and counts pairs inside MongoDB and returns only 12 rows (~1.7 s, identical results).

## Trade-offs & assumptions

- **Raw documents + on-demand aggregation vs pre-aggregated rollups.** Rollups (e.g. a daily table) would make cold queries ~instant, but distinct-order counts can't be summed across line-level rollups once a category/item filter is applied, and they add ETL complexity. At 300k rows, indexed aggregation + caching is fast enough and always exact. At ≥10M rows I would add rollup collections and/or bill-level documents.
- **In-memory cache** is per-process: simple and effective for one instance, but not shared if you scale horizontally (would move to Redis) and lost on restart (re-warmed at boot).
- **Timestamps have no timezone** in the source, so the wall-clock value is stored as-is (labelled UTC internally) and displayed unchanged. Hour-of-day and weekday are therefore the outlets' local times.
- **Revenue = Price × Quantity** per the brief; there is no tax, discount or coupon field, so the figures are gross item sales. ~8.6k lines (all free dips, `Price = 0`) contribute units but no revenue.
- **Category / outlet filters apply at line level.** With a category filter active, an "order" means "orders containing that category" and its revenue is the revenue of the matching lines.
- **First and last months are partial** (data starts 17 Jun 2025 and ends 16 Jun 2026), so the monthly view shows lower end points; use the weekly view for like-for-like comparison.
- **Two kinds of insights, on purpose.** The always-on insights are rule-based (free, instant, reproducible, no key). The LLM summary is opt-in: it adds narrative and recommendations but costs latency/money and can phrase things loosely, so it only receives pre-aggregated numbers (never raw rows or user text), is told not to invent facts, and is cached + rate limited.
- **Weekday insight is suppressed when weekdays are statistically flat** (within 10% of average) rather than crowning a "best day" out of noise.
- **Auth is deliberately lightweight**: one configured account with a signed cookie session rather than a user database / OAuth, which is proportionate for a single-tenant dashboard. Sessions are stateless (no server-side revocation; they expire after 12 h), and the login limiter is in-memory per instance. For multi-user use I'd move to an identity provider.
- **Security of data access:** filter values are validated and always bound as literals (`$in`, `$gte`…), never raw operators, so there is no NoSQL-injection surface; CORS is same-origin only; CSV export is formula-injection safe.
- The source Excel file is **not committed** (13 MB, `.gitignore`d); place it at `data/data.xlsx` to seed.

## Project structure

```
├── client/                 React + Vite app
│   └── src/
│       ├── App.jsx           session gate + routes
│       ├── filters-context.jsx  shared filter state, mirrored to the URL
│       ├── hooks.js          useApi: debounced, abortable data loading
│       ├── api.js            fetch helpers, filter <-> URL (de)serialisation
│       ├── format.js         INR / compact (L, Cr) formatting
│       ├── pages/            Overview, Menu, Outlets, Orders (+ drawer), NotFound
│       └── components/       Shell (nav), Login, Filters, Kpis, Insights (+AI), Charts, Heatmap, RecordsTable, PageState
├── server/
│   ├── src/
│   │   ├── index.js        process entry (connect, listen, warm cache)
│   │   ├── app.js          Express app factory + routes (+ serves client build)
│   │   ├── analytics.js    overview aggregation pipelines + rule-based insights
│   │   ├── reports.js      menu / outlets / orders aggregations (+ basket analysis)
│   │   ├── filters.js      query parsing / validation → Mongo $match
│   │   ├── auth.js         cookie sessions, credential check, login limiter
│   │   ├── ai.js           LLM summary prompt + API call
│   │   ├── cache.js        LRU/TTL cache with request de-duplication
│   │   └── db.js           Mongo connection
│   ├── scripts/            seed.js (ETL) · dev-db.js (local mongod)
│   └── test/               unit + API integration tests
├── .github/workflows/      CI/CD (tests, build, docker, deploy hook)
├── Dockerfile              multi-stage production image
├── docker-compose.yml      Mongo + app + seed job
├── render.yaml             Render deployment blueprint (IaC)
└── data/                   put data.xlsx here (git-ignored)
```

## What I'd do next
Pre-aggregated rollups for cold-start speed, Redis cache for multi-instance deployments, period-over-period KPI deltas, and an identity-provider login with per-user roles and a multi-brand mode.
