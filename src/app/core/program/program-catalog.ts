import type { ChapterDefinition, TrialDefinition } from '../domain/models';
import { chapterOneSeed, type WeeklyMissionSlot } from './chapter-one.seed';

/** Program content is kept separate from screens and historical user records. */
export interface ChapterSeed {
  chapter: ChapterDefinition;
  trial: TrialDefinition;
  weeklyRhythm: readonly WeeklyMissionSlot[];
  faithThemes: readonly string[];
  leadership: readonly string[];
  fieldcraft: readonly string[];
}

const chapters: ReadonlyMap<string, ChapterSeed> = new Map([
  [chapterOneSeed.chapter.id, chapterOneSeed],
]);

export function loadChapterSeed(chapterId: string): ChapterSeed | undefined {
  return chapters.get(chapterId);
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;

/** "Chapter I · Weeks 1–4", built from the chapter definition rather than typed per screen. */
export function formatChapterLine(chapter: ChapterDefinition): string {
  return `Chapter ${ROMAN_NUMERALS[chapter.number - 1]} · Weeks ${chapter.weeks[0]}–${chapter.weeks.at(-1)}`;
}
