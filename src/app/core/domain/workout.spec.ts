import { describe, expect, it } from 'vitest';
import type { ReadinessCheck, WorkoutDefinition, WorkoutSession } from './models';
import {
  completeWorkoutDraft,
  createRecordedWorkoutPain,
  createWorkoutDraft,
  previousWorkoutLoad,
  updateWorkoutDraft,
} from './workout';

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

  it('shows only a prior completed load, with reduced and pain context', () => {
    const completedDraft = createWorkoutDraft(
      { date: green.date, definition },
      green,
      startedAt,
      'base',
    );
    for (const result of completedDraft.exerciseResults) {
      result.sets = result.sets.map(() => ({ completed: true }));
    }
    const base = completeWorkoutDraft(completedDraft, green, 'completed', savedAt);
    base.exerciseResults[0].sets[2] = { load: 45, reps: 6, completed: true };
    base.exerciseResults[0].painEvents.push({
      timestamp: savedAt,
      bodyArea: 'Knee',
      severity: 3,
      exerciseId: 'box-squat',
      actionTaken: 'Stopped',
    });
    base.reduced = true;
    const stopped: WorkoutSession = {
      ...structuredClone(base),
      id: 'stopped',
      date: '2026-09-29',
      outcome: 'stopped',
    };
    stopped.exerciseResults[0].sets[2].load = 75;
    expect(previousWorkoutLoad([base, stopped], 'box-squat')).toEqual({
      load: 45,
      date: green.date,
      sessionId: 'base',
      reduced: true,
      painTriggered: true,
    });
    expect(previousWorkoutLoad([stopped], 'box-squat')).toBeUndefined();
    expect(previousWorkoutLoad([base], 'bench-press')).toBeUndefined();
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
