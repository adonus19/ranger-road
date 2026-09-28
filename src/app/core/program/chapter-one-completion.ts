import type { Campaign, LocalDate, TrialResult } from '../domain/models';
import { getCampaignDay, getChapterOneTargetDay } from './campaign';
import { chapterOneDefinition } from './chapter-one.seed';

/** A saved trial may be early; Chapter I closes only after all four full weeks end. */
export function isChapterOneComplete(
  campaign: Campaign | null,
  today: LocalDate,
  completedTrials: readonly Pick<TrialResult, 'trialId'>[],
): boolean {
  return Boolean(
    campaign?.currentChapterId === chapterOneDefinition.id &&
    getCampaignDay(campaign.startDate, today) > getChapterOneTargetDay(campaign.startDate) &&
    completedTrials.some((result) => result.trialId === chapterOneDefinition.trialId),
  );
}
