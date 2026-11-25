const TYPE = { 'Dine-In': 'blue', Delivery: 'orange', Takeaway: 'green' };

// Colour-coded order type so a table can be scanned at a glance.
export function TypePill({ type }) {
  return <span className={`tpill ${TYPE[type] ?? 'gray'}`}>{type}</span>;
}
