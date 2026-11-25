import { useEffect, useState } from 'react';
import { fetchAiSummary } from '../api.js';
import Icon from './Icons.jsx';

export default function Insights({ items, filters, aiEnabled }) {
  const [ai, setAi] = useState({ status: 'idle', text: '' });
  const [all, setAll] = useState(false);

  // A summary describes one specific filter set; drop it as soon as the filters change.
  useEffect(() => { setAi({ status: 'idle', text: '' }); }, [filters]);

  const run = async () => {
    setAi({ status: 'loading', text: '' });
    try { setAi({ status: 'done', text: (await fetchAiSummary(filters)).summary }); }
    catch (e) { setAi({ status: 'error', text: e.message }); }
  };

  if (!items?.length && !aiEnabled) return null;
  const shown = all ? items : items.slice(0, 4);
  return (
    <section className="card insights" aria-label="Insights">
      <div className="chart-head">
        <div><h2><Icon name="sparkles" size={16} className="spark-ico" /> Highlights</h2><p className="sub">Generated from the data for the current filters</p></div>
        {aiEnabled && (
          <button className="btn" onClick={run} disabled={ai.status === 'loading'}>
            <Icon name="sparkles" size={15} />{ai.status === 'loading' ? 'Thinking…' : 'AI summary'}
          </button>
        )}
      </div>
      {ai.status === 'done' && <div className="ai-box" aria-live="polite"><b>AI summary</b><p>{ai.text}</p></div>}
      {ai.status === 'error' && <div className="error" role="alert">{ai.text}</div>}
      <ul>{shown.map((t) => <li key={t}>{t}</li>)}</ul>
      {items.length > 4 && <button type="button" className="link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${items.length - 4} more`}</button>}
    </section>
  );
}
