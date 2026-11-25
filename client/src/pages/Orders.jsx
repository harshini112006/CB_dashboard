import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchOrders, fetchOrder, fetchDashboard } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import { PageState } from '../components/PageState.jsx';
import { TypePill } from '../components/Pills.jsx';
import Pager from '../components/Pager.jsx';
import Icon from '../components/Icons.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { CountUp, spot } from '../components/Motion.jsx';
import { useToast } from '../components/Toast.jsx';
import { num, money, fmtDate } from '../format.js';

const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['revenue', 'Highest value'], ['lowest', 'Lowest value'], ['units', 'Most items']];
const fmtTs = (iso) => iso.replace('T', ' ').slice(0, 16);
const timeOf = (iso) => iso.slice(11, 16);

function Strip({ filters }) {
  const { data } = useApi((s) => fetchDashboard(filters, '', s), [filters]);
  if (!data) return <div className="strip skel"><div className="sk" /><div className="sk" /><div className="sk" /><div className="sk" /></div>;
  const k = data.kpis;
  const del = data.orderTypes.find((t) => t.name === 'Delivery');
  const items = [
    ['bag', 'Orders', k.orders, num, 'var(--s2)'],
    ['tag', 'Average value', k.aov, money, 'var(--s4)'],
    ['box', 'Items per order', k.itemsPerOrder, (v) => v.toFixed(1), 'var(--s3)'],
    ['pin', 'Delivery share', del ? (del.orders / k.orders) * 100 : 0, (v) => `${v.toFixed(1)}%`, 'var(--s1)'],
  ];
  return (
    <section className="strip" aria-label="Order summary">
      {items.map(([icon, label, value, fmt, color], i) => (
        <div key={label} className="card strip-item spot" style={{ '--i': i }} {...spot}>
          <span className="kpi-ico" style={{ '--tone': color }}><Icon name={icon} size={16} /></span>
          <div><span className="kpi-label">{label}</span><strong><CountUp value={value} format={fmt} /></strong></div>
        </div>
      ))}
    </section>
  );
}

export default function Orders() {
  const { filters, setFilters, reset } = useFilters();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [open, setOpen] = useState(null); // bill number shown in the drawer
  const [bill, setBill] = useState(filters.bill);

  useEffect(() => { setPage(1); }, [filters, sort]);
  useEffect(() => { setBill(filters.bill); }, [filters.bill]);
  const { data, loading, error } = useApi((s) => fetchOrders(filters, page, sort, s), [filters, page, sort]);

  // Looking up a bill number that matches exactly one order opens its receipt straight away.
  useEffect(() => {
    if (filters.bill && data?.total === 1 && !loading) setOpen(data.rows[0].billNo);
  }, [filters.bill, data, loading]);

  const findBill = (e) => { e.preventDefault(); setFilters((f) => ({ ...f, bill })); };
  const lastPage = data ? Math.min(data.pages, data.maxPage ?? data.pages) : 1;

  return (
    <>
      <Strip filters={filters} />
      <PageState kind="table" data={data} loading={loading} error={error} empty={data?.total === 0} onReset={reset}>
        {data && (
          <section className="card table-card">
            <div className="chart-head">
              <div><h2>Orders</h2><p className="sub">{num(data.total)} matching · click any row for the full receipt</p></div>
              <div className="toolbar">
                <form className="ms-searchbox search-inline" onSubmit={findBill} role="search">
                  <Icon name="search" size={14} />
                  <input inputMode="numeric" placeholder="Find bill #…" value={bill} aria-label="Find a bill number"
                    onChange={(e) => setBill(e.target.value.replace(/\D/g, '').slice(0, 12))} />
                  {filters.bill && <button type="button" className="link" onClick={() => setFilters((f) => ({ ...f, bill: '' }))}>Clear</button>}
                </form>
                <label className="inline">Sort
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="table-wrap">
              <table className="clickable">
                <thead>
                  <tr><th>Bill</th><th>Date &amp; time</th><th>Outlet</th><th>Type</th><th>Payment</th><th className="r">Lines</th><th className="r">Items</th><th className="r">Total</th><th aria-hidden /></tr>
                </thead>
                <tbody key={`${page}-${sort}`}>
                  {data.rows.map((o, n) => (
                    <tr key={o.billNo} style={{ '--r': n }} onClick={() => setOpen(o.billNo)}>
                      <td><button className="link" onClick={(e) => { e.stopPropagation(); setOpen(o.billNo); }}>#{o.billNo}</button></td>
                      <td>{fmtTs(o.ts)}</td><td>{o.outlet}</td><td><TypePill type={o.orderType} /></td><td>{o.settlement}</td>
                      <td className="r">{o.lines}</td><td className="r">{o.units}</td><td className="r"><b>{money(o.revenue)}</b></td>
                      <td className="go-cell" aria-hidden><Icon name="arrowRight" size={15} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-foot">
              <span className="hint">Page {num(page)} of {num(data.pages)}{data.pages > lastPage ? ` · browsing limited to ${num(lastPage)} pages per sort – narrow the filters to reach the rest` : ''}</span>
              <Pager page={page} pages={lastPage} onPage={setPage} />
            </div>
          </section>
        )}
      </PageState>
      {open != null && <OrderDrawer billNo={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function OrderDrawer({ billNo, onClose }) {
  const toast = useToast();
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

  const copy = async () => {
    try { await navigator.clipboard.writeText(String(billNo)); toast(`Bill #${billNo} copied`, 'copy'); } catch { toast('Couldn’t copy', 'x'); }
  };

  const { order, error } = state;
  // Portal to <body> so the drawer isn't dimmed / clipped by the page container (which fades while loading).
  return createPortal((
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Order ${billNo}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div><span className="eyebrow-sm">Order receipt</span><h2>#{billNo}</h2></div>
          <div className="actions">
            <button className="btn icon" onClick={copy} aria-label="Copy bill number" title="Copy bill number"><Icon name="copy" size={16} /></button>
            <button className="btn icon" onClick={onClose} aria-label="Close order details" autoFocus><Icon name="x" size={16} /></button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {!order && !error && <div className="sk" style={{ height: 260 }} />}
        {order && (
          <div className="receipt">
            <div className="receipt-top">
              <LogoMark size={36} />
              <div><b>{order.brand}</b><span>{order.outlet}</span></div>
              <TypePill type={order.orderType} />
            </div>
            <dl className="meta">
              <div><dt>Date</dt><dd>{fmtDate(order.ts.slice(0, 10))}</dd></div>
              <div><dt>Time</dt><dd>{timeOf(order.ts)}</dd></div>
              <div><dt>Payment</dt><dd>{order.settlement}</dd></div>
              <div><dt>Items</dt><dd>{order.units}</dd></div>
            </dl>
            <ul className="receipt-lines">
              {order.items.map((i, n) => (
                <li key={n} style={{ '--r': n }}>
                  <span className="qty">{i.qty}×</span>
                  <div><b>{i.item}</b><small>{i.group} · {money(i.price)} each</small></div>
                  <span className="amt">{money(i.total)}</span>
                </li>
              ))}
            </ul>
            <div className="receipt-total"><span>Total</span><b><CountUp value={order.revenue} format={money} ms={600} /></b></div>
            <p className="receipt-note">Thank you for ordering at Burger Town!</p>
          </div>
        )}
      </aside>
    </div>
  ), document.body);
}
