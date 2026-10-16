import type { ExercisePrescription } from '../domain/models';

/**
 * The custom Forge builder's library (The Optional Forge, RANGERS_ROAD_PROGRAM.md): each
 * exercise's group and, for the Forge expansion exercises, its "Custom Forge default" from
 * docs/rangers-road-full-program-content/EXERCISE_CATALOG.md. The builder prefers the current
 * chapter's Forge A or B dose and falls back to these only when no chapter in the app writes one.
 */

export type BuilderGroup = 'lower' | 'push' | 'pull' | 'carry' | 'core' | 'arms' | 'mobility';

/** Group order and headings, as listed in UX_SPEC.md. */
export const BUILDER_GROUPS: readonly { id: BuilderGroup; title: string }[] = [
  { id: 'lower', title: 'Lower body' },
  { id: 'push', title: 'Push' },
  { id: 'pull', title: 'Pull' },
  { id: 'carry', title: 'Carry' },
  { id: 'core', title: 'Core' },
  { id: 'arms', title: 'Arms' },
  { id: 'mobility', title: 'Mobility' },
];

/** A catalog default: everything but the exercise ID. */
export type CatalogDose = Omit<ExercisePrescription, 'exerciseId'>;

export interface LibraryEntry {
  group: BuilderGroup;
  /** "Custom Forge default" in the catalog; absent for exercises the chapters prescribe. */
  catalogDose?: CatalogDose;
}

