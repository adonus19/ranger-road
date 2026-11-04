import type {
  DeepReadonly,
  ReadinessCheck,
  TrialDefinition,
  TrialSkillOutcome,
  TrialSkillPart,
  TrialSkillPartResult,
} from './models';
import { stepPasses, type StepPass, type TrackContext } from '../program/skill-track-progress';
import { chapterPrograms } from '../program/program-catalog';
import { SKILL_TRACKS, trackStepOf, type SkillTrack } from '../program/skill-tracks';

/**
 * Skill parts in trials (CHAPTERS_AND_TRIALS.md, Skill Parts in Trials). A track step first
 * passed during a chapter becomes a part of that chapter's trial; showing that step or the step
 * just below completes it, and on a pain-gated day it may be set aside for pain. The parts are
 * worked out from saved sessions when an attempt starts and copied into its snapshot, so later
 * passes never change a saved trial.
 */

export const SKILL_OUTCOMES: readonly TrialSkillOutcome[] = [
  'demonstrated',
  'step-below',
  'set-aside-for-pain',
];

/** Pain during the skill parts is saved under this phase ID. */
export const SKILL_PARTS_PHASE_ID = 'skill-parts';

/** The most sets a skill part records; every step's criteria ask for 3 or fewer. */
const MAX_SKILL_SETS = 10;

/**
 * The chapter whose trial a pass belongs to. A track adds trial parts only from the chapter its
 * Forge slot starts in, so a step passed before then (Chapter I's assisted pull-up and push-up,
 * whose Gate Trial had no skill parts) joins that first chapter's trial instead, once.
 */
export function trialChapterOfPass(track: SkillTrack, pass: StepPass): number | undefined {
  return pass.chapter === undefined ? undefined : Math.max(pass.chapter, track.firstChapter);
}

/** The skill parts for a chapter's trial, in track order and then step order. */
export function trialSkillParts(chapter: number, context: TrackContext): TrialSkillPart[] {
  return SKILL_TRACKS.flatMap((track) =>
    stepPasses(track, context)
      .filter((pass) => trialChapterOfPass(track, pass) === chapter)
      .map((pass): TrialSkillPart => {
        const index = track.steps.findIndex((step) => step.exerciseId === pass.exerciseId);
        const below = track.steps[index - 1];
        return {
          trackId: track.id,
          stepExerciseId: pass.exerciseId,
          ...(below ? { stepBelowExerciseId: below.exerciseId } : {}),
          passedOn: pass.date,
        };
      }),
  );
}

/** The skill parts for a trial by its ID; none for a trial not in the app. */
export function skillPartsForTrial(trialId: string, context: TrackContext): TrialSkillPart[] {
  const program = chapterPrograms.find((item) => item.trial.id === trialId);
  return program ? trialSkillParts(program.chapter.number, context) : [];
}

/** Whether today's check meets the step's own readiness gate, so the part may be set aside. */
export function stepPainGated(
  stepExerciseId: string,
  check: Pick<ReadinessCheck, 'neckPain' | 'shoulderPain'> | null | undefined,
): boolean {
  const found = trackStepOf(stepExerciseId);
  const gate = found?.track.steps[found.index].painGate;
  if (!gate || !check) return false;
  return gate.areas.some((area) => {
    const level = area === 'neck' ? check.neckPain : check.shoulderPain;
    return Number.isFinite(level) && level >= gate.atLeast;
  });
}

/** How a part's optional sets are counted: the done step's criteria give the sets and unit. */
export function skillPartDose(
  exerciseId: string,
): { sets: number; unit: 'reps' | 'seconds' } | undefined {
  const found = trackStepOf(exerciseId);
  const criteria = found?.track.steps[found.index].criteria;
  if (!criteria) return undefined;
  return { sets: criteria.sets, unit: criteria.seconds !== undefined ? 'seconds' : 'reps' };
}

/** One empty result slot per part. */
export function blankSkillResults(parts: readonly TrialSkillPart[]): TrialSkillPartResult[] {
  return parts.map((part) => ({ trackId: part.trackId, stepExerciseId: part.stepExerciseId }));
}

