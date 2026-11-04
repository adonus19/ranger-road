import type {
  DeepReadonly,
  WorkoutDefinition,
  WorkoutSession,
  WorkoutStep,
} from '../domain/models';
import { SKILL_TRACKS } from './skill-tracks';

/**
 * The wrist warm-up for handstand and planche days (RANGERS_ROAD_PROGRAM.md, Readiness Gates):
 * about a minute of Wrist Circles or Wrist Rocks, alternating from one session to the next,
 * inside the warm-up list in front of the work.
 */
export const WRIST_WARMUP_SECONDS = 60;
const WRIST_WARMUPS = ['wrist-circles', 'wrist-rocks'] as const;

/** Wall handstand push-up steps load the wrists upside down, so they take the warm-up too. */
const WALL_HANDSTAND_STEPS = ['wall-handstand-push-up-negative', 'wall-handstand-push-up'];

/** Every handstand-track and planche-track step, and the wall handstand push-up steps. */
const WRIST_LOADED: ReadonlySet<string> = new Set([
  ...SKILL_TRACKS.filter((track) => track.id === 'handstand' || track.id === 'planche').flatMap(
    (track) => track.steps.map((step) => step.exerciseId),
  ),
  ...WALL_HANDSTAND_STEPS,
]);

export function hasWristLoadedWork(exerciseIds: Iterable<string>): boolean {
  for (const id of exerciseIds) if (WRIST_LOADED.has(id)) return true;
  return false;
}

/** The wrist exercise a warm-up used in a saved session, if it had one. */
function wristUsed(
  session: DeepReadonly<Pick<WorkoutSession, 'definitionSnapshot'>>,
): string | undefined {
  return session.definitionSnapshot?.warmup
    ?.flatMap((step) => (step.kind === 'exercise' ? [step.prescription.exerciseId] : []))
    .find((id) => (WRIST_WARMUPS as readonly string[]).includes(id));
}

/** The other one from the newest session that had a wrist warm-up; Wrist Circles first. */
export function nextWristWarmup(
  sessions: readonly DeepReadonly<
    Pick<WorkoutSession, 'definitionSnapshot' | 'date' | 'completedAt' | 'id'>
  >[],
): (typeof WRIST_WARMUPS)[number] {
  const newest = [...sessions]
    .filter((session) => wristUsed(session))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
        b.id.localeCompare(a.id),
    )[0];
  return newest && wristUsed(newest) === 'wrist-circles' ? 'wrist-rocks' : 'wrist-circles';
}

/**
 * The definition with a wrist warm-up added after its warm-up, when the work includes a handstand
 * or planche step. Unchanged otherwise, and never added twice.
 */
export function withWristWarmup(
  definition: DeepReadonly<WorkoutDefinition>,
  sessions: readonly DeepReadonly<
    Pick<WorkoutSession, 'definitionSnapshot' | 'date' | 'completedAt' | 'id'>
  >[],
): WorkoutDefinition {
  const copy = structuredClone(definition) as WorkoutDefinition;
  if (!hasWristLoadedWork(copy.exercises.map((exercise) => exercise.exerciseId))) return copy;
  if (copy.warmup?.some((step) => step.kind === 'exercise' && wristUsedStep(step))) return copy;
  const step: WorkoutStep = {
    kind: 'exercise',
    prescription: {
      exerciseId: nextWristWarmup(sessions),
      sets: 1,
      durationSeconds: WRIST_WARMUP_SECONDS,
    },
  };
  return { ...copy, warmup: [...(copy.warmup ?? []), step] };
}

function wristUsedStep(step: WorkoutStep): boolean {
  return (
    step.kind === 'exercise' &&
    (WRIST_WARMUPS as readonly string[]).includes(step.prescription.exerciseId)
  );
}
