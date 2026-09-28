import type { LocalDate, ReadinessStatus } from '../domain/models';
import type { SavedMeasurement } from '../domain/measurement';
import { addDays, getCampaignDay } from './campaign';

/** RANGERS_ROAD_PROGRAM.md: Day 1, then every 28 days, independent of the lead-in. */
export const CHECK_IN_INTERVAL_DAYS = 28;

export interface CheckInWindow {
  /** 0 for the Day 1 check-in, then 1, 2, … every 28 days. */
  index: number;
  /** The campaign day the window opens on: 1, 29, 57, … */
  openDay: number;
  start: LocalDate;
  /** The last date in the window. */
  end: LocalDate;
}

export type CheckInStatus = 'due' | 'tests' | 'done';

/** The check-in window holding `today`, or null before Day 1. */
export function getCheckInWindow(startDate: LocalDate, today: LocalDate): CheckInWindow | null {
  const day = getCampaignDay(startDate, today);
  if (day < 1) {
    return null;
  }
  const index = Math.floor((day - 1) / CHECK_IN_INTERVAL_DAYS);
  const openDay = index * CHECK_IN_INTERVAL_DAYS + 1;
  const start = addDays(startDate, openDay - 1);
  return { index, openDay, start, end: addDays(start, CHECK_IN_INTERVAL_DAYS - 1) };
}

/**
 * due: no check-in saved in this window yet.
 * tests: the window's latest check-in held its tests for a Red day and none were added since.
 * done: otherwise.
 */
export function getCheckInStatus(
  entries: readonly SavedMeasurement[],
  window: CheckInWindow,
): CheckInStatus {
  const inWindow = entries
    .filter((entry) => entry.date >= window.start && entry.date <= window.end)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const checkIn = inWindow.filter((entry) => entry.kind === 'check-in').at(-1);
  if (!checkIn) {
    return 'due';
  }
  const testsAdded = inWindow.some(
    (entry) => entry.kind === 'tests' && entry.recordedAt > checkIn.recordedAt,
  );
  return checkIn.testsHeld && !testsAdded ? 'tests' : 'done';
}

/** RANGERS_ROAD_PROGRAM.md: on a Red readiness day the four check-in tests wait for another day. */
export function testsHeldFor(readiness: ReadinessStatus | undefined): boolean {
  return readiness === 'red';
}

/**
 * The same schedule rule is used to explain an unavailable form and to guard its
 * IndexedDB write. A saved entry never moves to another window to make room.
 */
export function checkInSaveError(
  startDate: LocalDate | undefined,
  date: LocalDate,
  kind: 'check-in' | 'tests',
  entries: readonly SavedMeasurement[],
  readiness: ReadinessStatus | undefined,
  hasTests = false,
): string | null {
  if (!startDate) {
    return 'Choose Day 1 before taking a check-in.';
  }
  const window = getCheckInWindow(startDate, date);
  if (!window) {
    return 'Your first check-in opens on Day 1.';
  }
  const status = getCheckInStatus(entries, window);
  if (kind === 'check-in') {
    if (status !== 'due') {
      return `This check-in is already saved. The next one opens on Day ${window.openDay + CHECK_IN_INTERVAL_DAYS}.`;
    }
    if (hasTests && !readiness) {
      return 'Check readiness today before taking the tests. You can save a body-only check-in now.';
    }
    if (hasTests && testsHeldFor(readiness)) {
      return 'Today’s readiness is Red. Save the body measurements without tests.';
    }
    return null;
  }
  if (status === 'due') {
    return 'Save this window’s check-in before adding held tests.';
  }
  if (status === 'done') {
    return 'There are no held tests waiting in this check-in window.';
  }
  if (!readiness) {
    return 'Check readiness today before adding the held tests.';
  }
  if (testsHeldFor(readiness)) {
    return 'Today’s readiness is Red. Add the tests on a better day.';
  }
  const heldCheckIn = entries.find(
    (entry) => entry.kind === 'check-in' && entry.date >= window.start && entry.date <= window.end,
  );
  if (heldCheckIn && date <= heldCheckIn.date) {
    return 'Add the held tests on another day.';
  }
  return null;
}
