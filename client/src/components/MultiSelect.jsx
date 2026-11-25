import { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';

// Generic popover trigger: closes on outside click / Escape.
export function Popover({ label, icon, badge = 0, children, width = 240, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="pop" ref={ref}>
      <button type="button" className={`fbtn ${badge ? 'on' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        {icon && <Icon name={icon} size={15} />}
        <span>{label}</span>
        {badge > 0 && <b className="badge">{badge}</b>}
        <Icon name="chevron" size={14} className="caret" />
      </button>
      {open && <div className={`pop-panel ${align}`} style={{ width }} role="dialog" aria-label={label}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}

// options: strings or { value, label, group }. Shows a search box once the list is long.
export default function MultiSelect({ label, options = [], value, onChange }) {
  const [q, setQ] = useState('');
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const shown = opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover label={label} badge={value.length}>
      {opts.length > 8 && (
        <div className="ms-searchbox">
          <Icon name="search" size={14} />
          <input placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
      )}
      <div className="ms-list" role="listbox" aria-multiselectable>
        {shown.map((o) => (
          <label key={o.value} className="ms-opt">
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
            <span>{o.label}</span>
            {o.group && <small className="hint">{o.group}</small>}
          </label>
        ))}
        {!shown.length && <span className="hint pad">No matches</span>}
      </div>
      {value.length > 0 && <button type="button" className="link pop-clear" onClick={() => onChange([])}>Clear {label.toLowerCase()}</button>}
    </Popover>
  );
}
