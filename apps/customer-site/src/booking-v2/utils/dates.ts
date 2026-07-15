/**
 * Pure local-date helpers for the V2 booking journey (calendar + display).
 * All functions work in the customer's local timezone with `YYYY-MM-DD`
 * strings as the canonical booking-date format. No external deps.
 */

/** Format a Date as local YYYY-MM-DD (no timezone shift like toISOString). */
export function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local Date (midnight local time). */
export function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date as local YYYY-MM-DD. */
export function todayLocalISO(): string {
  return formatLocalISO(new Date());
}

/** First day of the month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Add `n` months to the first-of-month date. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Number of days in the month containing `d`. */
export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Whether `a` is strictly before `b`, comparing calendar days only. */
export function isBeforeDay(a: Date, b: Date): boolean {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return da.getTime() < db.getTime();
}

/** Whether two dates fall in the same calendar month. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "July 2026" for a month heading. */
export function formatMonthLabel(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mon, 20 Jul 2026" for a YYYY-MM-DD booking date. */
export function formatLongDate(iso: string): string {
  const d = parseLocalISO(iso);
  return `${DAY_LABELS[d.getDay()]}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** "10:00" -> "10:00 AM", "17:30" -> "5:30 PM". */
export function formatSlotLabel(time: string): string {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10) || 0);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}
