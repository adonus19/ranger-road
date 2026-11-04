import { Injectable, inject } from '@angular/core';
import { RoadDatabase } from '../persistence/road-database';
import { campaignDayResolver } from '../program/campaign-day';
import type { ProgressionContext } from '../program/progression';
import { CampaignState } from './campaign-state';
import { TrialHistory, loadCampaignTrials } from './trial-history';

export { campaignDayResolver };

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
