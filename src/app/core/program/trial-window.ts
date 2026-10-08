import type { LocalDate } from '../domain/models';
import {
  getNextAttempt,
  resolveCampaignPosition,
  type ChapterDay,
  type TrialRecord,
} from './campaign-position';

/** Where one chapter's trial stands on a date. */
export interface TrialWindow<T extends TrialRecord = TrialRecord> {
  /** The chapter day, once the campaign has reached this trial's chapter. */
  chapter: ChapterDay<T> | null;
  /** The first completed result: the pass. */
  pass?: T;
  /** Today is a Monday or Thursday attempt day and the trial is not yet passed. */
  attemptToday: boolean;
  firstAttempt: LocalDate | null;
  /** The next attempt on or after the date, while the trial waits for a pass. */
  nextAttempt: LocalDate | null;
}

/**
 * Follows the Trial Timing rule (CHAPTERS_AND_TRIALS.md): the trial opens on the Monday after
 * its chapter's last week, then each Monday and Thursday until the first pass.
 */
export function getTrialWindow<T extends TrialRecord>(
  startDate: LocalDate,
  date: LocalDate,
  completedTrials: readonly T[],
  trialId: string,
): TrialWindow<T> {
  const pass = completedTrials
    .filter((result) => result.trialId === trialId)
    .reduce<T | undefined>(
      (first, result) => (!first || result.date < first.date ? result : first),
      undefined,
    );
  const position = resolveCampaignPosition(startDate, date, completedTrials);
  const chapter =
    position && position.chapter.program.trial.id === trialId ? position.chapter : null;
  return {
    chapter,
    ...(pass ? { pass } : {}),
    attemptToday: !!chapter?.attemptDay && !pass,
    firstAttempt: chapter?.firstAttempt ?? null,
    nextAttempt: chapter && !pass ? getNextAttempt(chapter, date) : null,
  };
}
