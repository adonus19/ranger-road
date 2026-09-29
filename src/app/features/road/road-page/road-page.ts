import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrialCircuitMovement, TrialResult } from '../../../core/domain/models';
import {
  addDays,
  getCampaignDay,
  getChapterOneLeadInDays,
  getGateTrialPlannedDay,
  getGateTrialTargetDate,
  getNextGateTrialAttempt,
} from '../../../core/program/campaign';
import { getChapterOneExerciseGuide } from '../../../core/program/chapter-one-exercise-guides';
import {
  getChapterOneTrialPass,
  getChapterTwoStartDate,
  isChapterOneComplete,
} from '../../../core/program/chapter-one-completion';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { formatChapterLine, loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { TrialHistory } from '../../../core/state/trial-history';
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
  private readonly trialHistory = inject(TrialHistory);

  protected readonly walks = signal<SavedRoadSession[]>([]);
  protected readonly walksLoading = signal(true);
  protected readonly walksError = signal(false);
  protected readonly trialHistoryLoading = signal(true);
  protected readonly trialHistoryError = signal(false);
  private readonly completedTrials = signal<TrialResult[]>([]);
  protected readonly chapterComplete = computed(() =>
    isChapterOneComplete(this.state.campaign(), this.state.today(), this.completedTrials()),
  );
  protected readonly trialPass = computed(() =>
    getChapterOneTrialPass(this.state.campaign(), this.completedTrials()),
  );
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

  /** The route ends at the first Gate Trial attempt, the Monday after Week 4. */
  protected readonly targetDay = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getGateTrialPlannedDay(campaign.startDate) : 29;
  });

  protected readonly startLabel = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? `Day 1 · ${formatLongDate(campaign.startDate)}` : '';
  });

  /** Where the Gate Trial stands: its first attempt, the next one, or the pass. */
  protected readonly trialTarget = computed(() => {
    const pass = this.trialPass();
    if (pass && this.chapterComplete()) {
      return `Chapter I complete. You passed the Gate Trial on ${formatLongDate(pass.date)}.`;
    }
    const campaign = this.state.campaign();
    if (pass && campaign) {
      const chapterTwo = getChapterTwoStartDate(campaign, this.completedTrials()) ?? pass.date;
      return `Passed ${formatLongDate(pass.date)}. Chapter II begins ${formatLongDate(chapterTwo)}.`;
    }
    if (!campaign) {
      return 'First attempt on the Monday after Week 4. Chapter II waits until you pass.';
    }
    const today = this.state.today();
    const first = getGateTrialTargetDate(campaign.startDate);
    // Civil dates in YYYY-MM-DD form compare correctly as strings.
    if (today < first) {
      return `First attempt ${formatLongDate(first)}, the Monday after Week 4. If it doesn’t go, try again that Thursday. Chapter II waits until you pass.`;
    }
    const next = getNextGateTrialAttempt(campaign.startDate, today);
    if (next === today) {
      const after = getNextGateTrialAttempt(campaign.startDate, addDays(today, 1));
      return `Today is an attempt day. If it doesn’t go, the next is ${formatLongDate(after)}.`;
    }
    return `Next attempt ${formatLongDate(next)}. Chapter II waits until you pass.`;
  });

  ngOnInit(): void {
    void this.state.initialize();
    void this.loadWalks();
    void this.loadTrialHistory();
  }

  protected async loadTrialHistory(): Promise<void> {
    this.trialHistoryLoading.set(true);
    this.trialHistoryError.set(false);
    try {
      await this.state.initialize();
      if (!this.state.campaign()) return;
      this.completedTrials.set(await this.trialHistory.forTrial(chapterOneDefinition.trialId));
    } catch {
      this.trialHistoryError.set(true);
    } finally {
      this.trialHistoryLoading.set(false);
    }
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
