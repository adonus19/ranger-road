import { Injectable, inject } from '@angular/core';
import type { LocalDate, TrialResult } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';
import { resolveCampaignPosition } from '../program/campaign-position';
import type { CampaignDayInfo, ProgressionContext } from '../program/progression';
import { CampaignState } from './campaign-state';
import { TrialHistory, loadCampaignTrials } from './trial-history';

/**
 * Reads what Forge progression is derived from: every saved workout session, the readiness
 * checks they were started under, and the trial passes that place each date in its chapter.
 * Nothing here is stored; screens build Last time, hints and records from the result.
 */
@Injectable({ providedIn: 'root' })
export class ProgressionHistory {
  private readonly state = inject(CampaignState);
  private readonly trialHistory = inject(TrialHistory);

  async load(): Promise<ProgressionContext> {
    await this.state.initialize();
    const database = await RoadDatabase.open();
    try {
      const [sessions, checks, trials] = await Promise.all([
        database.getAllHistorical('workoutSessions'),
        database.getAllReadinessChecks(),
        loadCampaignTrials(this.trialHistory),
      ]);
      return {
        sessions,
        readinessById: new Map(checks.map((check) => [check.id, check])),
        dayOf: campaignDayResolver(this.state.campaign()?.startDate, trials),
      };
    } finally {
      database.close();
    }
  }
}

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
