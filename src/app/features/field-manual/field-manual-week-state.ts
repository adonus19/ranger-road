import { Injectable, computed, inject, signal } from '@angular/core';
import type { TrialResult } from '../../core/domain/models';
import { getFieldManualWeek } from '../../core/program/field-manual';
import { CampaignState } from '../../core/state/campaign-state';
import { TrialHistory, loadCampaignTrials } from '../../core/state/trial-history';

export type IndexFilter =
  'all' | 'this-week' | 'leadership' | 'fieldcraft' | 'reading' | 'scripture' | 'exercises';

/** The Field Manual's current week, shared by its three views and reading pages. */
@Injectable({ providedIn: 'root' })
export class FieldManualWeekState {
  private readonly state = inject(CampaignState);
  private readonly trialHistory = inject(TrialHistory);
  private readonly completedTrials = signal<TrialResult[]>([]);
  private readonly trialsLoaded = signal(false);

  /** The Index keeps its search and filter while you read an entry and come back. */
  readonly indexQuery = signal('');
  readonly indexFilter = signal<IndexFilter>('all');

  readonly ready = computed(() => !this.state.loading() && this.trialsLoaded());

  readonly week = computed(() => {
    return getFieldManualWeek({
      startDate: this.state.campaign()?.startDate,
      today: this.state.today(),
      completedTrials: this.completedTrials(),
    });
  });

  async load(): Promise<void> {
    await this.state.initialize().catch(() => undefined);
    try {
      this.completedTrials.set(await loadCampaignTrials(this.trialHistory));
    } catch {
      // Without trial history the manual still opens; it just can't tell which chapter is current.
    } finally {
      this.trialsLoaded.set(true);
    }
  }
}
