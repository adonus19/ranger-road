import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  addDays,
  getCampaignDay,
  getDaysUntil,
  getDaysUntilGateTrial,
} from '../../../core/program/campaign';
import {
  getNextAttempt,
  isTrialAvailable,
  type CampaignPosition,
} from '../../../core/program/campaign-position';
import {
  chapterPrograms,
  formatChapterLine,
  formatChapterNumeral,
} from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { formatShortDate } from '../../../shared/format-date';

/** The painted forest band at the top of Keep: the chapter, its theme, and the two counts. */
@Component({
  selector: 'app-keep-band',
  imports: [RouterLink],
  templateUrl: './keep-band.html',
  styleUrl: './keep-band.css',
})
export class KeepBand {
  protected readonly state = inject(CampaignState);
  /** Today's place in the campaign, once Day 1 has arrived and trial history is read. */
  readonly position = input<CampaignPosition | null>(null);

  protected readonly shortDate = formatShortDate;

  /** Today's chapter; before Day 1 the band still introduces the first chapter. */
  protected readonly program = computed(
    () => this.position()?.chapter.program ?? chapterPrograms[0],
  );
  protected readonly chapterLine = computed(() => formatChapterLine(this.program().chapter));
  protected readonly chapterNumeral = computed(() =>
    formatChapterNumeral(this.program().chapter.number),
  );
  protected readonly nextChapterNumeral = computed(() =>
    formatChapterNumeral(this.program().chapter.number + 1),
  );
  protected readonly chapterComplete = computed(() => !!this.position()?.awaitingNextChapter);
  /** The day the chapter's trial was passed, once it has been. */
  protected readonly trialPassedOn = computed(() => this.position()?.chapter.pass?.date ?? null);
  protected readonly nextChapterStart = computed(() => this.position()?.chapter.nextStart ?? null);
  /** An any-day trial after its chapter's last week: no countdown, only "Open". */
  protected readonly trialAvailable = computed(() => {
    const chapter = this.position()?.chapter;
    return !!chapter && isTrialAvailable(chapter);
  });

  protected readonly campaignDay = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getCampaignDay(campaign.startDate, this.state.today()) : 0;
  });

  protected readonly isLeadIn = computed(() => !!this.position()?.chapter.leadIn);

  protected readonly daysUntilStart = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getDaysUntil(campaign.startDate, this.state.today()) : 0;
  });

  /** Where the trial stands while it waits to be passed. */
  protected readonly trialNote = computed(() => {
    if (!this.state.campaign()) return '';
    const program = this.program();
    const chapter = this.position()?.chapter;
    const today = this.state.today();
    return chapter && today >= chapter.firstAttempt
      ? [`${program.trialName} available any day you choose.`, program.trialDayNote]
          .filter(Boolean)
          .join(' ')
      : `${program.trialName} after Week ${program.chapter.weeks.at(-1)}, on any day you choose.`;
  });

  protected readonly daysUntilTrial = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign) return 0;
    const chapter = this.position()?.chapter;
    const today = this.state.today();
    // Before Day 1 there is no position yet; the count runs to the day the Gate Trial opens.
    return chapter
      ? getDaysUntil(getNextAttempt(chapter, today), today)
      : getDaysUntilGateTrial(campaign.startDate, today);
  });
}
