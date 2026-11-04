import type { DeepReadonly, ExercisePrescription } from '../domain/models';
import { SKILL_TRACKS } from './skill-tracks';

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

/** The pull track's muscle-up steps follow the press swap (Readiness Gates). */
const MUSCLE_UP_STEPS = ['straight-bar-dip', 'band-assisted-muscle-up', 'muscle-up'];

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
  ...MUSCLE_UP_STEPS.map((fromId) => ({
    fromId,
    toId: 'band-pull-apart',
    reason: 'Your shoulder is sore today. You can do band pull-aparts instead of this step.',
  })),
];

/** Neck or shoulder pain at or above this offers the inversion swaps (Readiness Gates). */
export const INVERSION_SWAP_THRESHOLD = 2;

/** Today's readiness pain ratings, the only part of a check the swaps read. */
export interface SwapPain {
  shoulderPain: number;
  neckPain: number;
}

/**
 * Handstand, wall-walk, handstand push-up and planche steps: every track step whose pain gate
 * names the neck. They may swap to a pike hold or a regular push-up.
 */
const INVERSION_STEPS: readonly string[] = SKILL_TRACKS.flatMap((track) =>
  track.steps
    .filter((step) => step.painGate?.areas.includes('neck'))
    .map((step) => step.exerciseId),
);

const INVERSION_SWAPS: readonly ReadinessSwap[] = INVERSION_STEPS.flatMap((fromId) =>
  ['pike-hold', 'push-up'].map((toId) => ({
    fromId,
    toId,
    reason:
      'Your neck or shoulder is sore today. You can do a pike hold or push-ups instead of this step.',
  })),
);

/**
 * Every swap offered for an exercise at today's readiness: the shoulder swaps at shoulder pain of
 * 3 or more, and the inversion swaps (a pike hold or a regular push-up) at neck or shoulder pain
 * of 2 or more. Offered as a choice; nothing is ever applied on its own.
 */
export function swapsFor(exerciseId: string, pain: SwapPain): ReadinessSwap[] {
  const inversion =
    Math.max(pain.neckPain, pain.shoulderPain) >= INVERSION_SWAP_THRESHOLD
      ? INVERSION_SWAPS.filter((swap) => swap.fromId === exerciseId)
      : [];
  const shoulder = shoulderSwapFor(exerciseId, pain.shoulderPain);
  return [...(shoulder ? [shoulder] : []), ...inversion];
}

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

/** The catalog's Pike Hold dose; a swapped step keeps its sets and takes this. */
const PIKE_HOLD_SECONDS = '20–30';
/** A regular push-up swap uses the push track's Chapter II rep range. */
const PUSH_UP_REPS = '8–12';

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
  if (toId === 'pike-hold') return { exerciseId: toId, sets, durationSeconds: PIKE_HOLD_SECONDS };
  if (toId === 'push-up') return { exerciseId: toId, sets, reps: PUSH_UP_REPS };
  return {
    exerciseId: toId,
    sets,
    ...(written.durationSeconds !== undefined ? { durationSeconds: written.durationSeconds } : {}),
    ...(written.duration !== undefined ? { duration: written.duration } : {}),
    ...(written.perSide ? { perSide: true } : {}),
  };
}
