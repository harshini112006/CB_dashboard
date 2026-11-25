import { useEffect, useState } from 'react';
import { fetchAiSummary } from '../api.js';

export default function Insights({ items, filters, aiEnabled }) {
  const [ai, setAi] = useState({ status: 'idle', text: '' });

  // A summary describes one specific filter set; drop it as soon as the filters change.
  useEffect(() => { setAi({ status: 'idle', text: '' }); }, [filters]);

  const run = async () => {
    setAi({ status: 'loading', text: '' });
    try { setAi({ status: 'done', text: (await fetchAiSummary(filters)).summary }); }
    catch (e) { setAi({ status: 'error', text: e.message }); }
  };

  if (!items?.length && !aiEnabled) return null;
  return (
    <section className="card insights" aria-label="Insights">
      <div className="chart-head">
        <h2>✨ Insights <small>for the current filters</small></h2>
        {aiEnabled && (
          <button className="btn" onClick={run} disabled={ai.status === 'loading'}>
            {ai.status === 'loading' ? 'Thinking…' : '🤖 AI summary'}
          </button>
        )}
      </div>
      {ai.status === 'done' && <div className="ai-box" aria-live="polite"><b>AI summary</b><p>{ai.text}</p></div>}
      {ai.status === 'error' && <div className="error" role="alert">{ai.text}</div>}
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );
}
