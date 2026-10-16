import type { WorkoutDefinition, WorkoutStep } from '../domain/models';

/** Prescriptions from docs/rangers-road-full-program-content/01_THE_MUSTER.md. */
export const CHAPTER_ONE_WORKOUT_CONTENT_VERSION = 1;

const forgeWarmup: WorkoutStep[] = [
  { kind: 'walk', minutes: 2, pace: 'easy' },
  { kind: 'exercise', prescription: { exerciseId: 'cat-camel', sets: 1, reps: 6 } },
  { kind: 'exercise', prescription: { exerciseId: 'glute-bridge', sets: 1, reps: 10 } },
  { kind: 'exercise', prescription: { exerciseId: 'bird-dog', sets: 1, reps: 5, perSide: true } },
  {
    kind: 'exercise',
    prescription: {
      exerciseId: 'box-squat',
      sets: 1,
      reps: 8,
      loadStrategy: 'bodyweight',
    },
  },
  { kind: 'exercise', prescription: { exerciseId: 'wall-slide', sets: 1, reps: 8 } },
];

export const chapterOneForgeA: WorkoutDefinition = {
  id: 'chapter-1-forge-a',
  title: 'Forge A',
  contentVersion: CHAPTER_ONE_WORKOUT_CONTENT_VERSION,
  warmup: forgeWarmup,
  exercises: [
    { exerciseId: 'box-squat', sets: 3, reps: 6, rpeTarget: 6 },
    { exerciseId: 'bench-press', sets: 3, reps: 6, notes: 'Several reps in reserve.' },
    { exerciseId: 'assisted-pull-up', sets: 3, reps: '5–8' },
    { exerciseId: 'supported-split-squat', sets: 2, reps: 6, perSide: true },
    { exerciseId: 'suitcase-carry', sets: 3, durationSeconds: 30, perSide: true },
    { exerciseId: 'bird-dog', sets: 2, reps: 6, perSide: true },
    { exerciseId: 'side-plank', sets: 2, durationSeconds: '15–30', perSide: true },
  ],
  optionalFinish: [{ kind: 'walk', minutes: 5, pace: 'easy' }],
};

export const chapterOneForgeB: WorkoutDefinition = {
  id: 'chapter-1-forge-b',
  title: 'Forge B',
  contentVersion: CHAPTER_ONE_WORKOUT_CONTENT_VERSION,
  warmup: forgeWarmup,
  exercises: [
    { exerciseId: 'goblet-squat-to-box', sets: 3, reps: 8 },
    { exerciseId: 'step-up', sets: 3, reps: 6, perSide: true },
    { exerciseId: 'one-arm-db-row', sets: 3, reps: 8, perSide: true },
    { exerciseId: 'push-up', sets: 3, reps: '8–12', notes: 'Never to failure.' },
    { exerciseId: 'glute-bridge', sets: 3, reps: 10 },
    { exerciseId: 'farmer-carry', sets: 3, durationSeconds: '30–45' },
    { exerciseId: 'bird-dog', sets: 2, reps: 6, perSide: true },
  ],
};

export const chapterOneRestoration: WorkoutDefinition = {
  id: 'chapter-1-restoration',
  title: 'Restoration',
  contentVersion: CHAPTER_ONE_WORKOUT_CONTENT_VERSION,
  exercises: [
    { exerciseId: 'cat-camel', sets: 1, reps: 6 },
    { exerciseId: 'bird-dog', sets: 1, reps: 5, perSide: true },
    { exerciseId: 'glute-bridge', sets: 1, reps: 10 },
    { exerciseId: 'half-kneeling-hip-flexor-stretch', sets: 1, durationSeconds: 30, perSide: true },
    { exerciseId: 'supported-squat-hold', sets: 1, durationSeconds: '20–30' },
    { exerciseId: 'wall-slide', sets: 1, reps: 8 },
    { exerciseId: 'open-book-rotation', sets: 1, reps: 5, perSide: true },
  ],
  finish: [{ kind: 'walk', minutes: 1, pace: 'easy' }],
};

/** Forge C's curl, by calendar week from the chapter's first Monday (01_THE_MUSTER.md). */
export const CHAPTER_ONE_FORGE_C_CURLS = [
  'hammer-curl',
  'db-biceps-curl',
  'preacher-curl',
] as const;

/** The optional Forge C, offered once a week by the optional Forge card. Week 1's curl is written here. */
export const chapterOneForgeC: WorkoutDefinition = {
  id: 'chapter-1-forge-c',
  title: 'Forge C',
  contentVersion: CHAPTER_ONE_WORKOUT_CONTENT_VERSION,
  warmup: forgeWarmup,
  exercises: [
    { exerciseId: 'seated-two-db-overhead-press', sets: 2, reps: 8 },
    { exerciseId: 'two-hand-overhead-carry', sets: 2, durationSeconds: '20–30' },
    { exerciseId: 'band-pull-apart', sets: 2, reps: 12 },
    { exerciseId: 'band-face-pull', sets: 2, reps: 12 },
    { exerciseId: 'chest-supported-db-reverse-fly', sets: 2, reps: 10 },
    { exerciseId: 'pallof-press', sets: 2, reps: 8, perSide: true },
    {
      exerciseId: CHAPTER_ONE_FORGE_C_CURLS[0],
      sets: 2,
      reps: '10–12',
      notes: 'The curl rotates each week: hammer curl, DB curl, preacher curl.',
    },
  ],
};

/** Forge C with this week's curl. Weeks before the first Monday use Week 1's. */
export function chapterOneForgeCForWeek(weekIndex: number): WorkoutDefinition {
  const curl = CHAPTER_ONE_FORGE_C_CURLS[Math.max(0, weekIndex) % CHAPTER_ONE_FORGE_C_CURLS.length];
  return {
    ...chapterOneForgeC,
    exercises: chapterOneForgeC.exercises.map((exercise) =>
      CHAPTER_ONE_FORGE_C_CURLS.some((id) => id === exercise.exerciseId)
        ? { ...exercise, exerciseId: curl }
        : exercise,
    ),
  };
}

/** Week 4 uses the documented approximate volume reduction without choosing skipped sets. */
export function chapterOneWeekFourVolumeGuide(
  id: string,
  week: number,
): { plannedSets: number; aroundCompletedSets: number; aroundSkippedSets: number } | undefined {
  if (id !== chapterOneForgeB.id || week !== 4) return undefined;
  const plannedSets = chapterOneForgeB.exercises.reduce(
    (total, exercise) => total + (exercise.sets ?? 1),
    0,
  );
  const aroundCompletedSets = Math.round(plannedSets * 0.75);
  return { plannedSets, aroundCompletedSets, aroundSkippedSets: plannedSets - aroundCompletedSets };
}

/** Week-specific instructions stay visible in the saved session snapshot. */
export function chapterOneWorkoutWeekNote(id: string, week: number): string | undefined {
  if (id === chapterOneForgeA.id && week === 2) {
    return 'Progress only if Week 1 was clean.';
  }
  if (week === 4 && id === chapterOneForgeC.id) {
    return 'Keep it light.';
  }
  if (week === 4 && id === chapterOneForgeA.id) {
    return 'Reduced effort. Do not chase progression.';
  }
  if (week === 4 && id === chapterOneForgeB.id) {
    const guide = chapterOneWeekFourVolumeGuide(id, week)!;
    return `Reduce volume about 25%: aim for around ${guide.aroundCompletedSets} of ${guide.plannedSets} work sets. Mark around ${guide.aroundSkippedSets} sets skipped. Choose which sets fit today; do not chase progression.`;
  }
  return undefined;
}
