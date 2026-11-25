import { useEffect, useState } from 'react';
import MultiSelect, { Popover } from './MultiSelect.jsx';
import Icon from './Icons.jsx';
import { fmtDate } from '../format.js';

const WEEKDAYS = [['2', 'Mon'], ['3', 'Tue'], ['4', 'Wed'], ['5', 'Thu'], ['6', 'Fri'], ['7', 'Sat'], ['1', 'Sun']];
const WD_NAME = Object.fromEntries(WEEKDAYS);
const HOURS = Array.from({ length: 24 }, (_, h) => [String(h), `${String(h).padStart(2, '0')}:00`]);
const shift = (iso, days) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);

// Presets are relative to the dataset's last day (the data ends in the past, not "today").
export const datePresets = (meta) => (meta ? [
  ['Last 7 days', shift(meta.maxDate, -6), meta.maxDate],
  ['Last 30 days', shift(meta.maxDate, -29), meta.maxDate],
  ['Last 90 days', shift(meta.maxDate, -89), meta.maxDate],
  ['Last 6 months', shift(meta.maxDate, -182), meta.maxDate],
  ['All time', '', ''],
] : []);

function DateRange({ meta, filters, setFilters }) {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const presets = datePresets(meta);
  const current = presets.find(([, f, t]) => f === filters.from && t === filters.to);
  const label = current ? current[0] : `${fmtDate(filters.from) || 'Start'} – ${fmtDate(filters.to) || 'End'}`;
  return (
    <Popover label={label} icon="calendar" width={300} badge={0}>
      {(close) => (
        <>
          <div className="presets">
            {presets.map(([name, from, to]) => (
              <button key={name} type="button" className={`chip ${current?.[0] === name ? 'on' : ''}`}
                onClick={() => { setFilters((f) => ({ ...f, from, to })); close(); }}>{name}</button>
            ))}
          </div>
          <div className="date-inputs">
            <label>From<input type="date" value={filters.from} min={meta?.minDate} max={filters.to || meta?.maxDate} onChange={set('from')} /></label>
            <label>To<input type="date" value={filters.to} min={filters.from || meta?.minDate} max={meta?.maxDate} onChange={set('to')} /></label>
          </div>
          {meta && <p className="hint pad">Data available: {fmtDate(meta.minDate)} – {fmtDate(meta.maxDate)}</p>}
        </>
      )}
    </Popover>
  );
}

