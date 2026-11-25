import { useEffect, useState } from 'react';
import { fetchRecords } from '../api.js';
import { num, money } from '../format.js';
import { TypePill } from './Pills.jsx';

const fmtTs = (iso) => iso.replace('T', ' ').slice(0, 16);

// Server-side pagination: only 20 rows are ever transferred, regardless of how many match.
export default function RecordsTable({ filters }) {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { setPage(1); }, [filters]);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => {
      fetchRecords(filters, page, ac.signal).then((r) => { setRes(r); setErr(''); })
        .catch((e) => e.name !== 'AbortError' && setErr(e.message));
    }, 150);
    return () => { clearTimeout(t); ac.abort(); };
  }, [filters, page]);

  return (
    <section className="card table-card">
      <div className="chart-head">
        <h2>Order line items <small>{res ? `${num(res.total)} records` : ''}</small></h2>
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
          <span>Page {num(page)} of {res ? num(res.pages) : '…'}</span>
          <button className="btn" disabled={!res || page >= res.pages} onClick={() => setPage(page + 1)}>Next ›</button>
        </div>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Bill</th><th>Date &amp; time</th><th>Outlet</th><th>Item</th><th>Category</th><th>Type</th><th>Payment</th><th className="r">Price</th><th className="r">Qty</th><th className="r">Total</th></tr>
          </thead>
          <tbody>
            {(res?.rows ?? []).map((r, i) => (
              <tr key={`${r.billNo}-${i}`} style={{ '--r': Math.min(i, 14) }}>
                <td>{r.billNo}</td><td>{fmtTs(r.ts)}</td><td>{r.outlet}</td><td>{r.item}</td><td>{r.group}</td>
                <td><TypePill type={r.orderType} /></td><td>{r.settlement}</td>
                <td className="r">{money(r.price)}</td><td className="r">{r.qty}</td><td className="r">{money(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
