// Optional LLM-written executive summary. The server recomputes the dashboard for the requested filters
// itself (cached) and sends only aggregated numbers to the model - never raw rows, never client-supplied text.
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = () => process.env.AI_MODEL || 'claude-haiku-5-5';
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export function buildPrompt(d, f) {
  const filters = Object.entries(f).filter(([, v]) => (Array.isArray(v) ? v.length : v !== null))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join('; ') || 'none (full dataset)';
  const rows = (arr, n = 8) => arr.slice(0, n).map((r) => `${r.name}: ${inr(r.revenue)}, ${r.orders ?? r.units} ${r.orders != null ? 'orders' : 'units'}`).join(' | ');
  const peakHours = [...d.hours].sort((a, b) => b.orders - a.orders).slice(0, 3).map((h) => `${h.hour}:00 (${h.orders})`).join(', ');
  return `You are a restaurant business analyst. Write a concise executive summary (max 120 words, 3-4 bullet points, plain text with "- " bullets) of this sales data for a quick-service burger chain. Highlight what matters, one risk or anomaly, and one concrete recommendation. Use only the numbers given; do not invent facts.

Active filters: ${filters}
Revenue ${inr(d.kpis.revenue)}; orders ${d.kpis.orders}; AOV ${inr(d.kpis.aov)}; units ${d.kpis.units}.
Outlets: ${rows(d.outlets)}
Order types: ${rows(d.orderTypes)}
Payment channels: ${rows(d.settlements)}
Categories: ${rows(d.groups)}
Top items: ${rows(d.topItemsByRevenue, 5)}
Peak hours: ${peakHours}
Trend (${d.granularity}): ${d.trend.slice(-12).map((t) => `${t.date}=${inr(t.revenue)}`).join(', ')}`;
}

export async function summarize(d, f, fetchImpl = fetch) {
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL(), max_tokens: 400, messages: [{ role: 'user', content: buildPrompt(d, f) }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status})`);
  const json = await res.json();
  const text = json.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  if (!text) throw new Error('Empty LLM response');
  return text;
}
