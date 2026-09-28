import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrialCircuitMovement } from '../../../core/domain/models';
import {
  getCampaignDay,
  getChapterOneLeadInDays,
  getChapterOneTargetDay,
  getGateTrialTargetDate,
} from '../../../core/program/campaign';
import { getChapterOneExerciseGuide } from '../../../core/program/chapter-one-exercise-guides';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { formatChapterLine, loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { formatLongDate, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { roadSessionParts } from '../road-session-summary';
import { RouteChart } from '../route-chart/route-chart';

@Component({
  selector: 'app-road-page',
  imports: [Icon, RouteChart, RouterLink],
  templateUrl: './road-page.html',
  styleUrl: './road-page.css',
})
export class RoadPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(RoadHistory);

  protected readonly walks = signal<SavedRoadSession[]>([]);
  protected readonly walksLoading = signal(true);
  protected readonly walksError = signal(false);
  protected readonly walkParts = roadSessionParts;
  protected readonly walkDate = formatShortDate;

  protected circuitMovementLabel(movement: TrialCircuitMovement): string {
    const name = getChapterOneExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId;
    const dose =
      movement.reps !== undefined ? `${movement.reps} reps` : `${movement.durationSeconds} seconds`;
    return `${name} · ${dose}${movement.perSide ? ' per side' : ''}`;
  }

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

  protected readonly leadInDays = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getChapterOneLeadInDays(campaign.startDate) : 0;
  });

  protected readonly targetDay = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getChapterOneTargetDay(campaign.startDate) : 28;
  });

  /** A custom trial date stays in the card; the chart still ends after four full weeks. */
  protected readonly chartTargetLabel = computed(() => {
    const campaign = this.state.campaign();
    return campaign &&
      campaign.trialTargetDate &&
      campaign.trialTargetDate !== getGateTrialTargetDate(campaign.startDate)
      ? 'End of Week 4'
      : 'Gate Trial';
  });

  protected readonly startLabel = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? `Day 1 · ${formatLongDate(campaign.startDate)}` : '';
  });

  protected readonly trialTarget = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign) {
      return 'Planned for the end of Week 4. You can take it when ready.';
    }
    const defaultTarget = getGateTrialTargetDate(campaign.startDate);
    const target = campaign.trialTargetDate ?? defaultTarget;
    if (target !== defaultTarget) {
      return this.state.today() > target
        ? `Your Gate Trial target was ${formatLongDate(target)}. You can take it when ready.`
        : `Your Gate Trial target is ${formatLongDate(target)}. You can take it when ready.`;
    }
    // Civil dates in YYYY-MM-DD form compare correctly as strings.
    return this.state.today() > target
      ? `The Week 4 target was ${formatLongDate(target)}. You can take the Gate Trial when ready.`
      : `Planned for the end of Week 4, ${formatLongDate(target)}. You can take it when ready.`;
  });

  ngOnInit(): void {
    void this.state.initialize();
    void this.loadWalks();
  }

  protected async loadWalks(): Promise<void> {
    this.walksLoading.set(true);
    this.walksError.set(false);
    try {
      this.walks.set(await this.history.recent(3));
    } catch {
      this.walksError.set(true);
    } finally {
      this.walksLoading.set(false);
    }
  }
}
