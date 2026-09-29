import { Component, computed, inject, input } from '@angular/core';
import type { LocalDate } from '../../../core/domain/models';
import {
  addDays,
  getCampaignDay,
  getChapterOneSchedule,
  getDaysUntil,
  getDaysUntilGateTrial,
  getGateTrialTargetDate,
  getNextGateTrialAttempt,
} from '../../../core/program/campaign';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { formatChapterLine, loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { formatShortDate } from '../../../shared/format-date';

/** The painted forest band at the top of Keep: the chapter, its theme, and the two counts. */
@Component({
  selector: 'app-keep-band',
  templateUrl: './keep-band.html',
  styleUrl: './keep-band.css',
})
export class KeepBand {
  protected readonly state = inject(CampaignState);
  readonly chapterComplete = input(false);
  /** The day the Gate Trial was passed, once it has been. */
  readonly trialPassedOn = input<LocalDate | null>(null);
  /** Chapter II's first day, once the Gate Trial is passed. */
  readonly chapterTwoStart = input<LocalDate | null>(null);

  protected readonly shortDate = formatShortDate;

  /** Before a campaign exists, the band still introduces the first chapter. */
  protected readonly seed = computed(() =>
    loadChapterSeed(this.state.campaign()?.currentChapterId ?? chapterOneDefinition.id),
  );

  protected readonly chapterLine = computed(() => {
    const chapter = this.seed()?.chapter;
    return chapter ? formatChapterLine(chapter) : '';
  });

  protected readonly campaignDay = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getCampaignDay(campaign.startDate, this.state.today()) : 0;
  });

  protected readonly isLeadIn = computed(() => {
    const campaign = this.state.campaign();
    return !!campaign && getChapterOneSchedule(campaign.startDate, this.state.today())?.week === 0;
  });

  protected readonly daysUntilStart = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getDaysUntil(campaign.startDate, this.state.today()) : 0;
  });

  /** Where the Gate Trial stands while it waits to be passed. */
  protected readonly trialNote = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign) return '';
    const today = this.state.today();
    if (today < getGateTrialTargetDate(campaign.startDate)) {
      return 'Gate Trial on the Monday after Week 4. If it doesn’t go, try again Thursday.';
    }
    const next = getNextGateTrialAttempt(campaign.startDate, today);
    if (next !== today) return `Next Gate Trial attempt: ${formatShortDate(next)}.`;
    const after = getNextGateTrialAttempt(campaign.startDate, addDays(today, 1));
    return `Gate Trial today if you’re Green; otherwise ${formatShortDate(after)}.`;
  });

  protected readonly daysUntilTrial = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getDaysUntilGateTrial(campaign.startDate, this.state.today()) : 0;
  });
}
