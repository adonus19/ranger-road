import type { ChapterDefinition, LocalDate, WorkoutDefinition } from '../domain/models';
import { daysBetween } from './calendar';
import type { ChapterDay } from './campaign-position';
import type { ChapterProgram, ChapterSeed, ChapterWeekContent } from './chapter-program';
import { chapterOneProgram } from './chapter-one.program';
import { chapterTwoProgram } from './chapter-two.program';

export type { ChapterProgram, ChapterSeed } from './chapter-program';

/**
 * Chapters whose dated orders are in the app, in campaign order. A chapter is added here
 * once its content is built; until then the previous chapter shows as complete.
 */
export const chapterPrograms: readonly ChapterProgram[] = [chapterOneProgram, chapterTwoProgram];

export function loadChapterSeed(chapterId: string): ChapterSeed | undefined {
  return loadChapterProgram(chapterId);
}

export function loadChapterProgram(chapterId: string): ChapterProgram | undefined {
  return chapterPrograms.find((program) => program.chapter.id === chapterId);
}

/** A campaign week's content by its number: Week 6 is Chapter II's second week. */
export function getCampaignWeekContent(week: number): ChapterWeekContent | undefined {
  const program = chapterPrograms.find((item) => item.chapter.weeks.includes(week));
  return program?.weeks[week - program.chapter.weeks[0]];
}

/** A fresh definition can be snapped into history without exposing the seed to mutation. */
export function loadWorkout(id: string): WorkoutDefinition | undefined {
  for (const program of chapterPrograms) {
    const definition = program.workouts.find((workout) => workout.id === id);
    if (definition) return structuredClone(definition);
  }
  return undefined;
}

/**
 * A workout as written for a date's week: Forge C takes that week's curl. Without a chapter
 * day it is the definition as written.
 */
export function loadWorkoutOn(
  id: string,
  day: Pick<ChapterDay, 'program' | 'firstMonday'> | null,
  date: LocalDate,
): WorkoutDefinition | undefined {
  const definition = loadWorkout(id);
  if (!definition || !day?.program.workoutForWeek) return definition;
  if (!day.program.workouts.some((workout) => workout.id === id)) return definition;
  const weekIndex = Math.floor(daysBetween(day.firstMonday, date) / 7);
  return structuredClone(day.program.workoutForWeek(definition, weekIndex));
}

/** Restoration stays open as needed, and on a Red day. */
export function isRestorationWorkout(id: string): boolean {
  return chapterPrograms.some((program) => program.restorationId === id);
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;

/** "II" for Chapter 2. */
export function formatChapterNumeral(chapterNumber: number): string {
  return ROMAN_NUMERALS[chapterNumber - 1] ?? String(chapterNumber);
}

/** "Chapter I · Weeks 1–4", built from the chapter definition rather than typed per screen. */
export function formatChapterLine(chapter: ChapterDefinition): string {
  return `Chapter ${formatChapterNumeral(chapter.number)} · Weeks ${chapter.weeks[0]}–${chapter.weeks.at(-1)}`;
}
