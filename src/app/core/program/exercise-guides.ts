import {
  getChapterOneExerciseGuide,
  listChapterOneExerciseGuides,
  type ExerciseGuideContent,
} from './chapter-one-exercise-guides';
import { getChapterOneQuickHelpSteps } from './chapter-one-quick-help';
import { chapterTwoExerciseGuides, chapterTwoQuickHelpSteps } from './chapter-two-exercise-guides';

export type { ExerciseGuideContent } from './chapter-one-exercise-guides';

const chapterTwoById = new Map(chapterTwoExerciseGuides.map((guide) => [guide.id, guide]));

/** Every chapter's written guide by exercise ID, as a copy callers may change. */
export function getExerciseGuide(id: string): ExerciseGuideContent | undefined {
  const later = chapterTwoById.get(id);
  return later ? structuredClone(later) : getChapterOneExerciseGuide(id);
}

export function listExerciseGuides(): ExerciseGuideContent[] {
  return [...listChapterOneExerciseGuides(), ...structuredClone([...chapterTwoExerciseGuides])];
}

/** Three to five short steps for the active-workout Quick Help. */
export function getQuickHelpSteps(id: string): string[] | undefined {
  const later = chapterTwoQuickHelpSteps[id];
  return later ? [...later] : getChapterOneQuickHelpSteps(id);
}
