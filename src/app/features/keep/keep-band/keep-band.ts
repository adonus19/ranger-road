import { Component, computed, inject } from '@angular/core';
import {
  getCampaignDay,
  getChapterOneSchedule,
  getDaysUntil,
  getDaysUntilGateTrial,
} from '../../../core/program/campaign';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { formatChapterLine, loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';

/** The painted forest band at the top of Keep: the chapter, its theme, and the two counts. */
@Component({
  selector: 'app-keep-band',
  templateUrl: './keep-band.html',
  styleUrl: './keep-band.css',
})
export class KeepBand {
  protected readonly state = inject(CampaignState);

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

  protected readonly daysUntilTrial = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? getDaysUntilGateTrial(campaign.startDate, this.state.today(), campaign.trialTargetDate)
      : 0;
  });
}
