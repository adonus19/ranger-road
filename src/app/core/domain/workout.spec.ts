import { describe, expect, it } from 'vitest';
import type {
  ReadinessCheck,
  WorkoutDefinition,
  WorkoutDraft,
  WorkoutSession,
} from './models';
import {
  completeWorkoutDraft,
  createRecordedWorkoutPain,
  createWorkoutDraft,
  stepUpWorkoutExercise,
  swapWorkoutExercise,
  switchWorkoutStance,
  updateWorkoutDraft,
} from './workout';
import { chapterThreeForgeB, chapterThreeRestoration } from '../program/chapter-three-workouts';
import { chapterTwoRestoration } from '../program/chapter-two-workouts';
import { exposuresFor } from '../program/progression';

const definition: WorkoutDefinition = {
  id: 'chapter-1-forge-a',
  title: 'Forge A',
  contentVersion: 1,
  warmup: [{ kind: 'walk', minutes: 2, pace: 'easy' }],
  exercises: [
    { exerciseId: 'box-squat', sets: 3, reps: 6 },
    { exerciseId: 'bench-press', sets: 3, reps: 6 },
  ],
  optionalFinish: [{ kind: 'walk', minutes: 5, pace: 'easy' }],
};

const green: ReadinessCheck = {
  id: 'green-check',
  date: '2026-09-28',
  checkedAt: '2026-09-28T12:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 3,
  backPain: 0,
  shoulderPain: 0,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
  status: 'green',
};

const startedAt = '2026-09-28T13:00:00.000Z';
const savedAt = '2026-09-28T13:05:00.000Z';

