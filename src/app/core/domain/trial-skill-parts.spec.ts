import { describe, expect, it } from 'vitest';
import type {
  CompletedSet,
  ReadinessCheck,
  TrialDraft,
  TrialPhaseResult,
  TrialSkillPart,
  WorkoutSession,
} from './models';
import { campaignDayResolver } from '../program/campaign-day';
import type { TrackContext } from '../program/skill-track-progress';
import {
  completeTrialDraft,
  createRecordedTrialPain,
  createTrialDraft,
  stopTrialDraft,
  updateTrialDraft,
  validateCompletedTrialResult,
} from './trial-draft';
import {
  SKILL_PARTS_PHASE_ID,
  normalizeSkillResults,
  skillPartDose,
  skillPartsForTrial,
  stepPainGated,
  trialSkillParts,
} from './trial-skill-parts';

// Day 1 is Monday, Oct 5; the Gate Trial passes Monday, Nov 2, so Chapter II starts that day
// and its Three-Mile Trial is first attempted Monday, Nov 30.
const gatePass = { trialId: 'gate-trial', date: '2026-11-02' };
const date = '2026-11-30';

function readiness(id: string, changes: Partial<ReadinessCheck> = {}): ReadinessCheck {
  return {
    id,
    date,
    checkedAt: `${date}T11:00:00.000Z`,
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
    ...changes,
  };
}
const green = readiness('green');

let count = 0;
function session(
  sessionDate: string,
  exerciseId: string,
  reps: number,
  extra: Partial<CompletedSet> = {},
): WorkoutSession {
  count += 1;
  const sets = Array.from({ length: 3 }, (_, index) => ({
    completed: true,
    reps,
    ...extra,
    ...(index === 2 ? { rpe: 7 } : {}),
  }));
  return {
    id: `s${count}`,
    date: sessionDate,
    workoutDefinitionId: 'chapter-2-forge-b',
    readinessId: 'green',
    outcome: 'completed',
    completedAt: `${sessionDate}T09:00:00.000Z`,
    definitionSnapshot: {
      id: 'chapter-2-forge-b',
      title: 'Forge B',
      exercises: [{ exerciseId, sets: 3, reps: '6–8' }],
    },
    exerciseResults: [{ exerciseId, painEvents: [], sets }],
  };
}

function context(sessions: WorkoutSession[], trials = [gatePass]): TrackContext {
  return {
    sessions,
    readinessById: new Map([['green', green]]),
    dayOf: campaignDayResolver('2026-10-05', trials),
  };
}

const pikePart: TrialSkillPart = {
  trackId: 'push',
  stepExerciseId: 'pike-push-up',
  stepBelowExerciseId: 'push-up',
  passedOn: '2026-11-19',
};
const gatedPart: TrialSkillPart = {
  trackId: 'push',
  stepExerciseId: 'feet-elevated-pike-push-up',
  stepBelowExerciseId: 'pike-push-up',
  passedOn: '2026-11-19',
};

function completePhases(): TrialPhaseResult[] {
  return [
    {
      phaseId: 'three-mile-walk',
      metrics: { distanceMiles: 3, durationMinutes: 52, rpe: 6 },
      responses: { knee: 'Fine', back: 'Fine', recoveryAfterFiveMinutes: 'Settled' },
    },
    {
      phaseId: 'suitcase-carry',
      metrics: { loadPounds: 30, rightSeconds: 60, leftSeconds: 60 },
      responses: { grip: 'moderate', core: 'easy', posture: 'easy' },
    },
    { phaseId: 'stair-test', metrics: { flights: 3, breathlessness: 5 } },
    { phaseId: 'leadership-reflection', responses: { attentive: 'Mostly', behavior: 'Listen' } },
    { phaseId: 'psalm-and-prayer', metrics: { confirmed: true } },
  ];
}

function start(parts: TrialSkillPart[], check = green): TrialDraft {
  return createTrialDraft(
    'three-mile-trial',
    date,
    check,
    `${date}T12:00:00.000Z`,
    'tm-skill',
    parts,
  );
}

/** Walks the draft through the walk, carry and stairs; the next move is past the stairs. */
function throughStairs(draft: TrialDraft, check = green): TrialDraft {
  const phases = completePhases();
  for (let index = 0; index < 2; index++) {
    const edited = structuredClone(draft);
    edited.phaseResults[index] = phases[index];
    edited.currentPhaseIndex = index + 1;
    draft = updateTrialDraft(draft, edited, check, `${date}T12:0${index + 1}:00.000Z`);
  }
  const edited = structuredClone(draft);
  edited.phaseResults[2] = phases[2];
  return updateTrialDraft(draft, edited, check, `${date}T12:03:00.000Z`);
}

