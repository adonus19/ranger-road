import { describe, expect, it } from 'vitest';
import type {
  CompletedSet,
  ExercisePrescription,
  ExerciseResult,
  ReadinessCheck,
  TrackStepChoice,
  WorkoutSession,
} from '../domain/models';
import { campaignDayResolver } from '../state/progression-history';
import { chapterTwoForgeA, chapterTwoForgeB } from './chapter-two-workouts';
import { CUSTOM_FORGE_LIBRARY } from './custom-forge-library';
import { getExerciseGuide } from './exercise-guides';
import { shoulderSwapFor } from './readiness-swaps';
import {
  createTrackStepChoice,
  currentStepIndex,
  sessionMeetsStep,
  stepPasses,
  stepPrescription,
  trackStatus,
  withCurrentSteps,
  type TrackContext,
} from './skill-track-progress';
import { SKILL_TRACKS, recordsBandHelp, skillTrack, trackStepOf } from './skill-tracks';

// Day 1 is Monday, Oct 5; the Gate Trial passes Monday, Nov 2, so Chapter II starts that day.
const trials = [{ trialId: 'gate-trial', date: '2026-11-02' }];
const dayOf = campaignDayResolver('2026-10-05', trials);

function check(id: string, energy: number): ReadinessCheck {
  return {
    id,
    date: '2026-10-05',
    checkedAt: '2026-10-05T07:00:00.000Z',
    sleepHours: 7,
    poorSleep: false,
    energy,
    backPain: 0,
    shoulderPain: 0,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status: energy === 2 ? 'yellow' : 'green',
  } as ReadinessCheck;
}
const readinessById = new Map([
  ['green', check('green', 4)],
  ['yellow', check('yellow', 2)],
]);

const pull = skillTrack('pull')!;
const push = skillTrack('push')!;

let count = 0;
function session(
  date: string,
  result: Partial<ExerciseResult> & { exerciseId: string; sets: CompletedSet[] },
  options: {
    prescription?: ExercisePrescription;
    readiness?: 'green' | 'yellow';
    outcome?: 'completed' | 'stopped';
    custom?: boolean;
  } = {},
): WorkoutSession {
  count += 1;
  const prescription = options.prescription ?? { exerciseId: result.exerciseId, sets: 3 };
  return {
    id: `s${count}`,
    date,
    workoutDefinitionId: options.custom ? 'custom-forge' : 'chapter-2-forge-a',
    readinessId: options.readiness ?? 'green',
    outcome: options.outcome ?? 'completed',
    completedAt: `${date}T09:00:00.000Z`,
    ...(options.custom ? { kind: 'custom' as const } : {}),
    definitionSnapshot: { id: 'chapter-2-forge-a', title: 'Forge A', exercises: [prescription] },
    exerciseResults: [{ painEvents: [], ...result }],
  };
}

function sets(count: number, set: CompletedSet, finalEffort = 7): CompletedSet[] {
  return Array.from({ length: count }, (_, index) => ({
    completed: true,
    ...set,
    ...(index === count - 1 ? { rpe: finalEffort } : {}),
  }));
}

function context(sessions: WorkoutSession[]): TrackContext {
  return { sessions, readinessById, dayOf };
}

const pullUpWritten: ExercisePrescription = {
  exerciseId: 'assisted-pull-up',
  sets: 3,
  reps: '6–8',
  trackId: 'pull',
};

function choice(trackId: string, exerciseId: string, takenAt: string): TrackStepChoice {
  return { id: `${trackId}-${exerciseId}`, trackId, exerciseId, takenAt };
}

