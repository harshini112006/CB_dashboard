import Icon from './Icons.jsx';
import { num } from '../format.js';

// Numbered pagination: 1 … 4 5 [6] 7 8 … 120, plus prev / next.
function pagesToShow(page, last) {
  const set = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  if (page <= 3) [2, 3, 4].forEach((p) => p <= last && set.add(p));
  if (page >= last - 2) [last - 1, last - 2, last - 3].forEach((p) => p >= 1 && set.add(p));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => { if (i && p - sorted[i - 1] > 1) out.push(`gap${i}`); out.push(p); });
  return out;
}

export default function Pager({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="pg" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="left" size={15} /></button>
      {pagesToShow(page, pages).map((p) => (typeof p === 'string'
        ? <span key={p} className="pg-gap">…</span>
        : <button key={p} className={`pg ${p === page ? 'on' : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{num(p)}</button>))}
      <button className="pg" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="right" size={15} /></button>
    </nav>
  );
}
