import type { WorkoutDefinition, WorkoutStep } from '../domain/models';
import type { VolumeGuide } from './chapter-program';

/** Prescriptions from docs/rangers-road-full-program-content/02_THE_ROAD.md. */
export const CHAPTER_TWO_WORKOUT_CONTENT_VERSION = 2;

/** Chapter I's warm-up plus the band pull-apart that Chapter II adds. */
const forgeWarmup: WorkoutStep[] = [
  { kind: 'walk', minutes: 2, pace: 'easy' },
  { kind: 'exercise', prescription: { exerciseId: 'cat-camel', sets: 1, reps: 6 } },
  { kind: 'exercise', prescription: { exerciseId: 'glute-bridge', sets: 1, reps: 10 } },
  { kind: 'exercise', prescription: { exerciseId: 'bird-dog', sets: 1, reps: 5, perSide: true } },
  {
    kind: 'exercise',
    prescription: { exerciseId: 'box-squat', sets: 1, reps: 8, loadStrategy: 'bodyweight' },
  },
  { kind: 'exercise', prescription: { exerciseId: 'wall-slide', sets: 1, reps: 8 } },
  { kind: 'exercise', prescription: { exerciseId: 'band-pull-apart', sets: 1, reps: 12 } },
];

export const chapterTwoForgeA: WorkoutDefinition = {
  id: 'chapter-2-forge-a',
  title: 'Forge A',
  contentVersion: CHAPTER_TWO_WORKOUT_CONTENT_VERSION,
  warmup: forgeWarmup,
  exercises: [
    { exerciseId: 'box-squat', sets: 3, reps: 6 },
    { exerciseId: 'bench-press', sets: 3, reps: 6 },
    { exerciseId: 'assisted-pull-up', sets: 3, reps: '6–8' },
    { exerciseId: 'split-squat', sets: 3, reps: 6, perSide: true },
    { exerciseId: 'seated-two-db-overhead-press', sets: 3, reps: 8 },
    { exerciseId: 'suitcase-carry', sets: 2, durationSeconds: 40, perSide: true },
    {
      exerciseId: 'two-hand-overhead-carry',
      sets: 2,
      durationSeconds: '20–30',
      notes: 'Light.',
    },
    { exerciseId: 'side-plank', sets: 2, durationSeconds: 30, perSide: true },
    { exerciseId: 'hammer-curl', sets: 2, reps: 10, notes: 'Required. Light weight.' },
    { exerciseId: 'calf-raise', sets: 2, reps: 12 },
  ],
  optionalFinish: [{ kind: 'walk', minutes: 5, pace: 'easy' }],
};

export const chapterTwoForgeB: WorkoutDefinition = {
  id: 'chapter-2-forge-b',
  title: 'Forge B',
  contentVersion: CHAPTER_TWO_WORKOUT_CONTENT_VERSION,
  warmup: forgeWarmup,
  exercises: [
    { exerciseId: 'goblet-squat', sets: 3, reps: '8–10' },
    { exerciseId: 'step-up', sets: 3, reps: 8, perSide: true },
    { exerciseId: 'one-arm-db-row', sets: 3, reps: '8–10', perSide: true },
    { exerciseId: 'push-up', sets: 3, reps: '8–12', notes: 'Submaximal sets. Never to failure.' },
    {
      exerciseId: 'one-arm-db-overhead-press',
      sets: 3,
      reps: 8,
      perSide: true,
      notes: 'Seated in Chapter II.',
    },
    { exerciseId: 'farmer-carry', sets: 2, durationSeconds: '45–60' },
    {
      exerciseId: 'two-hand-overhead-carry',
      sets: 2,
      durationSeconds: '20–30',
      notes: 'Light.',
    },
    { exerciseId: 'pallof-press', sets: 2, reps: 8, perSide: true },
    { exerciseId: 'db-biceps-curl', sets: 2, reps: '10–12' },
    { exerciseId: 'glute-bridge', sets: 3, reps: 12 },
    { exerciseId: 'chin-up', sets: 2, reps: '5–8' },
  ],
};

export const chapterTwoRestoration: WorkoutDefinition = {
  id: 'chapter-2-restoration',
  title: 'Restoration',
  contentVersion: CHAPTER_TWO_WORKOUT_CONTENT_VERSION,
  exercises: [
    { exerciseId: 'cat-camel', sets: 1, reps: 6 },
    { exerciseId: 'bird-dog', sets: 1, reps: 5, perSide: true },
    {
      exerciseId: 'half-kneeling-hip-flexor-stretch',
      sets: 1,
      durationSeconds: '30–45',
      perSide: true,
    },
    { exerciseId: 'neutral-spine-hamstring-stretch', sets: 1, durationSeconds: 30, perSide: true },
    { exerciseId: 'supported-deep-squat', sets: 2, durationSeconds: '20–30' },
    { exerciseId: 'ankle-rock', sets: 1, reps: 10, perSide: true },
    { exerciseId: 'wall-slide', sets: 1, reps: 8 },
    { exerciseId: 'open-book-rotation', sets: 1, reps: 6, perSide: true },
  ],
  finish: [{ kind: 'walk', minutes: 1, pace: 'easy' }],
};

/** Week 8 Forge B is about 25% lighter, about 21 of the 28 work sets, curl and chin-up included. */
export function chapterTwoWeekEightVolumeGuide(id: string, week: number): VolumeGuide | undefined {
  if (id !== chapterTwoForgeB.id || week !== 8) return undefined;
  const plannedSets = chapterTwoForgeB.exercises.reduce(
    (total, exercise) => total + (exercise.sets ?? 1),
    0,
  );
  const aroundCompletedSets = Math.round(plannedSets * 0.75);
  return {
    week,
    plannedSets,
    aroundCompletedSets,
    aroundSkippedSets: plannedSets - aroundCompletedSets,
  };
}

/** Week-specific instructions stay visible in the saved session snapshot. */
export function chapterTwoWorkoutWeekNote(id: string, week: number): string | undefined {
  if (week === 8 && id === chapterTwoForgeA.id) {
    return 'Do not chase progression: the written sets and reps, with no load increases.';
  }
  if (week === 8 && id === chapterTwoForgeB.id) {
    const guide = chapterTwoWeekEightVolumeGuide(id, week)!;
    return `Reduce volume about 25%: aim for around ${guide.aroundCompletedSets} of ${guide.plannedSets} work sets. Mark around ${guide.aroundSkippedSets} sets skipped. Choose which sets fit today; do not chase progression.`;
  }
  return undefined;
}