describe('skill track content', () => {
  it('names every step as an exercise with a guide and a builder dose or chapter dose', () => {
    for (const track of SKILL_TRACKS) {
      for (const step of track.steps) {
        expect(getExerciseGuide(step.exerciseId), step.exerciseId).toBeTruthy();
        expect(CUSTOM_FORGE_LIBRARY[step.exerciseId], step.exerciseId).toBeTruthy();
        expect(step.passedWhen.length).toBeGreaterThan(3);
      }
    }
  });

  it('keeps each track’s earliest chapters in order, as the catalog lists them', () => {
    const chapters = (id: string) => skillTrack(id)!.steps.map((step) => step.earliestChapter);
    expect(chapters('pull')).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(chapters('push')).toEqual([1, 2, 3, 5, 7]);
    expect(chapters('handstand')).toEqual([5, 5, 6, 6, 7]);
    expect(chapters('planche')).toEqual([5, 5, 6, 7, 8, 9, 9, 9]);
  });

  it('puts the pull and push tracks in Chapter II’s Forge A and B slots', () => {
    const slot = (exercises: readonly ExercisePrescription[], trackId: string) =>
      exercises.filter((exercise) => exercise.trackId === trackId).map((item) => item.exerciseId);
    expect(slot(chapterTwoForgeA.exercises, 'pull')).toEqual(['assisted-pull-up']);
    expect(slot(chapterTwoForgeB.exercises, 'push')).toEqual(['push-up']);
    expect(pull.steps[0].exerciseId).toBe('assisted-pull-up');
    expect(push.steps[0].exerciseId).toBe('push-up');
  });

  it('finds a step’s track, and records band help only where the criteria count it', () => {
    expect(trackStepOf('pike-push-up')).toMatchObject({ index: 1 });
    expect(trackStepOf('box-squat')).toBeUndefined();
    expect(recordsBandHelp('band-light-pull-up')).toBe(true);
    expect(recordsBandHelp('pull-up')).toBe(false);
  });

  it('offers the shoulder swap on the muscle-up steps', () => {
    expect(shoulderSwapFor('band-assisted-muscle-up', 3)?.toId).toBe('band-pull-apart');
  });
});

describe('passing a step', () => {
  const step1 = pull.steps[0];

  it('passes the assisted pull-up at the top of the session’s range with 20 lb or less', () => {
    const passed = session(
      '2026-11-02',
      { exerciseId: 'assisted-pull-up', sets: sets(3, { reps: 8, assistance: 20 }) },
      { prescription: pullUpWritten },
    );
    expect(sessionMeetsStep(passed, step1, readinessById)).toBe(true);
  });

  it('does not pass below the top of the range, with more band help, or help left blank', () => {
    const cases: CompletedSet[] = [
      { reps: 7, assistance: 20 },
      { reps: 8, assistance: 25 },
      { reps: 8 },
    ];
    for (const set of cases) {
      const tried = session(
        '2026-11-02',
        { exerciseId: 'assisted-pull-up', sets: sets(3, set) },
        { prescription: pullUpWritten },
      );
      expect(sessionMeetsStep(tried, step1, readinessById)).toBe(false);
    }
  });

  it('needs the final effort recorded and at 7 or less', () => {
    const hard = session(
      '2026-11-02',
      { exerciseId: 'push-up', sets: sets(3, { reps: 12 }, 8) },
      { prescription: { exerciseId: 'push-up', sets: 3, reps: '8–12' } },
    );
    const blank = session('2026-11-02', {
      exerciseId: 'push-up',
      sets: [1, 2, 3].map(() => ({ completed: true, reps: 12 })),
    });
    expect(sessionMeetsStep(hard, push.steps[0], readinessById)).toBe(false);
    expect(sessionMeetsStep(blank, push.steps[0], readinessById)).toBe(false);
  });

  it('never counts a custom Forge, a stopped session or a Yellow day', () => {
    const work = { exerciseId: 'push-up', sets: sets(3, { reps: 12 }) };
    for (const tried of [
      session('2026-11-02', work, { custom: true }),
      session('2026-11-02', work, { outcome: 'stopped' }),
      session('2026-11-02', work, { readiness: 'yellow' }),
    ]) {
      expect(sessionMeetsStep(tried, push.steps[0], readinessById)).toBe(false);
    }
    expect(sessionMeetsStep(session('2026-11-02', work), push.steps[0], readinessById)).toBe(true);
  });

  it('never counts the step with a pain note, a substitute, a modification or a swap', () => {
    const base = { exerciseId: 'push-up', sets: sets(3, { reps: 12 }) };
    for (const extra of [
      {
        painEvents: [
          {
            timestamp: '2026-11-02T09:00:00.000Z',
            bodyArea: 'Shoulder',
            severity: 2,
            actionTaken: 'x',
          },
        ],
      },
      { substitutionId: 'knee-push-up' },
      { modificationNotes: 'Hands on the bench.' },
      { swappedFrom: 'pike-hold' },
    ]) {
      expect(
        sessionMeetsStep(
          session('2026-11-02', { ...base, ...extra }),
          push.steps[0],
          readinessById,
        ),
      ).toBe(false);
    }
  });

  it('never counts a muscle-up step that was swapped to band pull-aparts', () => {
    const swapped = session('2026-11-02', {
      exerciseId: 'band-pull-apart',
      swappedFrom: 'muscle-up',
      sets: sets(3, { reps: 12 }),
    });
    expect(stepPasses(pull, context([swapped]))).toEqual([]);
  });

  it('checks the counted part of a two-part step and counts kick-ups across sets', () => {
    const bandLight = session('2026-11-09', {
      exerciseId: 'band-light-pull-up',
      sets: sets(3, { reps: 5, assistance: 10 }),
    });
    expect(sessionMeetsStep(bandLight, pull.steps[1], readinessById)).toBe(true);
    const kickUps = session('2026-11-09', {
      exerciseId: 'kick-up-to-wall',
      sets: [
        { completed: true, reps: 3 },
        { completed: true, reps: 2, rpe: 6 },
      ],
    });
    const kickUp = skillTrack('handstand')!.steps[3];
    expect(sessionMeetsStep(kickUps, kickUp, readinessById)).toBe(true);
  });

  it('never reads a step with nothing to count as passed', () => {
    const freestanding = skillTrack('handstand')!.steps[4];
    const tried = session('2026-11-09', {
      exerciseId: freestanding.exerciseId,
      sets: sets(1, { reps: 5 }, 5),
    });
    expect(sessionMeetsStep(tried, freestanding, readinessById)).toBe(false);
  });

  it('records the first pass with the chapter it happened in', () => {
    const chapterOne = session(
      '2026-10-22',
      { exerciseId: 'push-up', sets: sets(3, { reps: 12 }) },
      { prescription: { exerciseId: 'push-up', sets: 3, reps: '8–12' } },
    );
    const chapterTwo = session('2026-11-05', {
      exerciseId: 'push-up',
      sets: sets(3, { reps: 12 }),
    });
    expect(stepPasses(push, context([chapterTwo, chapterOne]))).toEqual([
      { exerciseId: 'push-up', sessionId: chapterOne.id, date: '2026-10-22', chapter: 1 },
    ]);
  });
});