describe('workout draft and completion', () => {
  it('starts from a cloned prescription and marks Yellow sessions reduced', () => {
    const source = structuredClone(definition);
    const yellow = { ...green, id: 'yellow-check', poorSleep: true, status: 'yellow' as const };
    const draft = createWorkoutDraft(
      { date: yellow.date, definition: source, sessionInstructions: ['Reduced effort.'] },
      yellow,
      startedAt,
      'draft-1',
    );
    source.title = 'Changed later';
    source.exercises[0].reps = 99;
    expect(draft.definitionSnapshot.title).toBe('Forge A');
    expect(draft.definitionSnapshot.exercises[0].reps).toBe(6);
    expect(draft.reduced).toBe(true);
    expect(draft.warmupComplete).toBe(false);
    expect(draft.finishComplete).toBe(true);
    expect(draft.currentExerciseIndex).toBe(0);
    expect(draft.exerciseResults[0].sets).toEqual([{}, {}, {}]);
    expect(draft.sessionInstructions).toEqual(['Reduced effort.']);
  });

  it('blocks Red even if a stored status incorrectly says Green', () => {
    expect(() =>
      createWorkoutDraft({ date: green.date, definition }, undefined, startedAt, 'x'),
    ).toThrow('Check readiness');
    expect(() =>
      createWorkoutDraft({ date: green.date, definition }, { ...green, energy: 1 }, startedAt, 'x'),
    ).toThrow('Red readiness');

    const restoration: WorkoutDefinition = {
      id: 'chapter-1-restoration',
      title: 'Restoration',
      exercises: [{ exerciseId: 'cat-camel', sets: 1, reps: 6 }],
    };
    const red = { ...green, id: 'red', energy: 1, status: 'red' as const };
    const restore = createWorkoutDraft(
      { date: green.date, definition: restoration },
      red,
      startedAt,
      'restoration-1',
    );
    expect(restore.reduced).toBe(true);
    restore.exerciseResults[0].sets[0] = { reps: 6, completed: true };
    expect(completeWorkoutDraft(restore, red, 'completed', savedAt).outcome).toBe('completed');
  });

  it('persists navigation and set edits without allowing a stale edit to erase pain', () => {
    const draft = createWorkoutDraft({ date: green.date, definition }, green, startedAt, 'draft-1');
    const pain = createRecordedWorkoutPain(
      draft,
      {
        exerciseId: 'box-squat',
        bodyArea: 'Knee',
        severity: 3,
        actionTaken: 'Reduced range',
      },
      savedAt,
      'pain-1',
    );
    draft.exerciseResults[0].painEvents.push(pain);
    draft.reduced = true;
    const edited = structuredClone(draft);
    edited.exerciseResults[0].painEvents = [];
    edited.exerciseResults[0].sets[0] = { reps: 6, load: 45, rpe: 6, completed: true };
    edited.exerciseResults[0].modificationNotes = 'Raised box';
    edited.currentExerciseIndex = 0;
    edited.currentSetIndex = 1;
    edited.restStartedAt = savedAt;
    edited.warmupComplete = true;
    const saved = updateWorkoutDraft(draft, edited, green, '2026-09-28T13:06:00.000Z');
    expect(saved.exerciseResults[0].painEvents).toEqual([pain]);
    expect(saved.exerciseResults[0].sets[0].load).toBe(45);
    expect(saved.exerciseResults[0].modificationNotes).toBe('Raised box');
    expect(saved.currentSetIndex).toBe(1);
    expect(saved.restStartedAt).toBe(savedAt);
    expect(saved.warmupComplete).toBe(true);
    expect(saved.reduced).toBe(true);

    const invalid = structuredClone(edited);
    invalid.exerciseResults[0].substitutionId = 'unseeded-movement';
    expect(() => updateWorkoutDraft(draft, invalid, green, savedAt)).toThrow('documented');
    expect(() => updateWorkoutDraft(draft, edited, { ...green, energy: 1 }, savedAt)).toThrow(
      'Red readiness',
    );
  });

  it('requires review after a newer check and keeps a stopped snapshot independent of the draft', () => {
    const draft = createWorkoutDraft({ date: green.date, definition }, green, startedAt, 'draft-1');
    draft.exerciseResults[0].sets[0] = { reps: 6, load: 45, completed: true };
    for (const result of draft.exerciseResults) {
      for (let index = 0; index < result.sets.length; index += 1) {
        if (result.sets[index].completed === undefined) result.sets[index] = { completed: false };
      }
    }
    draft.reduced = true;
    const laterYellow: ReadinessCheck = {
      ...green,
      id: 'later-yellow',
      checkedAt: savedAt,
      poorSleep: true,
      status: 'yellow',
    };
    expect(() => completeWorkoutDraft(draft, laterYellow, 'completed', savedAt)).toThrow(
      'Readiness changed',
    );
    const reviewed = updateWorkoutDraft(draft, draft, laterYellow, savedAt);
    expect(reviewed.reduced).toBe(true);
    const complete = completeWorkoutDraft(reviewed, laterYellow, 'completed', savedAt);
    expect(complete.outcome).toBe('completed');
    expect(complete.reduced).toBe(true);
    draft.exerciseResults[0].sets[0].load = 200;
    expect(complete.exerciseResults[0].sets[0].load).toBe(45);

    const red = { ...laterYellow, id: 'later-red', energy: 1, status: 'red' as const };
    expect(() => completeWorkoutDraft(reviewed, red, 'completed', savedAt)).toThrow(
      'Red readiness',
    );
    const stopped = completeWorkoutDraft(reviewed, red, 'stopped', savedAt);
    expect(stopped.outcome).toBe('stopped');
    expect(stopped.exerciseResults[0].sets[0].load).toBe(45);
  });

  it('requires each set to be accounted for and stops strength after pain reaches 5', () => {
    const draft = createWorkoutDraft({ date: green.date, definition }, green, startedAt, 'draft-1');
    expect(() => completeWorkoutDraft(draft, green, 'completed', savedAt)).toThrow('Mark every');
    const severePain = createRecordedWorkoutPain(
      draft,
      {
        exerciseId: 'box-squat',
        bodyArea: 'Back',
        severity: 5,
        actionTaken: 'Stopped',
      },
      savedAt,
      'pain-5',
    );
    draft.exerciseResults[0].painEvents.push(severePain);
    expect(() => updateWorkoutDraft(draft, draft, green, savedAt)).toThrow('Pain at 5');
    expect(() => completeWorkoutDraft(draft, green, 'completed', savedAt)).toThrow('Pain at 5');
    expect(completeWorkoutDraft(draft, green, 'stopped', savedAt).outcome).toBe('stopped');
  });
});

