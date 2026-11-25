import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icons.jsx';

// Ctrl/Cmd + K launcher: jump to a page, apply a filter or run an action by typing.
// actions: [{ id, group, label, hint?, icon, run }]
export default function CommandPalette({ open, onClose, actions }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const listRef = useRef(null);

  useEffect(() => { if (open) { setQ(''); setIdx(0); } }, [open]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return actions.filter((a) => {
      const hay = `${a.group} ${a.label} ${a.hint ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 40);
  }, [q, actions]);

  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [idx]);

  if (!open) return null;
  const run = (a) => { onClose(); a.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && shown[idx]) { e.preventDefault(); run(shown[idx]); }
    else if (e.key === 'Escape') onClose();
  };

  let lastGroup = null;
  return createPortal(
    <div className="cmdk-wrap" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search pages, outlets, categories, actions…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="cmdk-list" />
          <kbd>Esc</kbd>
        </div>
        <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {shown.map((a, i) => {
            const head = a.group !== lastGroup ? <li className="cmdk-group" role="presentation" key={`g-${a.group}`}>{a.group}</li> : null;
            lastGroup = a.group;
            return [head, (
              <li key={a.id} role="option" aria-selected={i === idx} data-active={i === idx}
                className={`cmdk-item ${i === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => run(a)} style={{ '--r': Math.min(i, 12) }}>
                <span className="cmdk-ico"><Icon name={a.icon} size={16} /></span>
                <span className="cmdk-label">{a.label}</span>
                {a.hint && <span className="cmdk-hint">{a.hint}</span>}
                <Icon name="arrowRight" size={14} className="cmdk-go" />
              </li>
            )];
          })}
          {!shown.length && <li className="cmdk-empty">No results for “{q}”</li>}
        </ul>
        <div className="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> select</span><span><kbd>Ctrl</kbd><kbd>K</kbd> toggle</span></div>
      </div>
    </div>,
    document.body,
  );
}
