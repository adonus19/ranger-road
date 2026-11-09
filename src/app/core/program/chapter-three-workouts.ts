import type { WorkoutDefinition } from '../domain/models';
import type { VolumeGuide, Weekday } from './chapter-program';
import { chapterTwoForgeWarmup, chapterTwoRestoration } from './chapter-two-workouts';

/** Prescriptions from docs/rangers-road-full-program-content/03_THE_HIGH_COUNTRY.md. */
export const CHAPTER_THREE_WORKOUT_CONTENT_VERSION = 1;

/** The written exercise on Forge B that offers "Press half-kneeling instead". */
export const CHAPTER_THREE_STANCE_PRESS = 'one-arm-db-overhead-press';
export const HALF_KNEELING_PRESS = 'half-kneeling-one-arm-db-press';

export const chapterThreeForgeA: WorkoutDefinition = {
  id: 'chapter-3-forge-a',
  title: 'Forge A',
  contentVersion: CHAPTER_THREE_WORKOUT_CONTENT_VERSION,
  // From Chapter II the warm-up is Chapter I's plus Band Pull-Apart (RANGERS_ROAD_PROGRAM.md).
  warmup: chapterTwoForgeWarmup,
  exercises: [
    {
      exerciseId: 'box-squat',
      sets: 3,
      reps: 6,
      notes: 'Slow 3-second lowering, light touch.',
    },
    { exerciseId: 'bench-press', sets: 3, reps: 6 },
    { exerciseId: 'assisted-pull-up', sets: 3, reps: '6–8', trackId: 'pull' },
    { exerciseId: 'step-up', sets: 3, reps: 8, perSide: true },
    { exerciseId: 'seated-two-db-overhead-press', sets: 3, reps: 8 },
    { exerciseId: 'suitcase-carry', sets: 2, durationSeconds: 45, perSide: true },
    {
      exerciseId: 'two-hand-overhead-carry',
      sets: 2,
      durationSeconds: '30–45',
      notes: 'Heavier.',
    },
    { exerciseId: 'side-plank', sets: 2, durationSeconds: '30–40', perSide: true },
    { exerciseId: 'hammer-curl', sets: 2, reps: 10, notes: 'Required. Light weight.' },
    { exerciseId: 'calf-raise', sets: 2, reps: 12 },
  ],
};

export const chapterThreeForgeB: WorkoutDefinition = {
  id: 'chapter-3-forge-b',
  title: 'Forge B',
  contentVersion: CHAPTER_THREE_WORKOUT_CONTENT_VERSION,
  warmup: chapterTwoForgeWarmup,
  exercises: [
    { exerciseId: 'goblet-squat', sets: 3, reps: 8 },
    { exerciseId: 'supported-reverse-lunge', sets: 3, reps: 6, perSide: true },
    { exerciseId: 'one-arm-db-row', sets: 3, reps: 10, perSide: true },
    {
      exerciseId: 'push-up',
      sets: 3,
      // "3 submaximal sets", written as in Chapter II.
      reps: '8–12',
      notes: 'Submaximal sets. Never to failure.',
      trackId: 'push',
    },
    {
      exerciseId: CHAPTER_THREE_STANCE_PRESS,
      sets: 3,
      reps: 8,
      perSide: true,
      // Seated by default; the person may press half-kneeling instead (Press stance).
      stanceChoice: HALF_KNEELING_PRESS,
    },
    { exerciseId: 'farmer-carry', sets: 2, durationSeconds: 60 },
    {
      exerciseId: 'two-hand-overhead-carry',
      sets: 2,
      durationSeconds: '30–45',
      notes: 'Heavier.',
    },
    { exerciseId: 'pallof-press', sets: 2, reps: 8, perSide: true },
    { exerciseId: 'preacher-curl', sets: 2, reps: '10–12', perSide: true },
    { exerciseId: 'glute-bridge', sets: 3, reps: 12 },
    { exerciseId: 'chin-up', sets: 2, reps: '5–8' },
  ],
};

/** Restoration II, reused as written; Chapter III keeps its own ID so each chapter's record stays apart. */
export const chapterThreeRestoration: WorkoutDefinition = {
  ...structuredClone(chapterTwoRestoration),
  id: 'chapter-3-restoration',
  contentVersion: CHAPTER_THREE_WORKOUT_CONTENT_VERSION,
};

/** Week 12 (the deload week, and the days that repeat it while the trial waits). */
const REDUCED_WEEK = 12;

/** Week 12's Forges are about 25% lighter: a guide, never a limit on saving. */
export function chapterThreeVolumeGuide(id: string, week: number): VolumeGuide | undefined {
  if (week !== REDUCED_WEEK) return undefined;
  const workout = [chapterThreeForgeA, chapterThreeForgeB].find((item) => item.id === id);
  if (!workout) return undefined;
  const plannedSets = workout.exercises.reduce(
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

/** Week- and day-specific instructions, saved with the session. */
export function chapterThreeWorkoutNote(
  id: string,
  week: number,
  weekday?: Weekday,
): string | undefined {
  const guide = chapterThreeVolumeGuide(id, week);
  if (guide) {
    return `Reduce volume about 25%: aim for around ${guide.aroundCompletedSets} of ${guide.plannedSets} work sets. Mark around ${guide.aroundSkippedSets} sets skipped. Choose which sets fit today. No load increases.`;
  }
  if (id === chapterThreeRestoration.id && week === 9 && weekday === 3) {
    return 'Add one extra round of ankle rock today.';
  }
  return undefined;
}
