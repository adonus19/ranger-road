import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  TrialDraft,
  TrialPhaseResult,
  WorkoutSession,
} from '../domain/models';
import { createGateTrialResult, type SavedTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { threeMileTrialDefinition } from '../program/chapter-two-trial.seed';
import { RoadDatabase } from './road-database';

// Day 1 is Monday, Oct 5. The Gate Trial passes Monday, Nov 2 and the Three-Mile Trial Monday,
// Nov 30, so Chapter III's Weeks 9–12 run Nov 30 to Sun, Dec 27 and the trial opens Dec 28.
vi.useFakeTimers({ toFake: ['Date'] });
afterAll(() => vi.useRealTimers());

const hikeDay = '2026-12-29';
const circuitDay = '2026-12-30';

function check(day: string, hour = 8): ReadinessCheck {
  return {
    id: `check-${day}`,
    date: day,
    checkedAt: `${day}T0${hour}:00:00.000Z`,
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
  currentChapterId: 'chapter-3',
  status: 'active',
};

function session(id: string, day: string, workout: string, exerciseId: string): WorkoutSession {
  return {
    id,
    date: day,
    workoutDefinitionId: workout,
    readinessId: `check-${day}`,
    outcome: 'completed',
    completedAt: `${day}T09:00:00.000Z`,
    definitionSnapshot: {
      id: workout,
      title: 'Forge B',
      exercises: [{ exerciseId, sets: 3, reps: '8–12' }],
    },
    exerciseResults: [
      {
        exerciseId,
        painEvents: [],
        sets: [1, 2, 3].map((set) => ({
          completed: true,
          reps: 12,
          ...(set === 3 ? { rpe: 6 } : {}),
        })),
      },
    ],
  };
}

const threeMilePass: SavedTrialResult = {
  id: 'three-mile-pass',
  trialId: 'three-mile-trial',
  date: '2026-11-30',
  recordedAt: '2026-11-30T15:00:00.000Z',
  readinessId: 'check-2026-11-30',
  definitionSnapshot: structuredClone(threeMileTrialDefinition),
  phaseResults: [
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
  ],
  reflection: 'Attentive: Mostly\nBehavior to change: Listen',
};

function hikePhases(): TrialPhaseResult[] {
  return [
    {
      phaseId: 'pre-start-plan',
      responses: {
        direction: 'North',
        junctions: 'Fire road',
        expectedDistance: '5 miles',
        expectedElevation: '1,200 ft',
        turnaroundPoint: 'Overlook',
        turnaroundTime: '1:00 pm',
      },
    },
    {
      phaseId: 'hike',
      metrics: { durationMinutes: 150, distanceMiles: 5, rpe: 6 },
      responses: { knee: 'Fine', back: 'Fine' },
    },
    { phaseId: 'location-estimate', responses: { 'estimate-1': 'Past the fire road' } },
    {
      phaseId: 'high-point',
      metrics: { quietMinutesDone: true },
      responses: { reflection: 'A steady home.' },
    },
    { phaseId: 'circuit' },
  ];
}

const rounds = [1, 2].map((round) => ({
  round,
  movements: [
    { exerciseId: 'step-up', repsBySide: { left: 10, right: 10 } },
    { exerciseId: 'push-up', reps: 10 },
    { exerciseId: 'assisted-pull-up', reps: 5 },
    { exerciseId: 'farmer-carry', durationSeconds: 45 },
    { exerciseId: 'side-plank', durationSecondsBySide: { left: 30, right: 30 } },
  ],
}));

async function preparedDatabase(): Promise<RoadDatabase> {
  vi.setSystemTime(new Date(2026, 10, 30, 16, 0));
  const database = await RoadDatabase.open(`high-country-${crypto.randomUUID()}`);
  await database.putCampaign(campaign);
  for (const day of ['2026-11-02', '2026-11-19', '2026-11-30', '2026-12-10']) {
    await database.addReadinessCheck(check(day));
  }
  await database.addTrialResult(
    createGateTrialResult({ ...completeGateTrialInput(check('2026-11-02')), id: 'gate-pass' }),
  );
  await database.addTrialResult(threeMilePass);
  // Push-ups first passed in Chapter II; the pike push-up first passed in Chapter III.
  await database.addHistorical(
    'workoutSessions',
    session('ch2', '2026-11-19', 'chapter-2-forge-b', 'push-up'),
  );
  await database.addHistorical(
    'workoutSessions',
    session('ch3', '2026-12-10', 'chapter-3-forge-b', 'pike-push-up'),
  );
  return database;
}

async function walkHike(database: RoadDatabase, draft: TrialDraft): Promise<TrialDraft> {
  let saved = draft;
  for (let index = 1; index <= 3; index++) {
    saved = await database.saveTrialDraft({
      ...saved,
      phaseResults: hikePhases(),
      currentPhaseIndex: index,
    });
  }
  return saved;
}

describe('High Country Trial persistence', () => {
  it('opens only after Week 12, records the hike and the circuit on separate days, and passes', async () => {
    const database = await preparedDatabase();
    vi.setSystemTime(new Date(2026, 11, 22, 10, 0));
    await database.addReadinessCheck(check('2026-12-22'));
    await expect(database.startTrialDraft('2026-12-22', 'high-country-trial')).rejects.toThrow(
      /last week has ended/,
    );

    vi.setSystemTime(new Date(2026, 11, 29, 10, 0));
    await database.addReadinessCheck(check(hikeDay));
    let draft = await database.startTrialDraft(hikeDay, 'high-country-trial');
    // Only the step first passed in Chapter III joins this trial.
    expect(draft.definitionSnapshot.skillParts?.map((part) => part.stepExerciseId)).toEqual([
      'pike-push-up',
    ]);
    draft = await walkHike(database, draft);
    draft = await database.completeTrialPiece(draft.id);
    expect(draft.pieces?.[0]).toMatchObject({ pieceId: 'hike', date: hikeDay });
    expect(draft.pieces?.[0].completedAt).toBeDefined();
    await expect(database.startTrialPiece(draft.id, hikeDay)).rejects.toThrow(/later day/);

    vi.setSystemTime(new Date(2026, 11, 30, 10, 0));
    await database.addReadinessCheck(check(circuitDay));
    draft = await database.startTrialPiece(draft.id, circuitDay);
    expect(draft.currentPhaseIndex).toBe(4);
    const edited = structuredClone(draft);
    edited.phaseResults[4] = { phaseId: 'circuit', circuitRounds: structuredClone(rounds) };
    edited.skillResults = [
      { trackId: 'push', stepExerciseId: 'pike-push-up', outcome: 'demonstrated' },
    ];
    draft = await database.saveTrialDraft(edited);
    const result = await database.finishTrialDraft(draft.id, 'completed');
    expect(result).toMatchObject({
      trialId: 'high-country-trial',
      date: circuitDay,
      readinessId: `check-${circuitDay}`,
      reflection: 'A steady home.',
    });
    expect(await database.getActiveTrialDraft()).toBeUndefined();
    expect(await database.getTrialDays()).toEqual(
      expect.arrayContaining([
        { trialId: 'high-country-trial', date: hikeDay },
        { trialId: 'high-country-trial', date: circuitDay },
      ]),
    );

    // A copy restores the pieces exactly.
    const restored = await RoadDatabase.open(`high-country-restore-${crypto.randomUUID()}`);
    await restored.replaceRecords(await database.exportRecords());
    expect(await restored.getTrialResultsForTrial('high-country-trial')).toEqual([result]);
    database.close();
    restored.close();
  });

  it('keeps a postponement apart from stopped attempts and the draft open', async () => {
    const database = await preparedDatabase();
    vi.setSystemTime(new Date(2026, 11, 29, 10, 0));
    await database.addReadinessCheck(check(hikeDay));
    const draft = await database.startTrialDraft(hikeDay, 'high-country-trial');
    const planned = await database.saveTrialDraft({ ...draft, phaseResults: hikePhases() });
    const attempt = await database.postponeTrialPiece(planned.id, 'Ice on the trail');
    expect(attempt).toMatchObject({
      outcome: 'postponed-for-weather',
      weatherReason: 'Ice on the trail',
      date: hikeDay,
    });
    const kept = await database.getActiveTrialDraft();
    expect(kept?.pieces).toEqual([]);
    expect(kept?.phaseResults[0]).toEqual(hikePhases()[0]);

    // The hike starts again on another day with that day's Green check.
    vi.setSystemTime(new Date(2026, 11, 31, 10, 0));
    await database.addReadinessCheck(check('2026-12-31'));
    const again = await database.startTrialPiece(kept!.id, '2026-12-31');
    expect(again.pieces?.[0]).toMatchObject({ pieceId: 'hike', date: '2026-12-31' });
    database.close();
  });
});
