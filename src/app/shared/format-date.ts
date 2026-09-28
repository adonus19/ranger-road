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

const CLOCK_TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** "12:40 PM" in local time, for an instant in milliseconds or an ISO timestamp. */
export function formatClockTime(instant: number | string): string {
  return CLOCK_TIME.format(new Date(instant));
}

/** "45 min", "1 hr", or "2 hr 5 min" for a span of whole minutes. */
export function formatMinutes(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
