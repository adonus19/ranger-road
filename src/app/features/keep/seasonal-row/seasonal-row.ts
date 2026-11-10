import { Component, computed, inject, signal } from '@angular/core';
import { getSeasonalDays } from '../../../core/program/seasonal-layer';
import { CampaignState } from '../../../core/state/campaign-state';
import { DayProgress } from '../../../core/state/day-progress';
import { Icon } from '../../../shared/icon/icon';

const ITEM = 'seasonal';

/**
 * The Advent or Christmas family reading on its real date, whatever the chapter or week
 * (FAITH_AND_LEADERSHIP.md, "Seasonal Layer"). One Done for the day, undoable the same day;
 * nothing is counted. On an ordinary day it renders nothing.
 */
@Component({
  imports: [Icon],
  selector: 'app-seasonal-row',
  styleUrl: './seasonal-row.css',
  templateUrl: './seasonal-row.html',
})
export class SeasonalRow {
  private readonly state = inject(CampaignState);
  private readonly progress = inject(DayProgress);
  protected readonly saving = signal(false);

  protected readonly days = computed(() => getSeasonalDays(this.state.today()));
  protected readonly done = computed(() => this.progress.isDone(ITEM));

  protected async toggle(): Promise<void> {
    this.saving.set(true);
    try {
      await this.progress.setDone(this.state.today(), ITEM, !this.done());
    } catch {
      // The row stays as it was; the tap can be tried again.
    } finally {
      this.saving.set(false);
    }
  }
}
