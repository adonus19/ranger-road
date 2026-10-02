import type { Campaign, LocalDate, TrialResult } from '../domain/models';
import { getGateTrialTargetDate } from './campaign';
import { getNextChapterStart } from './campaign-position';
import { chapterOneDefinition } from './chapter-one.seed';

type TrialRecord = Pick<TrialResult, 'trialId' | 'date'>;

/**
 * The first completed Gate Trial for this Chapter I campaign. A completed result means
 * every part was finished as written on a Green day, which is what passing requires.
 */
export function getChapterOneTrialPass<T extends TrialRecord>(
  campaign: Campaign | null,
  completedTrials: readonly T[],
): T | undefined {
  if (campaign?.currentChapterId !== chapterOneDefinition.id) return undefined;
  return completedTrials
    .filter((result) => result.trialId === chapterOneDefinition.trialId)
    .reduce<T | undefined>(
      (first, result) => (!first || result.date < first.date ? result : first),
      undefined,
    );
}

export function hasPassedChapterOneTrial(
  campaign: Campaign | null,
  completedTrials: readonly TrialRecord[],
): boolean {
  return Boolean(getChapterOneTrialPass(campaign, completedTrials));
}

/**
 * Chapter II's first day of its own orders: the day after a Monday pass, because the trial
 * took that week's Forge A, or the Monday after a pass on any other day. A pass saved
 * before the trial window opened (an older record) starts Chapter II on the first attempt day.
 */
export function getChapterTwoStartDate(
  campaign: Campaign | null,
  completedTrials: readonly TrialRecord[],
): LocalDate | undefined {
  const pass = getChapterOneTrialPass(campaign, completedTrials);
  if (!campaign || !pass) return undefined;
  return getNextChapterStart(pass.date, getGateTrialTargetDate(campaign.startDate));
}

/** Chapter I is behind the person once the Gate Trial is passed and Chapter II's first day arrives. */
export function isChapterOneComplete(
  campaign: Campaign | null,
  today: LocalDate,
  completedTrials: readonly TrialRecord[],
): boolean {
  const start = getChapterTwoStartDate(campaign, completedTrials);
  return Boolean(start && today >= start);
}
