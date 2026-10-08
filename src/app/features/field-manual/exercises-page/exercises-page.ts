import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getExerciseGuide } from '../../../core/program/exercise-guides';
import { getChapterSessions, orderedPrograms, warmupId } from '../../../core/program/field-manual';
import { formatChapterNumeral } from '../../../core/program/program-catalog';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** Each chapter's sessions with their documented doses; each movement opens its full guide. */
@Component({
  selector: 'app-exercises-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './exercises-page.html',
})
export class ExercisesPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly week = this.weekState.week;

  /** The chapter the campaign is in first, then the others in order. */
  protected readonly chapters = computed(() =>
    orderedPrograms(this.week().chapter).map((program) => ({
      program,
      numeral: formatChapterNumeral(program.chapter.number),
      name: program.chapter.name,
      sessions: getChapterSessions(program).map((session) => ({
        ...session,
        movements: session.movements.map((movement) => ({
          ...movement,
          name: getExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId,
        })),
      })),
    })),
  );

  /** Sessions the current week calls for; the warm-up comes with either Forge day. */
  protected readonly thisWeek = computed(() => {
    const week = this.week();
    const program = orderedPrograms(week.chapter)[0];
    const ids = new Set<string>(week.sessions.map((session) => session.id));
    const [forgeA, forgeB] = program.workouts;
    if (ids.has(forgeA.id) || ids.has(forgeB.id)) ids.add(warmupId(program));
    return ids;
  });

  /** The week's adjustment to a session, shown only for the chapter the campaign is in. */
  protected weekNote(chapter: number, sessionId: string): string | undefined {
    const week = this.week();
    if (week.stage !== 'week' || week.chapter !== chapter || !this.thisWeek().has(sessionId)) {
      return undefined;
    }
    const program = orderedPrograms(chapter)[0];
    return program.workouts.some((workout) => workout.id === sessionId)
      ? program.workoutPlan(sessionId, week.contentWeek).note
      : undefined;
  }

  protected current(chapter: number, sessionId: string): boolean {
    return this.week().chapter === chapter && this.thisWeek().has(sessionId);
  }

  ngOnInit(): void {
    void this.weekState.load();
  }
}
