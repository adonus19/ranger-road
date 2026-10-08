import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrialCircuitMovement, TrialResult } from '../../../core/domain/models';
import { addDays, daysBetween } from '../../../core/program/calendar';
import {
  getChapterDay,
  getNextAttempt,
  resolveCampaignPosition,
} from '../../../core/program/campaign-position';
import { getExerciseGuide } from '../../../core/program/exercise-guides';
import {
  chapterPrograms,
  formatChapterLine,
  formatChapterNumeral,
} from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
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
  protected readonly walkParts = roadSessionParts;
  protected readonly walkDate = formatShortDate;

  protected circuitMovementLabel(movement: TrialCircuitMovement): string {
    const name = getExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId;
    const dose =
      movement.reps !== undefined ? `${movement.reps} reps` : `${movement.durationSeconds} seconds`;
    return `${name} · ${dose}${movement.perSide ? ' per side' : ''}`;
  }

  /** Today's place in the campaign, from Day 1 on; null before it or without a campaign. */
  private readonly position = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? resolveCampaignPosition(campaign.startDate, this.state.today(), this.completedTrials())
      : null;
  });

  /** Today's chapter; before Day 1 the road still shows the first chapter, as planned. */
  protected readonly chapterDay = computed(() => {
    const campaign = this.state.campaign();
    return (
      this.position()?.chapter ??
      (campaign
        ? getChapterDay(chapterPrograms[0], campaign.startDate, campaign.startDate, 1)
        : null)
    );
  });
  protected readonly program = computed(() => this.chapterDay()?.program ?? chapterPrograms[0]);
  protected readonly seed = this.program;

  protected readonly chapterLine = computed(() => formatChapterLine(this.program().chapter));
  protected readonly chapterNumeral = computed(() =>
    formatChapterNumeral(this.program().chapter.number),
  );
  protected readonly chapterComplete = computed(() => !!this.position()?.awaitingNextChapter);
  protected readonly trialPass = computed(() => this.chapterDay()?.pass);

  /** Chapter I leads in from Day 1; a later chapter's route begins on its first Monday. */
  private readonly routeOrigin = computed(() => {
    const chapter = this.chapterDay();
    return chapter ? (chapter.program.leadsIn ? chapter.start : chapter.firstMonday) : null;
  });

  /** The chapter's day count along the route, or 0 before Day 1. */
  protected readonly campaignDay = computed(() => {
    const origin = this.routeOrigin();
    if (!origin || !this.position()) return 0;
    return daysBetween(origin, this.state.today()) + 1;
  });

  protected readonly leadInDays = computed(() => {
    const chapter = this.chapterDay();
    return chapter?.program.leadsIn ? daysBetween(chapter.start, chapter.firstMonday) : 0;
  });

  /** The route ends at the first trial attempt, the Monday after the chapter's last week. */
  protected readonly targetDay = computed(() => {
    const origin = this.routeOrigin();
    const chapter = this.chapterDay();
    return origin && chapter ? daysBetween(origin, chapter.firstAttempt) + 1 : 29;
  });

  protected readonly startLabel = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? `Day 1 · ${formatLongDate(campaign.startDate)}` : '';
  });

  /** Where the chapter's trial stands: its first attempt, the next one, or the pass. */
  protected readonly trialTarget = computed(() => {
    const program = this.program();
    const trial = program.trialName;
    const nextChapter = `Chapter ${formatChapterNumeral(program.chapter.number + 1)}`;
    const chapter = this.chapterDay();
    const pass = chapter?.pass;
    if (pass && this.chapterComplete()) {
      return `Chapter ${this.chapterNumeral()} complete. You passed the ${trial} on ${formatLongDate(pass.date)}.`;
    }
    if (pass && chapter?.nextStart) {
      return `Passed ${formatLongDate(pass.date)}. ${nextChapter} begins ${formatLongDate(chapter.nextStart)}.`;
    }
    if (!chapter) {
      return `First attempt on the Monday after Week ${program.chapter.weeks.at(-1)}. ${nextChapter} waits until you pass.`;
    }
    const today = this.state.today();
    // Civil dates in YYYY-MM-DD form compare correctly as strings.
    if (today < chapter.firstAttempt) {
      return `First attempt ${formatLongDate(chapter.firstAttempt)}, the Monday after Week ${program.chapter.weeks.at(-1)}. If it doesn’t go, try again that Thursday. ${nextChapter} waits until you pass.`;
    }
    const next = getNextAttempt(chapter, today);
    if (next === today) {
      const after = getNextAttempt(chapter, addDays(today, 1));
      return `Today is an attempt day. If it doesn’t go, the next is ${formatLongDate(after)}.`;
    }
    return `Next attempt ${formatLongDate(next)}. ${nextChapter} waits until you pass.`;
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
      this.completedTrials.set(await loadCampaignTrials(this.trialHistory));
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
