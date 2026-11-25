import { useEffect, useRef, useState } from 'react';

function MultiSelect({ label, options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="ms" ref={ref}>
      <button type="button" className={`btn ms-btn ${value.length ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        {label}{value.length ? <b className="badge">{value.length}</b> : null} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ms-pop" role="listbox" aria-multiselectable>
          {options.map((o) => (
            <label key={o} className="ms-opt">
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} /> {o}
            </label>
          ))}
          {value.length > 0 && <button type="button" className="link" onClick={() => onChange([])}>Clear</button>}
        </div>
      )}
    </div>
  );
}

const shift = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);

export default function Filters({ meta, filters, setFilters, active, onReset }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  // Presets are relative to the dataset's last day (the data ends in the past, not "today").
  const presets = meta ? [
    ['Last 30 days', shift(meta.maxDate, -29), meta.maxDate],
    ['Last 90 days', shift(meta.maxDate, -89), meta.maxDate],
    ['All time', '', ''],
  ] : [];
  return (
    <section className="filters card" aria-label="Filters">
      <div className="dates">
        <label>From
          <input type="date" value={filters.from} min={meta?.minDate} max={filters.to || meta?.maxDate} onChange={(e) => set('from')(e.target.value)} />
        </label>
        <label>To
          <input type="date" value={filters.to} min={filters.from || meta?.minDate} max={meta?.maxDate} onChange={(e) => set('to')(e.target.value)} />
        </label>
      </div>
      <div className="presets">
        {presets.map(([name, from, to]) => (
          <button key={name} type="button" className={`chip ${filters.from === from && filters.to === to ? 'on' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, from, to }))}>{name}</button>
        ))}
      </div>
      <div className="selects">
        <MultiSelect label="Outlet" options={meta?.outlets} value={filters.outlets} onChange={set('outlets')} />
        <MultiSelect label="Category" options={meta?.groups} value={filters.groups} onChange={set('groups')} />
        <MultiSelect label="Order type" options={meta?.orderTypes} value={filters.orderTypes} onChange={set('orderTypes')} />
        <MultiSelect label="Payment" options={meta?.settlements} value={filters.settlements} onChange={set('settlements')} />
        {active && <button type="button" className="link" onClick={onReset}>Reset all</button>}
      </div>
    </section>
  );
}
