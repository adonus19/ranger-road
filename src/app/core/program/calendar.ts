import type { LocalDate } from '../domain/models';
import type { Weekday } from './chapter-program';

/** Parse a date-only value as a civil day, independent of local time and DST. */
function civilDay(date: LocalDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError(`Invalid local date: ${date}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const parsed = new Date(milliseconds);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid local date: ${date}`);
  }

  return Math.floor(milliseconds / 86_400_000);
}

/** Day 1 is the campaign start date. Dates before it return 0. */
export function getCampaignDay(startDate: LocalDate, today: LocalDate): number {
  return Math.max(0, daysBetween(startDate, today) + 1);
}

/** Signed civil days from one date to another: negative when `to` comes first. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return civilDay(to) - civilDay(from);
}

/** The civil date a number of days before (negative) or after a date. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date((civilDay(date) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** True for a real YYYY-MM-DD calendar date. */
export function isLocalDate(value: string): boolean {
  try {
    civilDay(value);
    return true;
  } catch {
    return false;
  }
}

/** Whole civil days from today until a date; never negative. */
export function getDaysUntil(date: LocalDate, today: LocalDate): number {
  return Math.max(0, daysBetween(today, date));
}

/** 1 is Monday and 7 is Sunday, for a civil date. */
export function getWeekday(date: LocalDate): Weekday {
  const utcDay = new Date(civilDay(date) * 86_400_000).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as Weekday;
}

/** The Monday of a date's Monday–Sunday week. */
export function mondayOnOrBefore(date: LocalDate): LocalDate {
  return addDays(date, 1 - getWeekday(date));
}

/** The date itself on a Monday, otherwise the next Monday. */
export function mondayOnOrAfter(date: LocalDate): LocalDate {
  const weekday = getWeekday(date);
  return weekday === 1 ? date : addDays(date, 8 - weekday);
}
