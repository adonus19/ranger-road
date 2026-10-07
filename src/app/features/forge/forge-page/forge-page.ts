import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TrialResult, WorkoutDraft, WorkoutSession } from '../../../core/domain/models';
import { resolveCampaignPosition } from '../../../core/program/campaign-position';
import { getWorkoutChoices, isWorkoutPlanned } from '../../../core/program/chapter-orders';
import {
  chapterPrograms,
  formatChapterNumeral,
  isRestorationWorkout,
  loadWorkout,
} from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { formatShortDate } from '../../../shared/format-date';

@Component({
  selector: 'app-forge-page',
  imports: [RouterLink],
  templateUrl: './forge-page.html',
  styleUrl: './forge-page.css',
})
export class ForgePage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(WorkoutHistory);
  private readonly trialHistory = inject(TrialHistory);
  private readonly schedule = inject(ScheduleHistory);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<WorkoutDraft | null>(null);
  protected readonly sessions = signal<WorkoutSession[]>([]);
  private readonly completedTrials = signal<TrialResult[]>([]);
  /** Today's chapter and week, from Day 1 and the saved trial passes. */
  private readonly position = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? resolveCampaignPosition(campaign.startDate, this.state.today(), this.completedTrials())
      : null;
  });
  /** Today's chapter; Chapter I before Day 1. */
  protected readonly program = computed(
    () => this.position()?.chapter.program ?? chapterPrograms[0],
  );
  protected readonly chapterComplete = computed(() => !!this.position()?.awaitingNextChapter);
  protected readonly numeral = formatChapterNumeral;
  protected readonly shortDate = formatShortDate;
  protected readonly isRestoration = isRestorationWorkout;

  protected readonly choices = computed(() => {
    const campaign = this.state.campaign();
    const today = this.state.today();
    // Today's orders, including a Forge session moved here by a make-up.
    const chapter =
      campaign && this.position()
        ? this.schedule.dayFor(campaign.startDate, today, today, this.completedTrials())
        : null;
    if (!chapter) return [];
    return getWorkoutChoices(chapter).map((id) => ({
      id,
      title: loadWorkout(id)?.title ?? id,
      planned: isWorkoutPlanned(chapter, id),
    }));
  });

  protected readonly status = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check.status : null;
  });

  ngOnInit(): void {
    void this.load();
  }

  protected sessionTitle(session: WorkoutSession): string {
    return (
      session.definitionSnapshot?.title ??
      loadWorkout(session.workoutDefinitionId)?.title ??
      'Workout'
    );
  }

  protected canOpen(id: string): boolean {
    return Boolean(this.status()) && (this.status() !== 'red' || isRestorationWorkout(id));
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const [active, sessions, completedTrials] = await Promise.all([
        this.history.active(),
        this.history.forDate(this.state.today()),
        loadCampaignTrials(this.trialHistory),
        this.schedule.refresh(),
      ]);
      this.active.set(active ?? null);
      this.sessions.set(sessions);
      this.completedTrials.set(completedTrials);
    } catch {
      this.error.set(
        'Local workout history is unavailable. Check browser storage settings, then try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
