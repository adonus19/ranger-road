/**
 * How each Forge exercise progresses, from "Showing progression in Forge" in
 * RANGERS_ROAD_PROGRAM.md. An exercise that is not listed gets no hint and no Last time:
 * push-ups, bodyweight exercises, and everything in Restoration and the warm-up.
 */
export type ProgressionKind =
  /** +5 lb. */
  | 'barbell-upper'
  /** +5 lb, or a lower box. */
  | 'squat'
  /** A rep range: reps to the top, then +5 lb and back to the bottom. Fixed reps: +5 lb. */
  | 'loaded'
  /** +5 lb; the chapter's written time stays as prescribed. */
  | 'carry'
  /** +5 seconds up to the top of a written range. */
  | 'hold'
  /** Less band help when every set reaches the top of the range. */
  | 'assisted-pull-up'
  | 'none';

const KINDS: Readonly<Record<string, ProgressionKind>> = {
  'bench-press': 'barbell-upper',
  'box-squat': 'squat',
  'goblet-squat': 'loaded',
  'goblet-squat-to-box': 'loaded',
  'one-arm-db-row': 'loaded',
  'step-up': 'loaded',
  'split-squat': 'loaded',
  'supported-split-squat': 'loaded',
  'calf-raise': 'loaded',
  'hammer-curl': 'loaded',
  'suitcase-carry': 'carry',
  'farmer-carry': 'carry',
  'side-plank': 'hold',
  'assisted-pull-up': 'assisted-pull-up',
};

export function progressionKind(exerciseId: string): ProgressionKind {
  return KINDS[exerciseId] ?? 'none';
}

/** A step-up's easier version (EXERCISE_CATALOG.md "Step-up from"), shown its first time. */
export const STEP_UP_FROM: Readonly<Record<string, string>> = {
  'split-squat': 'supported-split-squat',
  'goblet-squat': 'goblet-squat-to-box',
  'supported-deep-squat': 'supported-squat-hold',
};
