import type { LocalDate } from '../domain/models';
import { getChapterOneActivityChoicesForDate } from './chapter-one-missions';
import { chapterOneRestoration, loadChapterOneWorkout } from './chapter-one-workouts';

/** Workout choices in the dated order. Restoration is also available as needed. */
export function chapterOneWorkoutsForDate(startDate: LocalDate, date: LocalDate): string[] {
  const choices = getChapterOneActivityChoicesForDate(startDate, date);
  if (!choices.length) return [];
  const ids = choices.flatMap((choice) => choice.contentReferences);
  ids.push(chapterOneRestoration.id);
  return [...new Set(ids)].filter((id) => Boolean(loadChapterOneWorkout(id)));
}

export function chapterOneWorkoutIsPlanned(
  startDate: LocalDate,
  date: LocalDate,
  workoutId: string,
): boolean {
  return getChapterOneActivityChoicesForDate(startDate, date).some((choice) =>
    choice.contentReferences.includes(workoutId),
  );
}
