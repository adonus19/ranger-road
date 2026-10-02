import type { IsoTimestamp, LocalDate } from '../domain/models';
import { addDays, getWeekday } from '../program/campaign';
import { localDateToday } from './campaign-state';

/** Per-device note of the last copy made from Journal; the copy itself is the person's file. */
export const COPY_SAVED_AT_KEY = 'rangers-road.copy-saved-at';
/** The day the person chose "Not today", so the reminder stays hidden until tomorrow. */
export const BACKUP_SNOOZED_KEY = 'rangers-road.backup-reminder-snoozed';

/**
 * Sunday asks for a copy when none was saved this week (Monday through Sunday).
 * It never counts missed weeks, and "Not today" hides it for the rest of the day.
 */
export function isBackupReminderDue(
  today: LocalDate,
  savedAt: IsoTimestamp | null,
  snoozedOn: LocalDate | null,
): boolean {
  if (getWeekday(today) !== 7 || snoozedOn === today) {
    return false;
  }
  if (!savedAt) {
    return true;
  }
  return localDateToday(new Date(savedAt)) < addDays(today, -6);
}

export function readCopySavedAt(): IsoTimestamp | null {
  try {
    const value = localStorage.getItem(COPY_SAVED_AT_KEY);
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

export function readBackupSnoozedOn(): LocalDate | null {
  try {
    return localStorage.getItem(BACKUP_SNOOZED_KEY);
  } catch {
    return null;
  }
}

export function snoozeBackupReminder(today: LocalDate): void {
  try {
    localStorage.setItem(BACKUP_SNOOZED_KEY, today);
  } catch {
    // Storage can be refused in a private window; the row simply shows again on reload.
  }
}
