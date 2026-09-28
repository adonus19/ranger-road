import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { WorkoutDraft, WorkoutSession } from '../../../core/domain/models';
import {
  chapterOneWorkoutsForDate,
  chapterOneWorkoutIsPlanned,
} from '../../../core/program/chapter-one-workout-access';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { loadChapterOneWorkout } from '../../../core/program/chapter-one-workouts';
import { CampaignState } from '../../../core/state/campaign-state';
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
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<WorkoutDraft | null>(null);
  protected readonly sessions = signal<WorkoutSession[]>([]);
  protected readonly shortDate = formatShortDate;

  protected readonly choices = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || campaign.currentChapterId !== chapterOneDefinition.id) return [];
    return chapterOneWorkoutsForDate(campaign.startDate, this.state.today()).map((id) => ({
      id,
      title: loadChapterOneWorkout(id)?.title ?? id,
      planned: chapterOneWorkoutIsPlanned(campaign.startDate, this.state.today(), id),
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
      loadChapterOneWorkout(session.workoutDefinitionId)?.title ??
      'Workout'
    );
  }

  protected canOpen(id: string): boolean {
    return Boolean(this.status()) && (this.status() !== 'red' || id === 'chapter-1-restoration');
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const [active, sessions] = await Promise.all([
        this.history.active(),
        this.history.forDate(this.state.today()),
      ]);
      this.active.set(active ?? null);
      this.sessions.set(sessions);
    } catch {
      this.error.set(
        'Local workout history is unavailable. Check browser storage settings, then try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