function finish(draft: TrialDraft, check = green): TrialDraft {
  const phases = completePhases();
  for (let index = 2; index < phases.length; index++) {
    const edited = structuredClone(draft);
    edited.phaseResults[index] = phases[index];
    if (index < phases.length - 1) edited.currentPhaseIndex = index + 1;
    draft = updateTrialDraft(draft, edited, check, `${date}T12:1${index}:00.000Z`);
  }
  return draft;
}

describe('which steps become trial parts', () => {
  it('adds a step first passed in Chapter II to the Three-Mile Trial, with the step below', () => {
    const parts = trialSkillParts(2, context([session('2026-11-19', 'pike-push-up', 10)]));
    expect(parts).toEqual([pikePart]);
  });

  it('never gives the Gate Trial skill parts: no track is live in Chapter I', () => {
    const chapterOne = context([session('2026-10-15', 'push-up', 12)], []);
    expect(trialSkillParts(1, chapterOne)).toEqual([]);
    expect(skillPartsForTrial('gate-trial', chapterOne)).toEqual([]);
  });

  it('carries a Chapter I pass into Chapter II’s trial once, with no step below', () => {
    const parts = skillPartsForTrial(
      'three-mile-trial',
      context([session('2026-10-15', 'push-up', 12), session('2026-11-12', 'push-up', 12)]),
    );
    expect(parts).toEqual([{ trackId: 'push', stepExerciseId: 'push-up', passedOn: '2026-10-15' }]);
  });

  it('takes a step passed after the attempt began into a later attempt only', () => {
    const draft = start(trialSkillParts(2, context([])));
    const later = trialSkillParts(2, context([session('2026-11-19', 'pike-push-up', 10)]));
    expect(draft.definitionSnapshot.skillParts).toBeUndefined();
    expect(later).toEqual([pikePart]);
  });

  it('uses only passes: a session that misses the criteria adds nothing', () => {
    expect(trialSkillParts(2, context([session('2026-11-19', 'pike-push-up', 8)]))).toEqual([]);
  });
});

describe('the pain gate for setting a part aside', () => {
  it('follows each step’s readiness gate', () => {
    expect(stepPainGated('pike-push-up', readiness('n', { neckPain: 4 }))).toBe(false);
    expect(stepPainGated('assisted-pull-up', readiness('s', { shoulderPain: 5 }))).toBe(false);
    expect(stepPainGated('feet-elevated-pike-push-up', readiness('n', { neckPain: 2 }))).toBe(true);
    expect(stepPainGated('feet-elevated-pike-push-up', readiness('n', { neckPain: 1 }))).toBe(
      false,
    );
    expect(stepPainGated('wall-walk', readiness('s', { shoulderPain: 2 }))).toBe(true);
    expect(stepPainGated('muscle-up', readiness('s', { shoulderPain: 2 }))).toBe(false);
    expect(stepPainGated('muscle-up', readiness('s', { shoulderPain: 3 }))).toBe(true);
    expect(stepPainGated('wall-walk', undefined)).toBe(false);
  });

  it('counts optional sets in the done step’s own unit', () => {
    expect(skillPartDose('pike-push-up')).toEqual({ sets: 3, unit: 'reps' });
    expect(skillPartDose('wall-plank-hold')).toEqual({ sets: 3, unit: 'seconds' });
    expect(skillPartDose('freestanding-handstand-attempts')).toBeUndefined();
  });
});

