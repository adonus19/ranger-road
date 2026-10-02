import type { ChapterDefinition, WorkoutDefinition } from '../domain/models';
import type { ChapterProgram, ChapterSeed } from './chapter-program';
import { chapterOneProgram } from './chapter-one.program';

export type { ChapterProgram, ChapterSeed } from './chapter-program';

/**
 * Chapters whose dated orders are in the app, in campaign order. A chapter is added here
 * once its content is built; until then the previous chapter shows as complete.
 */
export const chapterPrograms: readonly ChapterProgram[] = [chapterOneProgram];

export function loadChapterSeed(chapterId: string): ChapterSeed | undefined {
  return loadChapterProgram(chapterId);
}

export function loadChapterProgram(chapterId: string): ChapterProgram | undefined {
  return chapterPrograms.find((program) => program.chapter.id === chapterId);
}

/** A fresh definition can be snapped into history without exposing the seed to mutation. */
export function loadWorkout(id: string): WorkoutDefinition | undefined {
  for (const program of chapterPrograms) {
    const definition = program.workouts.find((workout) => workout.id === id);
    if (definition) return structuredClone(definition);
  }
  return undefined;
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
