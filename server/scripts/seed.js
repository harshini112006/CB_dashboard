// ETL: Excel -> MongoDB. Streams the workbook (constant memory), normalises rows and bulk-inserts in batches.
// Usage: npm run seed -- [path/to/data.xlsx]      (default: ../data/data.xlsx)
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { connect, lines, close } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(process.argv[2] || path.join(__dirname, '../../data/data.xlsx'));
const BATCH = 10_000;

// Excel cells are real dates; fall back to the documented DD-MM-YYYY HH:MM:SS text format.
// Timestamps carry no timezone, so the wall-clock value is stored as-is (UTC-labelled) to avoid shifts.
function parseDate(v) {
  if (v instanceof Date) return v;
  const m = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(String(v).trim());
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6])) : null;
}

await connect();
const col = lines();
await col.drop().catch(() => {});

const t0 = Date.now();
let buf = [];
let total = 0;
let skipped = 0;
const flush = async () => {
  if (!buf.length) return;
  await col.insertMany(buf, { ordered: false });
  total += buf.length;
  buf = [];
  process.stdout.write(`\rInserted ${total.toLocaleString()} rows`);
};

const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
  entries: 'emit', sharedStrings: 'cache', styles: 'cache', worksheets: 'emit',
});
for await (const ws of reader) {
  let header;
  for await (const row of ws) {
    const v = row.values.slice(1);
    if (!header) { header = v.map(String); continue; }
    const r = Object.fromEntries(header.map((h, i) => [h, v[i]]));
    const ts = parseDate(r.Order_Datetime);
    const price = Number(r.Price);
    const qty = Number(r.Quantity);
    if (!ts || !Number.isFinite(price) || !Number.isFinite(qty) || r.BillNo == null) { skipped++; continue; }
    buf.push({
      billNo: Number(r.BillNo),
      outlet: String(r.Outlet_Name).trim(),
      brand: String(r.Brand).trim(),
      ts,
      group: String(r.Group).trim(),
      item: String(r.Item).trim(),
      orderType: String(r.Order_Type).trim(),
      settlement: String(r.Settlement).trim(),
      price,
      qty,
      revenue: price * qty, // derived once at load time, not per query
    });
    if (buf.length >= BATCH) await flush();
  }
  break; // first sheet only
}
await flush();
console.log(`\nLoaded ${total.toLocaleString()} rows (${skipped} skipped) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

console.log('Creating indexes...');
await Promise.all([
  col.createIndex({ ts: 1 }),
  col.createIndex({ billNo: 1 }),
  col.createIndex({ outlet: 1, ts: 1 }),
  col.createIndex({ group: 1, ts: 1 }),
  col.createIndex({ orderType: 1, ts: 1 }),
  col.createIndex({ settlement: 1, ts: 1 }),
]);
console.log('Done.');
await close();
