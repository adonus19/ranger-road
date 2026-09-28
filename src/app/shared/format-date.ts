import type { LocalDate } from '../core/domain/models';

const LONG_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function localNoon(date: LocalDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "Monday, October 5" for a YYYY-MM-DD civil date, read in local time so it never shifts a day. */
export function formatLongDate(date: LocalDate): string {
  return LONG_DATE.format(localNoon(date));
}

/** "Mon, Oct 5", for compact history rows. */
export function formatShortDate(date: LocalDate): string {
  return SHORT_DATE.format(localNoon(date));
}
