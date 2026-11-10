/**
 * Calendar-date helpers. The server stores dates as 'yyyy-MM-dd' in the user's time zone,
 * so "today" here is worked out in that zone too (falls back to the browser's zone).
 * Dates are handled as plain calendar days (local-midnight Date objects), never as instants.
 */

export function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
}

/** Today's date ('yyyy-MM-dd') in the given IANA time zone. */
export function todayIn(zone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone || browserZone(), year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  } catch {
    return ymd(new Date());
  }
}

/** Current hour (0–23) in the given time zone – for "Good morning". */
export function hourIn(zone?: string | null): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: zone || browserZone(), hour: 'numeric', hourCycle: 'h23' })
      .format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function addMonths(s: string, months: number): string {
  const d = parseYmd(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return ymd(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000);
}

export function dayOfYear(s: string): number {
  const d = parseYmd(s);
  return daysBetween(`${d.getFullYear()}-01-01`, s) + 1;
}

/** "Tuesday, November 10" */
export function longDate(s: string): string {
  return parseYmd(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "Nov 10, 2026" */
export function mediumDate(s: string): string {
  return parseYmd(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Tue · Nov 10" */
export function shortDay(s: string): string {
  const d = parseYmd(s);
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** "TODAY", "YESTERDAY" or "MON · NOV 9" – the Journal day header. */
export function dayHeader(s: string, today: string): string {
  if (s === today) return 'Today';
  if (s === addDays(today, -1)) return 'Yesterday';
  return shortDay(s);
}

/** '18:40:00' → '6:40 PM' */
export function clockTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
