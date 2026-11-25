// Order types use the same series colour as in every chart (alphabetical slots: Delivery, Dine-In, Takeaway).
// The colour sits in a dot; the label stays in text ink, so identity never relies on coloured text.
const SLOT = { Delivery: 'var(--s1)', 'Dine-In': 'var(--s2)', Takeaway: 'var(--s3)' };

export function TypePill({ type }) {
  return <span className="tpill" style={{ '--c': SLOT[type] ?? 'var(--muted)' }}><i aria-hidden />{type}</span>;
}
