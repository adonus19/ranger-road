import type { LocalDate } from '../domain/models';
import {
  getNextAttempt,
  isTrialAvailable,
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
  /** The trial can be started today: its chapter's last week is over and it is not passed. */
  attemptToday: boolean;
  /** The first day it can be taken, and the suggested one: the Monday after the last week. */
  firstAttempt: LocalDate | null;
  /** The next day it can be taken, on or after the date, while it waits for a pass. */
  nextAttempt: LocalDate | null;
}

/**
 * Follows the Trial Timing rule (CHAPTERS_AND_TRIALS.md): once its chapter's last week has
 * ended, the trial can be taken on any day until the first pass.
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
    attemptToday: !!chapter && !pass && isTrialAvailable(chapter),
    firstAttempt: chapter?.firstAttempt ?? null,
    nextAttempt: chapter && !pass ? getNextAttempt(chapter, date) : null,
  };
}
