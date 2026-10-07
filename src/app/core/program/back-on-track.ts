import type { LocalDate, MissionInstance } from '../domain/models';
import { addDays } from './calendar';
import { resolveCampaignPosition, type TrialRecord } from './campaign-position';

/** The two days before today that decide whether the Keep offers its gentle note. */
export function previousTwoDays(today: LocalDate): [LocalDate, LocalDate] {
  return [addDays(today, -1), addDays(today, -2)];
}

/**
 * True when each of the two days before today was a day with a main order, and nothing was
 * recorded for it. A recorded Rest counts as recorded, and Sundays and trial attempt days carry
 * no such order. Older days are never looked at, and nothing is counted or carried forward.
 */
export function needsBackOnTrack(
  startDate: LocalDate,
  today: LocalDate,
  trials: readonly TrialRecord[],
  recordsFor: (date: LocalDate) => readonly MissionInstance[],
): boolean {
  return previousTwoDays(today).every((date) => {
    const position = resolveCampaignPosition(startDate, date, trials);
    if (!position || position.awaitingNextChapter) return false;
    const chapter = position.chapter;
    if (chapter.weekday === 7 || chapter.attemptDay) return false;
    if (chapter.pass?.date === date) return false;
    return recordsFor(date).length === 0;
  });
}