/** Every exercise guide, by ID. A guide missing here is a content error (see the spec). */
export const CUSTOM_FORGE_LIBRARY: Readonly<Record<string, LibraryEntry>> = {
  // Lower body
  'box-squat': { group: 'lower' },
  'goblet-squat-to-box': { group: 'lower' },
  'goblet-squat': { group: 'lower' },
  'supported-split-squat': { group: 'lower' },
  'split-squat': { group: 'lower' },
  'step-up': { group: 'lower' },
  'supported-reverse-lunge': { group: 'lower' },
  'slow-step-down': { group: 'lower' },
  'lateral-step-down': { group: 'lower', catalogDose: { sets: 2, reps: 5, perSide: true } },
  'single-leg-balance': { group: 'lower' },
  'single-leg-reach': { group: 'lower', catalogDose: { sets: 2, reps: 5, perSide: true } },
  'glute-bridge': { group: 'lower' },
  'elevated-light-hinge-pattern': { group: 'lower' },
  'single-leg-romanian-deadlift': {
    group: 'lower',
    catalogDose: { sets: 2, reps: 6, perSide: true, notes: 'Only if the back tolerates it.' },
  },
  'calf-raise': { group: 'lower' },

  // Push
  'bench-press': { group: 'push' },
  'push-up': { group: 'push' },
  'seated-two-db-overhead-press': { group: 'push', catalogDose: { sets: 2, reps: 8 } },
  'standing-two-db-overhead-press': { group: 'push', catalogDose: { sets: 2, reps: 8 } },
  'one-arm-db-overhead-press': {
    group: 'push',
    catalogDose: { sets: 2, reps: 8, perSide: true },
  },
  'half-kneeling-one-arm-db-press': {
    group: 'push',
    catalogDose: { sets: 2, reps: 8, perSide: true },
  },
  'barbell-overhead-press': { group: 'push', catalogDose: { sets: 2, reps: 5 } },
  'seated-barbell-overhead-press': { group: 'push', catalogDose: { sets: 2, reps: 5 } },
  'pike-push-up': { group: 'push', catalogDose: { sets: 3, reps: '6–10' } },
  'feet-elevated-pike-push-up': { group: 'push', catalogDose: { sets: 3, reps: '5–8' } },
  'wall-handstand-push-up-negative': { group: 'push', catalogDose: { sets: 3, reps: '2–3' } },
  'wall-handstand-push-up': { group: 'push', catalogDose: { sets: 3, reps: '1–3' } },
  'pike-hold': { group: 'push', catalogDose: { sets: 2, durationSeconds: '20–30' } },
  'wall-plank-hold': { group: 'push', catalogDose: { sets: 3, durationSeconds: '20–30' } },
  'wall-walk': { group: 'push', catalogDose: { sets: 3, reps: '1–2' } },
  'chest-to-wall-handstand-hold': {
    group: 'push',
    catalogDose: { sets: 3, durationSeconds: '15–30' },
  },
  'kick-up-to-wall': { group: 'push', catalogDose: { sets: 3, reps: 3 } },
  'freestanding-handstand-attempts': {
    group: 'push',
    catalogDose: { sets: 1, reps: 5, notes: 'Five attempts.' },
  },
  'planche-lean': { group: 'push', catalogDose: { sets: 2, durationSeconds: '10–20' } },
  'frog-stand': { group: 'push', catalogDose: { sets: 2, durationSeconds: '10–20' } },
  'pseudo-planche-push-up': { group: 'push', catalogDose: { sets: 2, reps: '5–8' } },
  'tuck-planche-hold': { group: 'push', catalogDose: { sets: 2, durationSeconds: '5–10' } },
  'advanced-tuck-planche-hold': {
    group: 'push',
    catalogDose: { sets: 2, durationSeconds: '5–10' },
  },
  'tuck-planche-push-up': { group: 'push', catalogDose: { sets: 2, reps: '1–3' } },
  'straddle-planche': { group: 'push', catalogDose: { sets: 2, durationSeconds: '3–5' } },
  'planche-push-up': { group: 'push', catalogDose: { sets: 2, reps: 1 } },
  'straight-bar-dip': {
    group: 'push',
    catalogDose: { sets: 2, reps: 5, notes: '2 × 5 dips, then 2 × 5 transition drills.' },
  },

  // Pull
  'assisted-pull-up': { group: 'pull' },
  'chin-up': { group: 'pull', catalogDose: { sets: 2, reps: '5–8' } },
  'band-light-pull-up': {
    group: 'pull',
    catalogDose: { sets: 3, reps: 5, notes: 'Band-light reps, then 3 slow negatives.' },
  },
  'pull-up': { group: 'pull', catalogDose: { sets: 3, reps: '3–5' } },
  'chest-to-bar-pull-up': { group: 'pull', catalogDose: { sets: 3, reps: 3 } },
  'band-assisted-muscle-up': { group: 'pull', catalogDose: { sets: 3, reps: 2 } },
  'muscle-up': { group: 'pull', catalogDose: { sets: 3, reps: 1 } },
  'one-arm-db-row': { group: 'pull' },
  'band-pull-apart': { group: 'pull', catalogDose: { sets: 2, reps: 12 } },
  'band-face-pull': { group: 'pull', catalogDose: { sets: 2, reps: 12 } },
  'chest-supported-db-reverse-fly': { group: 'pull', catalogDose: { sets: 2, reps: 10 } },

  // Carry
  'suitcase-carry': { group: 'carry' },
  'farmer-carry': { group: 'carry' },
  'front-hold-carry': { group: 'carry' },
  'bear-hug-carry': { group: 'carry' },
  'two-hand-overhead-carry': {
    group: 'carry',
    catalogDose: { sets: 2, durationSeconds: '20–30' },
  },
  'waiter-carry': {
    group: 'carry',
    catalogDose: { sets: 2, durationSeconds: '20–30', perSide: true },
  },

  // Core
  'side-plank': { group: 'core' },
  'bird-dog': { group: 'core' },
  'pallof-press': { group: 'core', catalogDose: { sets: 2, reps: 8, perSide: true } },
  'plank-shoulder-taps': { group: 'core', catalogDose: { sets: 2, reps: 8, perSide: true } },

  // Arms
  'hammer-curl': { group: 'arms' },
  'db-biceps-curl': { group: 'arms', catalogDose: { sets: 2, reps: '10–12' } },
  'preacher-curl': {
    group: 'arms',
    catalogDose: { sets: 2, reps: '10–12', perSide: true },
  },

  // Mobility
  'cat-camel': { group: 'mobility' },
  'half-kneeling-hip-flexor-stretch': { group: 'mobility' },
  'supported-squat-hold': { group: 'mobility' },
  'supported-deep-squat': { group: 'mobility' },
  'wall-slide': { group: 'mobility' },
  'open-book-rotation': { group: 'mobility' },
  'ankle-rock': { group: 'mobility' },
  'neutral-spine-hamstring-stretch': { group: 'mobility' },
  'wrist-circles': { group: 'mobility' },
  'wrist-rocks': { group: 'mobility' },
};