function MoreFilters({ meta, filters, setFilters }) {
  const [bill, setBill] = useState(filters.bill);
  useEffect(() => setBill(filters.bill), [filters.bill]);
  const [iq, setIq] = useState('');
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const count = (filters.items.length ? 1 : 0) + (filters.weekdays.length ? 1 : 0)
    + (filters.hourFrom !== '' || filters.hourTo !== '' ? 1 : 0) + (filters.bill ? 1 : 0);
  const items = (meta?.items ?? []).filter((i) => i.name.toLowerCase().includes(iq.toLowerCase()));
  const toggle = (k, v) => set(k)(filters[k].includes(v) ? filters[k].filter((x) => x !== v) : [...filters[k], v]);
  const hourBad = filters.hourFrom !== '' && filters.hourTo !== '' && Number(filters.hourFrom) > Number(filters.hourTo);
  return (
    <Popover label="More filters" icon="filter" badge={count} width={340} align="right">
      <div className="more">
        <div className="more-sec">
          <span className="more-h">Weekday</span>
          <div className="wd">
            {WEEKDAYS.map(([v, l]) => (
              <button key={v} type="button" className={`chip ${filters.weekdays.includes(Number(v)) ? 'on' : ''}`}
                aria-pressed={filters.weekdays.includes(Number(v))} onClick={() => toggle('weekdays', Number(v))}>{l}</button>
            ))}
          </div>
        </div>
        <div className="more-sec">
          <span className="more-h">Time of day</span>
          <div className="row2">
            <select value={filters.hourFrom} onChange={(e) => set('hourFrom')(e.target.value)} aria-label="From hour">
              <option value="">Any start</option>{HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="hint">to</span>
            <select value={filters.hourTo} onChange={(e) => set('hourTo')(e.target.value)} aria-label="To hour" aria-invalid={hourBad}>
              <option value="">Any end</option>{HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {hourBad && <span className="hint warn">Start is after end – nothing can match.</span>}
        </div>
        <div className="more-sec">
          <span className="more-h">Bill number</span>
          <input className="field" inputMode="numeric" placeholder="e.g. 700002" value={bill}
            onChange={(e) => setBill(e.target.value.replace(/\D/g, '').slice(0, 12))}
            onBlur={() => set('bill')(bill)} onKeyDown={(e) => e.key === 'Enter' && set('bill')(bill)} />
        </div>
        <div className="more-sec">
          <span className="more-h">Menu items {filters.items.length > 0 && <small>({filters.items.length} selected)</small>}</span>
          <div className="ms-searchbox"><Icon name="search" size={14} /><input placeholder="Search items…" value={iq} onChange={(e) => setIq(e.target.value)} /></div>
          <div className="ms-list short">
            {items.map((i) => (
              <label key={i.name} className="ms-opt">
                <input type="checkbox" checked={filters.items.includes(i.name)} onChange={() => toggle('items', i.name)} />
                <span>{i.name}</span><small className="hint">{i.group}</small>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Popover>
  );
}

export default function FilterBar({ meta, filters, setFilters, active, onReset }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const remove = (k, v) => setFilters((f) => ({ ...f, [k]: f[k].filter((x) => x !== v) }));

  const chips = [];
  if (filters.from || filters.to) chips.push({ key: 'date', label: `${fmtDate(filters.from) || 'Start'} – ${fmtDate(filters.to) || 'End'}`, clear: () => setFilters((f) => ({ ...f, from: '', to: '' })) });
  for (const [k, name] of [['outlets', 'Outlet'], ['groups', 'Category'], ['orderTypes', 'Type'], ['settlements', 'Payment'], ['items', 'Item']]) {
    filters[k].forEach((v) => chips.push({ key: `${k}:${v}`, label: `${name}: ${v}`, clear: () => remove(k, v) }));
  }
  filters.weekdays.forEach((d) => chips.push({ key: `wd:${d}`, label: WD_NAME[d], clear: () => remove('weekdays', d) }));
  if (filters.hourFrom !== '' || filters.hourTo !== '') {
    chips.push({ key: 'hours', label: `${filters.hourFrom !== '' ? HOURS[filters.hourFrom][1] : 'Open'} – ${filters.hourTo !== '' ? HOURS[filters.hourTo][1] : 'Close'}`, clear: () => setFilters((f) => ({ ...f, hourFrom: '', hourTo: '' })) });
  }
  if (filters.bill) chips.push({ key: 'bill', label: `Bill #${filters.bill}`, clear: () => set('bill')('') });

  return (
    <section className="fbar" aria-label="Filters">
      <div className="fbar-row">
        <DateRange meta={meta} filters={filters} setFilters={setFilters} />
        <span className="fsep" aria-hidden />
        <MultiSelect label="Outlet" options={meta?.outlets} value={filters.outlets} onChange={set('outlets')} />
        <MultiSelect label="Category" options={meta?.groups} value={filters.groups} onChange={set('groups')} />
        <MultiSelect label="Order type" options={meta?.orderTypes} value={filters.orderTypes} onChange={set('orderTypes')} />
        <MultiSelect label="Payment" options={meta?.settlements} value={filters.settlements} onChange={set('settlements')} />
        <div className="grow" />
        <MoreFilters meta={meta} filters={filters} setFilters={setFilters} />
      </div>
      {chips.length > 0 && (
        <div className="chips" aria-label="Active filters">
          {chips.map((c) => (
            <span className="fchip" key={c.key}>{c.label}
              <button type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`}><Icon name="x" size={12} /></button>
            </span>
          ))}
          {active && <button type="button" className="link" onClick={onReset}>Clear all</button>}
        </div>
      )}
    </section>
  );
}
