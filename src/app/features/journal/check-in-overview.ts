import type { SavedMeasurement } from '../../core/domain/measurement';
import type { LocalDate, ReadinessStatus } from '../../core/domain/models';
import { getCampaignDay } from '../../core/program/campaign';
import {
  CHECK_IN_INTERVAL_DAYS,
  getCheckInStatus,
  getCheckInWindow,
  testsHeldFor,
  type CheckInStatus,
} from '../../core/program/check-in-schedule';

export interface CheckInOverview {
  title: string;
  status: CheckInStatus;
  /** One plain line on what the row offers now. */
  text: string;
  /** Present only while the check-in waits on the person. */
  reminder?: string;
  queryParams: Record<string, string>;
}

/**
 * What Journal and Keep say about the check-in today. Null before Day 1, when there is
 * nothing to record yet.
 */
export function describeCheckIn(
  startDate: LocalDate,
  today: LocalDate,
  entries: readonly SavedMeasurement[],
  readiness?: ReadinessStatus,
): CheckInOverview | null {
  const window = getCheckInWindow(startDate, today);
  if (!window) {
    return null;
  }
  const title = window.index === 0 ? 'Day 1 check-in' : 'Monthly check-in';
  const status = getCheckInStatus(entries, window);

  if (status === 'due') {
    return {
      title,
      status,
      text: 'Weight, waist, resting heart rate, and four simple tests.',
      reminder: window.index === 0 ? 'Record where you’re starting.' : 'This month’s measurements are ready to take.',
      queryParams: {},
    };
  }
  if (status === 'tests' && !testsHeldFor(readiness)) {
    return {
      title: 'Check-in tests',
      status,
      text: 'A Red day held the tests back. Add them when you’re ready.',
      reminder: 'Add the tests a Red day held back.',
      queryParams: { part: 'tests' },
    };
  }

  const done = entries
    .filter((entry) => entry.kind === 'check-in' && entry.date >= window.start)
    .at(-1);
  const doneDay = done ? getCampaignDay(startDate, done.date) : window.openDay;
  const nextDay = window.openDay + CHECK_IN_INTERVAL_DAYS;
  return {
    title,
    status,
    text:
      status === 'tests'
        ? 'A Red day held the tests back. Add them on a better day.'
        : `Done on Day ${doneDay}. The next one opens on Day ${nextDay}.`,
    queryParams: status === 'tests' ? { part: 'tests' } : {},
  };
}
