import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchOrders, fetchOrder } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import { PageState } from '../components/PageState.jsx';
import { num, money } from '../format.js';
import { TypePill } from '../components/Pills.jsx';

const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['revenue', 'Highest value'], ['lowest', 'Lowest value'], ['units', 'Most items']];
const fmtTs = (iso) => iso.replace('T', ' ').slice(0, 16);

export default function Orders() {
  const { filters, reset } = useFilters();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [open, setOpen] = useState(null); // bill number shown in the drawer

  useEffect(() => { setPage(1); }, [filters, sort]);
  const { data, loading, error } = useApi((s) => fetchOrders(filters, page, sort, s), [filters, page, sort]);

  return (
    <PageState kind="table" data={data} loading={loading} error={error} empty={data?.total === 0} onReset={reset}>
      {data && (
        <section className="card table-card">
          <div className="chart-head">
            <h2>Orders <small>{num(data.total)} matching</small></h2>
            <div className="toggles">
              <label className="inline">Sort
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <div className="pager">
                <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
                <span>Page {num(page)} of {num(data.pages)}</span>
                <button className="btn" disabled={page >= Math.min(data.pages, data.maxPage ?? data.pages)} onClick={() => setPage(page + 1)}>Next ›</button>
              </div>
            </div>
          </div>
          {data.maxPage && data.pages > data.maxPage && (
            <p className="hint">Browsing is limited to the first {num(data.maxPage)} pages per sort order — narrow the filters or change the sort to reach other orders.</p>
          )}
          <div className="table-wrap">
            <table className="clickable">
              <thead>
                <tr><th>Bill</th><th>Date &amp; time</th><th>Outlet</th><th>Type</th><th>Payment</th><th className="r">Lines</th><th className="r">Items</th><th className="r">Total</th></tr>
              </thead>
              <tbody>
                {data.rows.map((o, n) => (
                  <tr key={o.billNo} style={{ '--r': n }} onClick={() => setOpen(o.billNo)}>
                    <td><button className="link" onClick={(e) => { e.stopPropagation(); setOpen(o.billNo); }}>#{o.billNo}</button></td>
                    <td>{fmtTs(o.ts)}</td><td>{o.outlet}</td><td><TypePill type={o.orderType} /></td><td>{o.settlement}</td>
                    <td className="r">{o.lines}</td><td className="r">{o.units}</td><td className="r"><b>{money(o.revenue)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {open != null && <OrderDrawer billNo={open} onClose={() => setOpen(null)} />}
    </PageState>
  );
}

function OrderDrawer({ billNo, onClose }) {
  const [state, setState] = useState({ order: null, error: '' });
  useEffect(() => {
    const ac = new AbortController();
    setState({ order: null, error: '' });
    fetchOrder(billNo, ac.signal).then((order) => setState({ order, error: '' }))
      .catch((e) => e.name !== 'AbortError' && setState({ order: null, error: e.message }));
    return () => ac.abort();
  }, [billNo]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const { order, error } = state;
  // Portal to <body> so the drawer isn't dimmed / clipped by the page container (which fades while loading).
  return createPortal((
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Order ${billNo}`} onClick={(e) => e.stopPropagation()}>
        <div className="chart-head">
          <h2>Order #{billNo}</h2>
          <button className="btn icon" onClick={onClose} aria-label="Close order details" autoFocus>✕</button>
        </div>
        {error && <div className="error">{error}</div>}
        {!order && !error && <div className="sk" style={{ height: 160 }} />}
        {order && (
          <>
            <dl className="meta">
              <div><dt>Outlet</dt><dd>{order.outlet}</dd></div>
              <div><dt>Placed</dt><dd>{fmtTs(order.ts)}</dd></div>
              <div><dt>Type</dt><dd><TypePill type={order.orderType} /></dd></div>
              <div><dt>Payment</dt><dd>{order.settlement}</dd></div>
            </dl>
            <table>
              <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Total</th></tr></thead>
              <tbody>
                {order.items.map((i, n) => (
                  <tr key={n}><td>{i.item}<div className="hint">{i.group}</div></td><td className="r">{i.qty}</td><td className="r">{money(i.price)}</td><td className="r">{money(i.total)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td><b>Total</b></td><td className="r"><b>{order.units}</b></td><td /><td className="r"><b>{money(order.revenue)}</b></td></tr>
              </tfoot>
            </table>
          </>
        )}
      </aside>
    </div>
  ), document.body);
}
