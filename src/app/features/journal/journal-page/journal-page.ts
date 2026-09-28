import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import type { JournalEntry } from '../../../core/domain/models';
import { CampaignState, localDateToday } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { describeCheckIn } from '../check-in-overview';
import { JournalStore, formatJournalDate, watchTitle } from '../journal-store';
import { weightAndWaist } from '../measurement-summary';

@Component({
  selector: 'app-journal-page',
  imports: [Icon, RouterLink],
  templateUrl: './journal-page.html',
  styleUrl: './journal-page.css',
})
export class JournalPage implements OnInit {
  private readonly store = inject(JournalStore);
  private readonly state = inject(CampaignState);
  private readonly measurements = inject(MeasurementHistory);
  private readonly measurementEntries = signal<SavedMeasurement[]>([]);
  protected readonly entries = signal<JournalEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showAll = signal(false);
  protected readonly visibleEntries = computed(() =>
    this.showAll() ? this.entries() : this.entries().slice(0, 8),
  );
  protected readonly today = localDateToday();
  protected readonly formatDate = formatJournalDate;
  protected readonly titleFor = watchTitle;

  /** Null before Day 1, when there is no check-in to take yet. */
  protected readonly checkIn = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? describeCheckIn(
          campaign.startDate,
          this.state.today(),
          this.measurementEntries(),
          this.state.readiness()?.status,
        )
      : null;
  });

  /** "Last: 221.6 lb · 41.5 in, Mon, Oct 12", from the latest entry with either. */
  protected readonly latestBody = computed(() => {
    const entry = this.measurementEntries()
      .filter((item) => item.weight !== undefined || item.waist !== undefined)
      .at(-1);
    if (!entry) {
      return null;
    }
    return `Last: ${weightAndWaist(entry).join(' · ')}, ${formatShortDate(entry.date)}`;
  });

  ngOnInit(): void {
    void this.load();
    void this.loadMeasurements();
  }

  protected hasWatchToday(type: 'morning-watch' | 'evening-watch'): boolean {
    return this.entries().some((entry) => entry.date === this.today && entry.type === type);
  }

  /** The measurement rows still open their screens if this read fails; they just say less. */
  private async loadMeasurements(): Promise<void> {
    try {
      await this.state.initialize();
      this.measurementEntries.set(await this.measurements.all());
    } catch {
      this.measurementEntries.set([]);
    }
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.entries.set(await this.store.listWatches());
    } catch {
      this.error.set(
        'Your entries could not be opened. Check browser storage settings, then try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
