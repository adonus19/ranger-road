import { Component, computed, inject, input } from '@angular/core';
import {
  getCampaignDay,
  getChapterOneSchedule,
  getDaysUntil,
  getDaysUntilGateTrial,
  getGateTrialTargetDate,
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
  /** A completed Gate Trial is saved, possibly before the four weeks end. */
  readonly trialDone = input(false);

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

  /** The Week 4 Saturday order by default; an older campaign may keep a date of its own. */
  protected readonly trialNote = computed(() => {
    const campaign = this.state.campaign();
    const target = campaign?.trialTargetDate;
    return campaign && target && target !== getGateTrialTargetDate(campaign.startDate)
      ? `Gate Trial target: ${formatShortDate(target)}. You can take it when ready.`
      : 'Gate Trial: Saturday of Week 4. You can take it when ready.';
  });

  protected readonly daysUntilTrial = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? getDaysUntilGateTrial(campaign.startDate, this.state.today(), campaign.trialTargetDate)
      : 0;
  });
}
