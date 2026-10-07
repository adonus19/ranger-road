import type { WorkoutDefinition, WorkoutStep } from '../domain/models';
import type { VolumeGuide } from './chapter-program';

/** Prescriptions from docs/rangers-road-full-program-content/02_THE_ROAD.md. */
export const CHAPTER_TWO_WORKOUT_CONTENT_VERSION = 1;

/** Chapter II reuses Chapter I's warm-up and finishes; its pack adds none of its own. */
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
    { exerciseId: 'suitcase-carry', sets: 3, durationSeconds: 40, perSide: true },
    { exerciseId: 'side-plank', sets: 2, durationSeconds: 30, perSide: true },
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
    { exerciseId: 'glute-bridge', sets: 3, reps: 12 },
    { exerciseId: 'farmer-carry', sets: 3, durationSeconds: '45–60' },
    { exerciseId: 'bird-dog', sets: 2, reps: 8, perSide: true },
    { exerciseId: 'hammer-curl', sets: 2, reps: 10, notes: 'Optional. Light weight.' },
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

/** Week 8 Forge B is about 25% lighter, counting Hammer Curl's two sets in the 22. */
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
