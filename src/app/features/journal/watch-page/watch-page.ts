import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { JournalEntry } from '../../../core/domain/models';
import { getChapterOneContentForDate } from '../../../core/program/chapter-one-missions';
import { CampaignState } from '../../../core/state/campaign-state';
import { localDateToday } from '../../../core/state/campaign-state';
import { Icon } from '../../../shared/icon/icon';
import {
  EVENING_PROMPTS,
  JournalStore,
  MORNING_PROMPT,
  formatJournalDate,
  type EveningAnswers,
  type WatchKind,
} from '../journal-store';

@Component({
  selector: 'app-watch-page',
  imports: [FormField, Icon, RouterLink],
  templateUrl: './watch-page.html',
  styleUrl: './watch-page.css',
})
export class WatchPage implements OnInit {
  private readonly store = inject(JournalStore);
  private readonly route = inject(ActivatedRoute);
  private readonly campaignState = inject(CampaignState);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly kind = computed<WatchKind | null>(() => {
    const value = this.params().get('watch');
    return value === 'morning' || value === 'evening' ? value : null;
  });
  protected readonly today = signal(localDateToday());
  protected readonly dateLabel = computed(() => formatJournalDate(this.today()));
  protected readonly dailyContent = computed(() => {
    const campaign = this.campaignState.campaign();
    return campaign?.currentChapterId === 'chapter-1'
      ? getChapterOneContentForDate(campaign.startDate, this.today())
      : undefined;
  });
  protected readonly morningPrompt = MORNING_PROMPT;
  protected readonly eveningPrompts = EVENING_PROMPTS;
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal<JournalEntry | null>(null);

  protected readonly morningModel = signal({ familyNeed: '' });
  protected readonly morningForm = form(this.morningModel, (field) => {
    validate(field.familyNeed, ({ value }) =>
      value().trim()
        ? undefined
        : { kind: 'required', message: 'Write a short answer before saving.' },
    );
  });

  protected readonly eveningModel = signal<EveningAnswers>({
    win: '',
    missedStandard: '',
    gratitude: '',
    tomorrow: '',
  });
  protected readonly eveningForm = form(this.eveningModel, (field) => {
    validate(field, ({ value }) =>
      Object.values(value()).some((answer) => answer.trim())
        ? undefined
        : { kind: 'required', message: 'Write at least one line before saving.' },
    );
  });

  ngOnInit(): void {
    void this.campaignState.initialize();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const kind = this.kind();
    if (!kind || this.saving()) {
      return;
    }
    this.today.set(localDateToday());
    this.saveError.set(null);
    this.saving.set(true);
    try {
      if (kind === 'morning') {
        await submit(this.morningForm, async () => {
          this.saved.set(
            await this.store.saveMorning(this.today(), this.morningModel().familyNeed),
          );
        });
      } else {
        await submit(this.eveningForm, async () => {
          this.saved.set(await this.store.saveEvening(this.today(), this.eveningModel()));
        });
      }
      if (!this.saved() && kind === 'evening') {
        this.saveError.set('Write at least one line before saving.');
      }
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'Your entry could not be saved. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
