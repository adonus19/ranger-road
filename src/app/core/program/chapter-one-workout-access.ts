import type { LocalDate } from '../domain/models';
import { getChapterOneDay } from './campaign';
import { getWorkoutChoices, isWorkoutPlanned } from './chapter-orders';

/** Chapter I's workout choices for a date, without trial history. Restoration is also open as needed. */
export function chapterOneWorkoutsForDate(startDate: LocalDate, date: LocalDate): string[] {
  const day = getChapterOneDay(startDate, date);
  return day ? getWorkoutChoices(day) : [];
}

export function chapterOneWorkoutIsPlanned(
  startDate: LocalDate,
  date: LocalDate,
  workoutId: string,
): boolean {
  const day = getChapterOneDay(startDate, date);
  return day ? isWorkoutPlanned(day, workoutId) : false;
}
