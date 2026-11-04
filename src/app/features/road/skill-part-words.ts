import type { TrialSkillPartResult } from '../../core/domain/models';
import { getExerciseGuide } from '../../core/program/exercise-guides';

/** An exercise's name from its guide, for skill parts in a trial. */
export function exerciseName(id: string | undefined): string {
  return (id && getExerciseGuide(id)?.name) || 'this step';
}

/** A recorded skill part in plain words (UX_SPEC.md, Skill parts in a trial). */
export function skillOutcomeWords(result: TrialSkillPartResult | undefined): string {
  switch (result?.outcome) {
    case 'demonstrated':
      return 'Demonstrated';
    case 'step-below':
      return `Demonstrated the step below (${exerciseName(result.exerciseIdDone)})`;
    case 'set-aside-for-pain':
      return 'Set aside for pain';
    default:
      return 'Not recorded';
  }
}