describe('exercise order', () => {
  it('keeps a chosen order on the draft, leaves results in written order, and saves it', () => {
    const draft = createWorkoutDraft({ date: green.date, definition }, green, startedAt, 'draft-1');
    expect(draft.exerciseOrder).toBeUndefined();
    const edited = structuredClone(draft);
    edited.exerciseOrder = [1, 0];
    const saved = updateWorkoutDraft(draft, edited, green, savedAt);
    expect(saved.exerciseOrder).toEqual([1, 0]);
    expect(saved.exerciseResults.map((result) => result.exerciseId)).toEqual([
      'box-squat',
      'bench-press',
    ]);

    for (const result of saved.exerciseResults) {
      result.sets = result.sets.map(() => ({ completed: true, reps: 6, rpe: 6 }));
    }
    saved.warmupComplete = true;
    const session = completeWorkoutDraft(saved, green, 'completed', savedAt);
    expect(session.exerciseOrder).toEqual([1, 0]);

    const cleared = updateWorkoutDraft(
      saved,
      { ...saved, exerciseOrder: undefined },
      green,
      savedAt,
    );
    expect(cleared.exerciseOrder).toBeUndefined();
  });

  it('starts a draft in a remembered order and refuses one that does not fit', () => {
    const draft = createWorkoutDraft(
      { date: green.date, definition, exerciseOrder: [1, 0] },
      green,
      startedAt,
      'draft-1',
    );
    expect(draft.exerciseOrder).toEqual([1, 0]);
    expect(draft.currentExerciseIndex).toBe(1);
    expect(() =>
      createWorkoutDraft({ date: green.date, definition, exerciseOrder: [0] }, green, startedAt),
    ).toThrow('every exercise once');
  });

  it('rejects an order that is not a permutation of the exercises', () => {
    const draft = createWorkoutDraft({ date: green.date, definition }, green, startedAt, 'draft-1');
    for (const order of [[0], [0, 0], [0, 2], [0, 1, 1], [-1, 0]]) {
      expect(() =>
        updateWorkoutDraft(
          draft,
          { ...structuredClone(draft), exerciseOrder: order },
          green,
          savedAt,
        ),
      ).toThrow('every exercise once');
    }
  });
});

describe('shoulder swap', () => {
  const carryDefinition: WorkoutDefinition = {
    id: 'chapter-2-forge-a',
    title: 'Forge A',
    contentVersion: 1,
    exercises: [
      { exerciseId: 'barbell-overhead-press', sets: 3, reps: 5 },
      { exerciseId: 'two-hand-overhead-carry', sets: 2, durationSeconds: '20–30' },
    ],
  };
  const sore = { ...green, id: 'sore', shoulderPain: 3 };
  const start = () =>
    createWorkoutDraft({ date: green.date, definition: carryDefinition }, green, startedAt, 'd');

  it('saves the exercise actually done, keeps the written one, and reads reduced', () => {
    const draft = start();
    expect(draft.reduced).toBe(false);
    const swapped = swapWorkoutExercise(draft, 1, 'front-hold-carry', sore, savedAt);
    expect(swapped.definitionSnapshot.exercises[1]).toEqual({
      exerciseId: 'front-hold-carry',
      sets: 2,
      durationSeconds: '20–30',
    });
    expect(swapped.exerciseResults[1].exerciseId).toBe('front-hold-carry');
    expect(swapped.exerciseResults[1].swappedFrom).toBe('two-hand-overhead-carry');
    expect(swapped.exerciseResults[1].sets).toHaveLength(2);
    expect(swapped.reduced).toBe(true);
    // It survives a later set edit and the saved session.
    const edited = structuredClone(swapped);
    edited.exerciseResults[1].sets[0] = { duration: 25, completed: true };
    const saved = updateWorkoutDraft(swapped, edited, sore, savedAt);
    expect(saved.exerciseResults[1].swappedFrom).toBe('two-hand-overhead-carry');
  });

  it('is only offered at shoulder pain 3 or more, for a named swap, before the first set', () => {
    const draft = start();
    const fine = { ...green, shoulderPain: 2 };
    expect(() => swapWorkoutExercise(draft, 1, 'front-hold-carry', fine, savedAt)).toThrow();
    expect(() => swapWorkoutExercise(draft, 1, 'farmer-carry', sore, savedAt)).toThrow();
    const begun = structuredClone(draft);
    begun.exerciseResults[1].sets[0] = { duration: 25, completed: true };
    expect(() => swapWorkoutExercise(begun, 1, 'front-hold-carry', sore, savedAt)).toThrow();
  });

  it('never swaps on its own: a fresh draft keeps the written exercises', () => {
    const draft = start();
    expect(draft.exerciseResults.map((item) => item.exerciseId)).toEqual([
      'barbell-overhead-press',
      'two-hand-overhead-carry',
    ]);
    expect(draft.exerciseResults.some((item) => item.swappedFrom)).toBe(false);
  });
});

