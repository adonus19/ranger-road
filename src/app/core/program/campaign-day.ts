import type { LocalDate, TrialResult } from '../domain/models';
import { resolveCampaignPosition } from './campaign-position';
import type { CampaignDayInfo } from './progression';

/**
 * A date's chapter and week. The chapter's last week (Weeks 4 and 8) is its deload, and the
 * trial days after it repeat that week, so they count as deload too.
 */
export function campaignDayResolver(
  startDate: LocalDate | undefined,
  trials: readonly Pick<TrialResult, 'trialId' | 'date'>[],
): (date: LocalDate) => CampaignDayInfo | null {
  const cache = new Map<LocalDate, CampaignDayInfo | null>();
  return (date) => {
    if (!startDate) return null;
    if (cache.has(date)) return cache.get(date)!;
    const chapter = resolveCampaignPosition(startDate, date, trials)?.chapter;
    const info = chapter
      ? {
          chapter: chapter.program.chapter.number,
          week: chapter.contentWeek,
          deload: chapter.contentWeek === chapter.program.chapter.weeks.at(-1),
        }
      : null;
    cache.set(date, info);
    return info;
  };
}