describe('the next step', () => {
  const passedPushUps = session('2026-11-05', {
    exerciseId: 'push-up',
    sets: sets(3, { reps: 12 }),
  });

  it('is at step 1 with no choices, and at the newest choice otherwise', () => {
    expect(currentStepIndex(push, [])).toBe(0);
    expect(
      currentStepIndex(push, [
        choice('push', 'pike-push-up', '2026-11-05T10:00:00.000Z'),
        choice('push', 'feet-elevated-pike-push-up', '2026-12-01T10:00:00.000Z'),
        choice('pull', 'band-light-pull-up', '2026-12-02T10:00:00.000Z'),
      ]),
    ).toBe(2);
    // A choice the content no longer lists is ignored.
    expect(currentStepIndex(push, [choice('push', 'gone', '2027-01-01T00:00:00.000Z')])).toBe(0);
  });

  it('is available once the current step is passed and its chapter has come', () => {
    const status = trackStatus(push, [], context([passedPushUps]), 2);
    expect(status).toMatchObject({ currentIndex: 0, nextAvailable: true });
    expect(status.next?.exerciseId).toBe('pike-push-up');
  });

  it('waits for the next step’s earliest chapter, and says nothing about being behind', () => {
    const pike = session('2026-11-12', { exerciseId: 'pike-push-up', sets: sets(3, { reps: 10 }) });
    const status = trackStatus(
      push,
      [choice('push', 'pike-push-up', '2026-11-05T10:00:00.000Z')],
      context([passedPushUps, pike]),
      2,
    );
    expect(status.current.exerciseId).toBe('pike-push-up');
    expect(status.passes.map((pass) => pass.exerciseId)).toEqual(['push-up', 'pike-push-up']);
    expect(status.nextAvailable).toBe(false);
    expect(
      trackStatus(push, [choice('push', 'pike-push-up', 'x')], context([pike]), 3).nextAvailable,
    ).toBe(true);
    expect(Object.keys(status).sort()).toEqual(
      ['current', 'currentIndex', 'next', 'nextAvailable', 'passes', 'previous', 'track'].sort(),
    );
  });

  it('is not available before the current step is passed, or from a custom Forge', () => {
    const custom = session(
      '2026-11-05',
      { exerciseId: 'push-up', sets: sets(3, { reps: 12 }) },
      { custom: true },
    );
    expect(trackStatus(push, [], context([custom]), 2).nextAvailable).toBe(false);
    expect(trackStatus(push, [], context([]), 2).nextAvailable).toBe(false);
  });

  it('takes only the step right after the current one', () => {
    const taken = createTrackStepChoice(
      'push',
      'pike-push-up',
      [],
      '2026-11-05T10:00:00.000Z',
      'c1',
    );
    expect(taken).toEqual({
      id: 'c1',
      trackId: 'push',
      exerciseId: 'pike-push-up',
      takenAt: '2026-11-05T10:00:00.000Z',
    });
    expect(() => createTrackStepChoice('push', 'wall-handstand-push-up', [])).toThrow(
      'not the next step',
    );
    expect(() => createTrackStepChoice('push', 'push-up', [])).toThrow('not the next step');
    expect(() => createTrackStepChoice('nope', 'push-up', [])).toThrow('not in the program');
  });

  it('goes back one step at a time, and the newest choice is the current step', () => {
    const up = createTrackStepChoice('push', 'pike-push-up', [], '2026-11-05T10:00:00.000Z', 'c1');
    expect(() => createTrackStepChoice('push', 'push-up', [], undefined, 'x')).toThrow();
    const back = createTrackStepChoice('push', 'push-up', [up], '2026-11-12T10:00:00.000Z', 'c2');
    expect(back.exerciseId).toBe('push-up');
    const push = skillTrack('push')!;
    expect(currentStepIndex(push, [up, back])).toBe(0);
    // Two steps back, or staying put, is not a choice.
    const twoUp = createTrackStepChoice(
      'push',
      'feet-elevated-pike-push-up',
      [up],
      '2026-11-06T10:00:00.000Z',
      'c3',
    );
    expect(() => createTrackStepChoice('push', 'push-up', [up, twoUp], undefined, 'y')).toThrow();
    expect(() =>
      createTrackStepChoice('push', 'feet-elevated-pike-push-up', [up, twoUp]),
    ).toThrow();
  });

  it('offers the previous step in the status once past the first, and keeps earlier passes', () => {
    const push = skillTrack('push')!;
    const up = createTrackStepChoice('push', 'pike-push-up', [], '2026-11-05T10:00:00.000Z', 'c1');
    const context = { sessions: [], readinessById: new Map(), dayOf: () => null };
    expect(trackStatus(push, [], context, 3).previous).toBeUndefined();
    expect(trackStatus(push, [up], context, 3).previous?.exerciseId).toBe('push-up');
  });
});

