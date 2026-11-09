import { Component, OnInit, computed, inject, signal } from '@angular/core';
import type { LocalDate } from '../../../core/domain/models';
import { highPointTellStatus, hikeFinishedOn } from '../../../core/domain/high-country-trial';
import { highCountryTrialDefinition } from '../../../core/program/chapter-three-trial.seed';
import { CampaignState } from '../../../core/state/campaign-state';
import { DayProgress } from '../../../core/state/day-progress';
import { TrialHistory } from '../../../core/state/trial-history';
import { Icon } from '../../../shared/icon/icon';

const ITEM = 'high-point-told';

/**
 * Week 12's Hearth part (d), after the High Country hike: "Tell your spouse your answer to the
 * high-point question." A quiet row with Done, undoable the same day; nothing is counted. The
 * Keep page shows it only while Chapter III is today's chapter.
 */
@Component({
  imports: [Icon],
  selector: 'app-high-point-reminder',
  styleUrl: './high-point-reminder.css',
  templateUrl: './high-point-reminder.html',
})
export class HighPointReminder implements OnInit {
  private readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  private readonly progress = inject(DayProgress);
  private readonly hikeDate = signal<LocalDate | null>(null);
  private readonly doneDates = signal<LocalDate[]>([]);
  protected readonly saving = signal(false);

  protected readonly status = computed(() =>
    highPointTellStatus(this.hikeDate(), this.state.today(), this.doneDates()),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async toggle(): Promise<void> {
    const today = this.state.today();
    const done = this.status() !== 'done-today';
    this.saving.set(true);
    try {
      await this.progress.setDone(today, ITEM, done);
      this.doneDates.update((dates) =>
        done ? [...dates, today] : dates.filter((date) => date !== today),
      );
    } catch {
      // The row stays as it was; the tap can be tried again.
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const [draft, results, checks] = await Promise.all([
        this.history.activeDraft(),
        this.history.forTrial(highCountryTrialDefinition.id),
        this.history.checksFor(ITEM),
      ]);
      this.hikeDate.set(hikeFinishedOn(draft, results));
      this.doneDates.set(checks.map((check) => check.date));
    } catch {
      // A courtesy row: without saved records it stays away.
    }
  }
}
