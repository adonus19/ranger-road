import type { DeepReadonly, ExercisePrescription } from '../domain/models';

/** Shoulder pain at or above this offers the overhead swaps (RANGERS_ROAD_PROGRAM.md, Readiness Gates). */
export const SHOULDER_SWAP_THRESHOLD = 3;

/** What an exercise may swap to when shoulder pain is high, and why. */
export interface ReadinessSwap {
  /** The written exercise. */
  fromId: string;
  /** The exercise the person may do instead. */
  toId: string;
  /** The calm line on the exercise. */
  reason: string;
}

const OVERHEAD_CARRIES = ['two-hand-overhead-carry', 'waiter-carry'];
const OVERHEAD_PRESSES = [
  'seated-two-db-overhead-press',
  'standing-two-db-overhead-press',
  'one-arm-db-overhead-press',
  'half-kneeling-one-arm-db-press',
  'barbell-overhead-press',
  'seated-barbell-overhead-press',
];

const SHOULDER_SWAPS: readonly ReadinessSwap[] = [
  ...OVERHEAD_CARRIES.map((fromId) => ({
    fromId,
    toId: 'front-hold-carry',
    reason: 'Your shoulder is sore today. You can carry in front of your chest instead.',
  })),
  ...OVERHEAD_PRESSES.map((fromId) => ({
    fromId,
    toId: 'band-pull-apart',
    reason: 'Your shoulder is sore today. You can do band pull-aparts instead of pressing.',
  })),
];

/** The swap offered for an exercise at today's shoulder pain, or null. Never applied on its own. */
export function shoulderSwapFor(exerciseId: string, shoulderPain: number): ReadinessSwap | null {
  if (!Number.isFinite(shoulderPain) || shoulderPain < SHOULDER_SWAP_THRESHOLD) return null;
  return SHOULDER_SWAPS.find((swap) => swap.fromId === exerciseId) ?? null;
}

/** Whether a swap from one exercise to another is one the program names. */
export function isShoulderSwap(fromId: string, toId: string): boolean {
  return SHOULDER_SWAPS.some((swap) => swap.fromId === fromId && swap.toId === toId);
}

/** Pull-aparts are counted in reps; a swapped press keeps its sets and takes this dose. */
const PULL_APART_REPS = 12;

/**
 * The prescription for the swapped exercise. A carry keeps its sets and time; a press becomes
 * band pull-aparts with the same number of sets. No load is carried over.
 */
export function swappedPrescription(
  written: DeepReadonly<ExercisePrescription>,
  toId: string,
): ExercisePrescription {
  const sets = written.sets ?? 1;
  if (toId === 'band-pull-apart') return { exerciseId: toId, sets, reps: PULL_APART_REPS };
  return {
    exerciseId: toId,
    sets,
    ...(written.durationSeconds !== undefined ? { durationSeconds: written.durationSeconds } : {}),
    ...(written.duration !== undefined ? { duration: written.duration } : {}),
    ...(written.perSide ? { perSide: true } : {}),
  };
}