describe('taking a track step in a session', () => {
  const trackDefinition: WorkoutDefinition = {
    id: 'chapter-2-forge-a',
    title: 'Forge A',
    exercises: [
      { exerciseId: 'box-squat', sets: 3, reps: 6 },
      { exerciseId: 'muscle-up', sets: 3, reps: 1, trackId: 'pull' },
    ],
  };
  const start = () =>
    createWorkoutDraft({ date: green.date, definition: trackDefinition }, green, startedAt, 'd');
  const next = { exerciseId: 'band-light-pull-up', sets: 2, reps: '6–8', trackId: 'pull' };

  it('puts the step into the slot before its first set, without marking the session reduced', () => {
    const stepped = stepUpWorkoutExercise(start(), 1, next, savedAt);
    expect(stepped.definitionSnapshot.exercises[1]).toEqual(next);
    expect(stepped.exerciseResults[1]).toEqual({
      exerciseId: 'band-light-pull-up',
      sets: [{}, {}],
      painEvents: [],
    });
    expect(stepped.reduced).toBe(false);
  });

  it('leaves a begun, pained, swapped or untracked slot as it is', () => {
    const begun = start();
    begun.exerciseResults[1].sets[0] = { completed: true, reps: 1 };
    expect(() => stepUpWorkoutExercise(begun, 1, next, savedAt)).toThrow('next time');
    const pained = start();
    pained.exerciseResults[1].painEvents.push({
      timestamp: savedAt,
      bodyArea: 'Shoulder',
      severity: 2,
      actionTaken: 'Continue',
    });
    expect(() => stepUpWorkoutExercise(pained, 1, next, savedAt)).toThrow('next time');
    const sore = { ...green, id: 'sore', shoulderPain: 3, status: 'yellow' as const };
    const swapped = swapWorkoutExercise(start(), 1, 'band-pull-apart', sore, savedAt);
    expect(() => stepUpWorkoutExercise(swapped, 1, next, savedAt)).toThrow();
    expect(() => stepUpWorkoutExercise(start(), 0, next, savedAt)).toThrow('not a skill track');
  });

  it('offers a pike hold or a push-up for a handstand step at neck or shoulder pain 2', () => {
    const handstand: WorkoutDefinition = {
      id: 'chapter-5-forge-a',
      title: 'Forge A',
      contentVersion: 1,
      exercises: [
        { exerciseId: 'chest-to-wall-handstand-hold', sets: 3, durationSeconds: '15–30' },
      ],
    };
    const draft = createWorkoutDraft(
      { date: green.date, definition: handstand },
      green,
      startedAt,
      'h',
    );
    const neck = { ...green, id: 'neck', neckPain: 2 };
    const fine = { ...green, id: 'fine', neckPain: 1, shoulderPain: 1 };
    expect(() => swapWorkoutExercise(draft, 0, 'pike-hold', fine, savedAt)).toThrow();
    const swapped = swapWorkoutExercise(draft, 0, 'pike-hold', neck, savedAt);
    expect(swapped.exerciseResults[0]).toMatchObject({
      exerciseId: 'pike-hold',
      swappedFrom: 'chest-to-wall-handstand-hold',
    });
    expect(swapped.definitionSnapshot.exercises[0]).toEqual({
      exerciseId: 'pike-hold',
      sets: 3,
      durationSeconds: '20–30',
    });
    expect(swapped.reduced).toBe(true);
    // The other named option works too; one that is not named does not.
    expect(
      swapWorkoutExercise(draft, 0, 'push-up', neck, savedAt).exerciseResults[0].exerciseId,
    ).toBe('push-up');
    expect(() => swapWorkoutExercise(draft, 0, 'band-pull-apart', neck, savedAt)).toThrow();
  });
});

