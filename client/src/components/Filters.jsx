import { useEffect, useRef, useState } from 'react';

const WEEKDAYS = [['2', 'Mon'], ['3', 'Tue'], ['4', 'Wed'], ['5', 'Thu'], ['6', 'Fri'], ['7', 'Sat'], ['1', 'Sun']];
const HOURS = Array.from({ length: 24 }, (_, h) => [String(h), `${String(h).padStart(2, '0')}:00`]);

// options: array of strings or { value, label, group }. Searchable when long.
function MultiSelect({ label, options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const shown = opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="ms" ref={ref}>
      <button type="button" className={`btn ms-btn ${value.length ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        {label}{value.length ? <b className="badge">{value.length}</b> : null} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ms-pop" role="listbox" aria-multiselectable>
          {opts.length > 8 && <input className="ms-search" placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}
          <div className="ms-list">
            {shown.map((o) => (
              <label key={o.value} className="ms-opt">
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}
                {o.group && <small className="hint"> · {o.group}</small>}
              </label>
            ))}
            {!shown.length && <span className="hint">No matches</span>}
          </div>
          {value.length > 0 && <button type="button" className="link" onClick={() => onChange([])}>Clear</button>}
        </div>
      )}
    </div>
  );
}

const shift = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);

export default function Filters({ meta, filters, setFilters, active, onReset }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const [billDraft, setBillDraft] = useState(filters.bill);
  useEffect(() => setBillDraft(filters.bill), [filters.bill]);
  // Presets are relative to the dataset's last day (the data ends in the past, not "today").
  const presets = meta ? [
    ['Last 30 days', shift(meta.maxDate, -29), meta.maxDate],
    ['Last 90 days', shift(meta.maxDate, -89), meta.maxDate],
    ['All time', '', ''],
  ] : [];
  const hourBad = filters.hourFrom !== '' && filters.hourTo !== '' && Number(filters.hourFrom) > Number(filters.hourTo);
  return (
    <section className="filters card" aria-label="Filters">
      <div className="frow">
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
      </div>
      <div className="frow">
        <div className="selects">
          <MultiSelect label="Outlet" options={meta?.outlets} value={filters.outlets} onChange={set('outlets')} />
          <MultiSelect label="Category" options={meta?.groups} value={filters.groups} onChange={set('groups')} />
          <MultiSelect label="Item" options={meta?.items?.map((i) => ({ value: i.name, label: i.name, group: i.group }))} value={filters.items} onChange={set('items')} />
          <MultiSelect label="Order type" options={meta?.orderTypes} value={filters.orderTypes} onChange={set('orderTypes')} />
          <MultiSelect label="Payment" options={meta?.settlements} value={filters.settlements} onChange={set('settlements')} />
          <MultiSelect label="Weekday" options={WEEKDAYS.map(([value, label]) => ({ value, label }))} value={filters.weekdays} onChange={set('weekdays')} />
        </div>
        <div className="dates">
          <label>Hour from
            <select value={filters.hourFrom} onChange={(e) => set('hourFrom')(e.target.value)}>
              <option value="">Any</option>{HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Hour to
            <select value={filters.hourTo} onChange={(e) => set('hourTo')(e.target.value)} aria-invalid={hourBad}>
              <option value="">Any</option>{HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Bill #
            <input className="bill" inputMode="numeric" placeholder="e.g. 700002" value={billDraft}
              onChange={(e) => setBillDraft(e.target.value.replace(/\D/g, '').slice(0, 12))}
              onBlur={() => set('bill')(billDraft)} onKeyDown={(e) => e.key === 'Enter' && set('bill')(billDraft)} />
          </label>
        </div>
        {active && <button type="button" className="link" onClick={onReset}>Reset all</button>}
      </div>
      {hourBad && <div className="hint warn">“Hour from” is after “Hour to” — no orders can match.</div>}
    </section>
  );
}