/** The exercise an outcome means, or undefined when it does not fit the part. */
function exerciseFor(
  part: DeepReadonly<TrialSkillPart>,
  outcome: TrialSkillOutcome,
): string | undefined {
  if (outcome === 'demonstrated') return part.stepExerciseId;
  if (outcome === 'step-below') return part.stepBelowExerciseId;
  return undefined;
}

/**
 * Checks a draft's skill results against its snapshot. Partial entries are kept; anything that
 * does not fit the part is refused. Returns undefined when the trial has no skill parts.
 */
export function normalizeSkillResults(
  results: readonly TrialSkillPartResult[] | undefined,
  snapshot: DeepReadonly<TrialDefinition>,
): TrialSkillPartResult[] | undefined {
  const parts = snapshot.skillParts ?? [];
  if (!parts.length) {
    if (results?.length) throw new Error('This trial has no skill parts to record.');
    return undefined;
  }
  if (
    !Array.isArray(results) ||
    results.length !== parts.length ||
    results.some(
      (result, index) =>
        result?.trackId !== parts[index].trackId ||
        result.stepExerciseId !== parts[index].stepExerciseId,
    )
  ) {
    throw new Error('The trial’s skill parts changed. Reload it before saving.');
  }
  return results.map((result, index) => {
    const part = parts[index];
    const outcome = result.outcome;
    if (outcome !== undefined && !SKILL_OUTCOMES.includes(outcome)) {
      throw new Error('Choose how the skill part went.');
    }
    if (outcome === 'step-below' && !part.stepBelowExerciseId) {
      throw new Error('This is the first step on its track; there is no step below it.');
    }
    const done = outcome ? exerciseFor(part, outcome) : undefined;
    if (result.exerciseIdDone !== undefined && result.exerciseIdDone !== done) {
      throw new Error('The skill part names a different exercise than its outcome.');
    }
    let sets: TrialSkillPartResult['sets'];
    if (result.sets !== undefined) {
      if (!Array.isArray(result.sets) || result.sets.length > MAX_SKILL_SETS) {
        throw new Error('A skill part records at most 10 sets.');
      }
      sets = result.sets.map((set: { reps?: number; seconds?: number }) => {
        for (const value of [set?.reps, set?.seconds]) {
          if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
            throw new RangeError('Skill part reps and seconds are whole numbers at or above zero.');
          }
        }
        return {
          ...(set.reps !== undefined ? { reps: set.reps } : {}),
          ...(set.seconds !== undefined ? { seconds: set.seconds } : {}),
        };
      });
    }
    return {
      trackId: part.trackId,
      stepExerciseId: part.stepExerciseId,
      ...(outcome ? { outcome } : {}),
      ...(done ? { exerciseIdDone: done } : {}),
      ...(sets && outcome !== 'set-aside-for-pain' ? { sets } : {}),
    };
  });
}

/** Whether every skill part has an outcome. A trial without skill parts is complete here. */
export function skillPartsComplete(
  results: readonly TrialSkillPartResult[] | undefined,
  snapshot: DeepReadonly<TrialDefinition>,
): boolean {
  const parts = snapshot.skillParts ?? [];
  return parts.every((_, index) => !!results?.[index]?.outcome);
}

/**
 * Throws unless every skill part has an outcome. With a readiness check, a part set aside for
 * pain must also meet its step's gate on that check.
 */
export function assertSkillPartsComplete(
  results: readonly TrialSkillPartResult[] | undefined,
  snapshot: DeepReadonly<TrialDefinition>,
  readiness?: ReadinessCheck,
): TrialSkillPartResult[] | undefined {
  const normalized = normalizeSkillResults(results, snapshot);
  if (!normalized) return undefined;
  normalized.forEach((result) => {
    if (!result.outcome) throw new Error('Record each skill part before moving on.');
    if (
      readiness &&
      result.outcome === 'set-aside-for-pain' &&
      !stepPainGated(result.stepExerciseId, readiness)
    ) {
      throw new Error(
        'A skill part can be set aside only when today’s neck or shoulder pain meets its gate.',
      );
    }
  });
  return normalized;
}
