const inr = new Intl.NumberFormat('en-IN');
export const num = (n) => inr.format(Math.round(n ?? 0));
export const money = (n) => '₹' + inr.format(Math.round(n ?? 0));
// Compact Indian units: 1.2 L (lakh), 3.4 Cr (crore)
export function compact(n) {
  const v = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (v >= 1e7) return `${s}${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${s}${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `${s}${(v / 1e3).toFixed(1)}K`;
  return `${s}${Math.round(v)}`;
}
export const moneyCompact = (n) => '₹' + compact(n);
export const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '0%');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateLabel(iso, gran) {
  const [y, m, d] = iso.split('-').map(Number);
  if (gran === 'month') return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
  return `${d} ${MONTHS[m - 1]}`;
}
// "2025-06-17" -> "17 Jun 2025"
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
export const hourLong = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
