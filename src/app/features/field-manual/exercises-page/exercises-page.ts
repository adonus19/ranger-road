import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getExerciseGuide } from '../../../core/program/exercise-guides';
import { chapterOneWorkoutWeekNote } from '../../../core/program/chapter-one-workouts';
import { getChapterOneSessions } from '../../../core/program/field-manual';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** Chapter I's sessions with their documented doses; each movement opens its full guide. */
@Component({
  selector: 'app-exercises-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './exercises-page.html',
})
export class ExercisesPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly sessions = getChapterOneSessions().map((session) => ({
    ...session,
    movements: session.movements.map((movement) => ({
      ...movement,
      name: getExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId,
    })),
  }));

  protected readonly week = this.weekState.week;

  /** Sessions the current week calls for; the warm-up comes with either Forge day. */
  protected readonly thisWeek = computed(() => {
    const ids = new Set<string>(this.week().sessions.map((session) => session.id));
    if (ids.has('chapter-1-forge-a') || ids.has('chapter-1-forge-b')) ids.add('warm-up');
    return ids;
  });

  protected weekNote(sessionId: string): string | undefined {
    const week = this.week();
    return week.stage === 'week' && this.thisWeek().has(sessionId)
      ? chapterOneWorkoutWeekNote(sessionId, week.contentWeek)
      : undefined;
  }

  ngOnInit(): void {
    void this.weekState.load();
  }
}
