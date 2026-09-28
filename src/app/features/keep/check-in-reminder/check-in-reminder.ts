import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { Icon } from '../../../shared/icon/icon';
import { describeCheckIn } from '../../journal/check-in-overview';

/** A quiet row on Keep while a check-in, or the tests a Red day held, waits. */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-check-in-reminder',
  styleUrl: './check-in-reminder.css',
  templateUrl: './check-in-reminder.html',
})
export class CheckInReminder implements OnInit {
  private readonly state = inject(CampaignState);
  private readonly history = inject(MeasurementHistory);
  private readonly entries = signal<SavedMeasurement[] | null>(null);

  protected readonly overview = computed(() => {
    const campaign = this.state.campaign();
    const entries = this.entries();
    if (!campaign || !entries) {
      return null;
    }
    const overview = describeCheckIn(
      campaign.startDate,
      this.state.today(),
      entries,
      this.state.readiness()?.status,
    );
    return overview?.reminder ? overview : null;
  });

  /** Opened from here, the check-in's way back returns to Keep. */
  protected readonly queryParams = computed(() => ({
    from: 'keep',
    ...this.overview()?.queryParams,
  }));

  async ngOnInit(): Promise<void> {
    try {
      this.entries.set(await this.history.all());
    } catch {
      // Without measurements the reminder stays hidden; Journal still offers the check-in.
    }
  }
}