describe('a track slot in a workout', () => {
  it('keeps the written exercise at step 1', () => {
    expect(withCurrentSteps(chapterTwoForgeA, []).exercises).toEqual(chapterTwoForgeA.exercises);
  });

  it('holds the current step, with the slot’s dose when it is counted the same way', () => {
    const resolved = withCurrentSteps(chapterTwoForgeB, [
      choice('push', 'pike-push-up', '2026-11-05T10:00:00.000Z'),
    ]);
    expect(resolved.exercises[3]).toEqual({
      exerciseId: 'pike-push-up',
      sets: 3,
      reps: '8–12',
      notes: 'Submaximal sets. Never to failure.',
      trackId: 'push',
    });
    expect(resolved.exercises.filter((item, index) => index !== 3)).toEqual(
      chapterTwoForgeB.exercises.filter((item, index) => index !== 3),
    );
  });

  it('puts the step’s own catalog note first', () => {
    expect(stepPrescription(pullUpWritten, 'band-light-pull-up')).toEqual({
      exerciseId: 'band-light-pull-up',
      sets: 3,
      reps: '6–8',
      notes: 'Band-light reps, then 3 slow negatives.',
      trackId: 'pull',
    });
  });

  it('takes the catalog dose when the step is counted the other way', () => {
    expect(
      stepPrescription(
        { exerciseId: 'wall-walk', sets: 3, reps: '1–2', trackId: 'handstand' },
        'chest-to-wall-handstand-hold',
      ),
    ).toEqual({
      exerciseId: 'chest-to-wall-handstand-hold',
      sets: 3,
      durationSeconds: '15–30',
      trackId: 'handstand',
    });
  });
});
