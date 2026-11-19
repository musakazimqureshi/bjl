// Consistent date format for BJL public pages and admin dashboard.
export function formatDate(value) {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match) return `${match[3]} ${match[2]} ${match[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2,'0')} ${String(d.getMonth()+1).padStart(2,'0')} ${d.getFullYear()}`;
}
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
