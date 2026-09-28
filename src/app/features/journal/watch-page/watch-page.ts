import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { JournalEntry } from '../../../core/domain/models';
import { getChapterOneContentForDate } from '../../../core/program/chapter-one-missions';
import { CampaignState } from '../../../core/state/campaign-state';
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
  protected readonly today = this.campaignState.today;
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
  private shownDate = this.today();
  private needsRolloverReview = false;

  constructor() {
    effect(() => {
      const date = this.today();
      untracked(() => {
        if (date === this.shownDate) return;
        const wasSaved = !!this.saved();
        this.shownDate = date;
        this.saved.set(null);
        if (wasSaved) {
          this.morningForm().reset({ familyNeed: '' });
          this.eveningForm().reset({ win: '', missedStandard: '', gratitude: '', tomorrow: '' });
        }
        this.needsRolloverReview =
          !wasSaved &&
          (!!this.morningModel().familyNeed.trim() ||
            Object.values(this.eveningModel()).some((answer) => !!answer.trim()));
        this.saveError.set(
          this.needsRolloverReview
            ? 'A new day started. Review this entry before saving it for today.'
            : null,
        );
      });
    });
  }

  ngOnInit(): void {
    void this.campaignState.initialize();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const kind = this.kind();
    if (!kind || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const date = this.today();
      await this.campaignState.initialize();
      if (date !== this.today()) {
        this.saveError.set('A new day started. Review this entry before saving it for today.');
        return;
      }
      if (this.needsRolloverReview) {
        this.needsRolloverReview = false;
        this.saveError.set('Review the date and entry, then press Save again.');
        return;
      }
      this.saveError.set(null);
      if (kind === 'morning') {
        await submit(this.morningForm, async () => {
          const saved = await this.store.saveMorning(date, this.morningModel().familyNeed);
          if (date === this.today()) this.saved.set(saved);
        });
      } else {
        await submit(this.eveningForm, async () => {
          const saved = await this.store.saveEvening(date, this.eveningModel());
          if (date === this.today()) this.saved.set(saved);
        });
      }
      if (!this.saved() && kind === 'evening' && date === this.today()) {
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
