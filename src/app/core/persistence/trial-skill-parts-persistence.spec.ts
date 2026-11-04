import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  TrialDraft,
  TrialPhaseResult,
  WorkoutSession,
} from '../domain/models';
import { createGateTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { RoadDatabase } from './road-database';

// Day 1 is Monday, Oct 5. The Gate Trial passes Monday, Nov 2, so Chapter II runs Weeks 5–8
// and the Three-Mile Trial's first attempt is Monday, Nov 30.
vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date(2026, 10, 30, 13, 0));
afterAll(() => vi.useRealTimers());

const date = '2026-11-30';

function check(id: string, day: string): ReadinessCheck {
  return {
    id,
    date: day,
    checkedAt: `${day}T08:00:00.000Z`,
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
}

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-2',
  status: 'active',
};

function session(id: string, day: string, exerciseId: string, reps: number): WorkoutSession {
  return {
    id,
    date: day,
    workoutDefinitionId: 'chapter-2-forge-b',
    readinessId: `check-${day}`,
    outcome: 'completed',
    completedAt: `${day}T09:00:00.000Z`,
    definitionSnapshot: {
      id: 'chapter-2-forge-b',
      title: 'Forge B',
      exercises: [{ exerciseId, sets: 3, reps: '8–12' }],
    },
    exerciseResults: [
      {
        exerciseId,
        painEvents: [],
        sets: [1, 2, 3].map((set) => ({ completed: true, reps, ...(set === 3 ? { rpe: 6 } : {}) })),
      },
    ],
  };
}

function threeMilePhases(): TrialPhaseResult[] {
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

async function preparedDatabase(): Promise<RoadDatabase> {
  const database = await RoadDatabase.open(`skill-parts-${crypto.randomUUID()}`);
  await database.putCampaign(campaign);
  const gateCheck = check('check-2026-11-02', '2026-11-02');
  for (const day of ['2026-10-15', '2026-11-19'])
    await database.addReadinessCheck(check(`check-${day}`, day));
  await database.addReadinessCheck(gateCheck);
  await database.addReadinessCheck({ ...check('today', date), checkedAt: `${date}T12:00:00.000Z` });
  await database.addTrialResult(
    createGateTrialResult({ ...completeGateTrialInput(gateCheck), id: 'gate-pass' }),
  );
  // Push-ups passed in Chapter I, pike push-ups passed in Chapter II.
  await database.addHistorical('workoutSessions', session('ch1', '2026-10-15', 'push-up', 12));
  await database.addHistorical('workoutSessions', session('ch2', '2026-11-19', 'pike-push-up', 10));
  return database;
}

describe('skill parts in a stored trial', () => {
  it('starts the Three-Mile Trial with the steps passed for Chapter II and saves their outcomes', async () => {
    const database = await preparedDatabase();
    let draft: TrialDraft = await database.startTrialDraft(date, 'three-mile-trial');
    expect(draft.definitionSnapshot.skillParts?.map((part) => part.stepExerciseId)).toEqual([
      'push-up',
      'pike-push-up',
    ]);
    const phases = threeMilePhases();
    for (let index = 0; index < 3; index += 1) {
      const edited = structuredClone(draft);
      edited.phaseResults[index] = phases[index];
      if (index < 2) edited.currentPhaseIndex = index + 1;
      draft = await database.saveTrialDraft(edited);
    }
    const blocked = structuredClone(draft);
    blocked.currentPhaseIndex = 3;
    await expect(database.saveTrialDraft(blocked)).rejects.toThrow(/Record each skill part/);

    const recorded = structuredClone(draft);
    recorded.skillResults = [
      { trackId: 'push', stepExerciseId: 'push-up', outcome: 'demonstrated' },
      {
        trackId: 'push',
        stepExerciseId: 'pike-push-up',
        outcome: 'step-below',
        sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }],
      },
    ];
    recorded.currentPhaseIndex = 3;
    draft = await database.saveTrialDraft(recorded);
    for (const index of [3, 4]) {
      const edited = structuredClone(draft);
      edited.phaseResults[index] = phases[index];
      if (index === 3) edited.currentPhaseIndex = 4;
      draft = await database.saveTrialDraft(edited);
    }
    const result = await database.finishTrialDraft(draft.id, 'completed');
    expect(result.skillResults?.map((part) => part.exerciseIdDone)).toEqual(['push-up', 'push-up']);
    expect(await database.getTrialResultsForTrial('three-mile-trial')).toEqual([result]);
    // The older Gate Trial result reads back exactly as saved, with no skill fields.
    const [gate] = await database.getTrialResultsForTrial('gate-trial');
    expect(gate.skillResults).toBeUndefined();
    expect(gate.definitionSnapshot?.skillParts).toBeUndefined();
    database.close();
  });

  it('keeps skill outcomes with a stopped attempt, and a restored copy keeps them', async () => {
    const database = await preparedDatabase();
    const draft = await database.startTrialDraft(date, 'three-mile-trial');
    const edited = structuredClone(draft);
    edited.skillResults![0] = { ...edited.skillResults![0], outcome: 'demonstrated' };
    await database.saveTrialDraft(edited);
    const stopped = await database.finishTrialDraft(draft.id, 'stopped');
    expect(stopped.skillResults?.[0].outcome).toBe('demonstrated');

    const copy = await database.exportRecords();
    const restored = await RoadDatabase.open(`skill-parts-restore-${crypto.randomUUID()}`);
    await restored.replaceRecords(copy);
    expect(await restored.getStoppedTrialAttemptsForTrial('three-mile-trial')).toEqual([stopped]);
    database.close();
    restored.close();
  });
});
