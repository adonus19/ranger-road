import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { CampaignState } from '../../../core/state/campaign-state';
import { formatLongDate } from '../../../shared/format-date';

/** Choosing Day 1 on first launch, and moving it while it is still ahead. */
@Component({
  selector: 'app-start-day',
  imports: [FormField],
  templateUrl: './start-day.html',
  styleUrl: './start-day.css',
})
export class StartDay {
  protected readonly state = inject(CampaignState);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly startDateLabel = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? formatLongDate(campaign.startDate) : '';
  });

  private readonly model = linkedSignal(() => ({
    startDate: this.state.campaign()?.startDate ?? this.state.today(),
  }));

  protected readonly startForm = form(this.model, (field) => {
    required(field.startDate, { message: 'Choose the date of Day 1.' });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await submit(this.startForm, async () => {
        await this.state.startCampaign(this.model().startDate);
        this.editing.set(false);
      });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Day 1 could not be saved. Try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