/** Every set marked done, with the warm-up and finish, so the draft can be completed. */
function allDone(draft: WorkoutDraft): WorkoutDraft {
  const done = structuredClone(draft);
  for (const result of done.exerciseResults) {
    result.sets = result.sets.map((set) => ({ ...set, completed: true }));
  }
  done.warmupComplete = true;
  done.finishComplete = true;
  return done;
}

describe('Chapter III press stance', () => {
  const pressIndex = chapterThreeForgeB.exercises.findIndex(
    (exercise) => exercise.exerciseId === 'one-arm-db-overhead-press',
  );
  const start = () =>
    createWorkoutDraft(
      { date: green.date, definition: structuredClone(chapterThreeForgeB) },
      green,
      startedAt,
      'stance',
    );

  it('saves the half-kneeling press as its own exercise, with the same dose, not reduced', () => {
    const switched = switchWorkoutStance(start(), pressIndex, savedAt);
    expect(switched.definitionSnapshot.exercises[pressIndex]).toEqual({
      exerciseId: 'half-kneeling-one-arm-db-press',
      sets: 3,
      reps: 8,
      perSide: true,
      stanceChoice: 'one-arm-db-overhead-press',
    });
    expect(switched.exerciseResults[pressIndex]).toEqual({
      exerciseId: 'half-kneeling-one-arm-db-press',
      sets: [{}, {}, {}],
      painEvents: [],
      stanceFrom: 'one-arm-db-overhead-press',
    });
    expect(switched.reduced).toBe(false);

    // It survives a set save, and the finished session is an exposure of the half-kneeling press.
    const edited = structuredClone(switched);
    edited.exerciseResults[pressIndex].sets[0] = { reps: 8, load: 20, completed: true };
    const saved = updateWorkoutDraft(switched, edited, green, savedAt);
    expect(saved.exerciseResults[pressIndex].stanceFrom).toBe('one-arm-db-overhead-press');
    const finished = updateWorkoutDraft(saved, allDone(saved), green, savedAt);
    const session = completeWorkoutDraft(finished, green, 'completed', savedAt) as WorkoutSession;
    expect(session.reduced).toBe(false);
    expect(exposuresFor([session], 'half-kneeling-one-arm-db-press')).toHaveLength(1);
    expect(exposuresFor([session], 'one-arm-db-overhead-press')).toHaveLength(0);
  });

  it('goes back to the seated press before the first set', () => {
    const twice = switchWorkoutStance(switchWorkoutStance(start(), pressIndex, savedAt), pressIndex);
    expect(twice.definitionSnapshot.exercises[pressIndex]).toEqual(
      chapterThreeForgeB.exercises[pressIndex],
    );
    expect(twice.exerciseResults[pressIndex].exerciseId).toBe('one-arm-db-overhead-press');
    expect(twice.exerciseResults[pressIndex].stanceFrom).toBeUndefined();
  });

  it('is offered only where the prescription names a stance, and only before the first set', () => {
    const draft = start();
    expect(() => switchWorkoutStance(draft, 0, savedAt)).toThrow('no other stance');
    const begun = structuredClone(draft);
    begun.exerciseResults[pressIndex].sets[0] = { reps: 8, completed: true };
    expect(() => switchWorkoutStance(begun, pressIndex, savedAt)).toThrow('before the first set');
    // A fresh draft never changes stance on its own.
    expect(draft.exerciseResults[pressIndex].exerciseId).toBe('one-arm-db-overhead-press');
  });
});

describe('Restoration on a Red day', () => {
  const red: ReadinessCheck = { ...green, id: 'red', backPain: 6, status: 'red' };

  it('starts and completes each chapter’s Restoration, and still blocks a Forge', () => {
    for (const restoration of [chapterTwoRestoration, chapterThreeRestoration]) {
      const draft = createWorkoutDraft(
        { date: red.date, definition: restoration },
        red,
        startedAt,
        restoration.id,
      );
      expect(draft.reduced).toBe(true);
      const finished = updateWorkoutDraft(draft, allDone(draft), red, savedAt);
      expect(completeWorkoutDraft(finished, red, 'completed', savedAt).outcome).toBe('completed');
    }
    expect(() =>
      createWorkoutDraft({ date: red.date, definition: chapterThreeForgeB }, red, startedAt, 'x'),
    ).toThrow('Red readiness');
  });
});