describe('recording skill parts in a trial', () => {
  it('copies the parts into the snapshot and leaves a trial without them unchanged', () => {
    const draft = start([pikePart]);
    expect(draft.definitionSnapshot.skillParts).toEqual([pikePart]);
    expect(draft.skillResults).toEqual([{ trackId: 'push', stepExerciseId: 'pike-push-up' }]);
    const plain = start([]);
    expect(plain.definitionSnapshot.skillParts).toBeUndefined();
    expect('skillResults' in plain).toBe(false);
  });

  it('records the part before moving past the stairs', () => {
    const draft = throughStairs(start([pikePart]));
    const edited = structuredClone(draft);
    edited.currentPhaseIndex = 3;
    expect(() => updateTrialDraft(draft, edited, green, `${date}T12:05:00.000Z`)).toThrow(
      'Record each skill part',
    );
    edited.skillResults = [
      { trackId: 'push', stepExerciseId: 'pike-push-up', outcome: 'step-below' },
    ];
    const moved = updateTrialDraft(draft, edited, green, `${date}T12:05:00.000Z`);
    expect(moved.currentPhaseIndex).toBe(3);
    expect(moved.skillResults?.[0]).toEqual({
      trackId: 'push',
      stepExerciseId: 'pike-push-up',
      outcome: 'step-below',
      exerciseIdDone: 'push-up',
    });
  });

  it('saves the parts with the completed result, sets included', () => {
    let draft = throughStairs(start([pikePart]));
    const edited = structuredClone(draft);
    edited.skillResults = [
      {
        trackId: 'push',
        stepExerciseId: 'pike-push-up',
        outcome: 'demonstrated',
        sets: [{ reps: 10 }, { reps: 10 }, {}],
      },
    ];
    draft = finish(updateTrialDraft(draft, edited, green, `${date}T12:05:00.000Z`));
    const result = completeTrialDraft(draft, green, `${date}T13:00:00.000Z`);
    expect(result.skillResults).toEqual([
      {
        trackId: 'push',
        stepExerciseId: 'pike-push-up',
        outcome: 'demonstrated',
        exerciseIdDone: 'pike-push-up',
        sets: [{ reps: 10 }, { reps: 10 }, {}],
      },
    ]);
    expect(validateCompletedTrialResult(result)).toEqual(result);
    const missing = { ...result, skillResults: undefined };
    expect(() => validateCompletedTrialResult(missing)).toThrow('skill parts changed');
  });

  it('allows "Set aside for pain" only on a day that meets the step’s gate', () => {
    const sore = readiness('sore', { neckPain: 2 });
    const aside = [
      {
        trackId: 'push',
        stepExerciseId: 'feet-elevated-pike-push-up',
        outcome: 'set-aside-for-pain' as const,
      },
    ];
    let draft = throughStairs(start([gatedPart], sore), sore);
    let edited = structuredClone(draft);
    edited.skillResults = aside;
    edited.currentPhaseIndex = 3;
    draft = finish(updateTrialDraft(draft, edited, sore, `${date}T12:05:00.000Z`), sore);
    expect(completeTrialDraft(draft, sore, `${date}T13:00:00.000Z`).skillResults?.[0].outcome).toBe(
      'set-aside-for-pain',
    );

    const pike = throughStairs(start([pikePart], sore), sore);
    edited = structuredClone(pike);
    edited.skillResults = [{ ...aside[0], stepExerciseId: 'pike-push-up' }];
    edited.currentPhaseIndex = 3;
    expect(() => updateTrialDraft(pike, edited, sore, `${date}T12:05:00.000Z`)).toThrow(
      'can be set aside only',
    );
  });

  it('refuses an outcome that does not fit the part', () => {
    const snapshot = start([
      { trackId: 'push', stepExerciseId: 'push-up', passedOn: '2026-10-15' },
    ]).definitionSnapshot;
    expect(() =>
      normalizeSkillResults(
        [{ trackId: 'push', stepExerciseId: 'push-up', outcome: 'step-below' }],
        snapshot,
      ),
    ).toThrow('no step below');
    expect(() =>
      normalizeSkillResults(
        [
          {
            trackId: 'push',
            stepExerciseId: 'push-up',
            outcome: 'demonstrated',
            exerciseIdDone: 'pike-push-up',
          },
        ],
        snapshot,
      ),
    ).toThrow('different exercise');
    expect(() => normalizeSkillResults([], snapshot)).toThrow('skill parts changed');
    expect(
      normalizeSkillResults(
        [
          {
            trackId: 'push',
            stepExerciseId: 'push-up',
            outcome: 'set-aside-for-pain',
            sets: [{ reps: 3 }],
          },
        ],
        snapshot,
      ),
    ).toEqual([{ trackId: 'push', stepExerciseId: 'push-up', outcome: 'set-aside-for-pain' }]);
  });

  it('keeps pain notes and partial parts with a stopped attempt', () => {
    const draft = start([pikePart]);
    const pain = createRecordedTrialPain(
      draft,
      {
        phaseId: SKILL_PARTS_PHASE_ID,
        bodyArea: 'Shoulder',
        severity: 2,
        actionTaken: 'continue',
        exerciseId: 'push-up',
      },
      `${date}T12:10:00.000Z`,
    );
    expect(pain.trialPhaseId).toBe(SKILL_PARTS_PHASE_ID);
    expect(() =>
      createRecordedTrialPain(
        start([]),
        { phaseId: SKILL_PARTS_PHASE_ID, bodyArea: 'Neck', severity: 1, actionTaken: 'continue' },
        `${date}T12:10:00.000Z`,
      ),
    ).toThrow('physical Three-Mile Trial phase');
    const stopped = stopTrialDraft(draft, `${date}T12:20:00.000Z`);
    expect(stopped.skillResults).toEqual(draft.skillResults);
    expect(stopped.definitionSnapshot.skillParts).toEqual([pikePart]);
  });

  it('reads a draft and a result saved before skill parts exactly as before', () => {
    const older = start([]);
    const edited = structuredClone(older);
    edited.phaseResults[0] = completePhases()[0];
    const saved = updateTrialDraft(older, edited, green, `${date}T12:01:00.000Z`);
    expect('skillResults' in saved).toBe(false);
    const result = completeTrialDraft(
      finish(throughStairs(start([]))),
      green,
      `${date}T13:00:00.000Z`,
    );
    expect('skillResults' in result).toBe(false);
    expect(validateCompletedTrialResult(result)).toEqual(result);
  });
});
