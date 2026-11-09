import { describe, expect, it } from 'vitest';
import type { ReadinessCheck, TrialDraft, TrialPhaseResult } from './models';
import {
  highCountryPhaseComplete,
  highPointTellStatus,
  hikeFinishedOn,
} from './high-country-trial';
import {
  completeTrialDraft,
  completeTrialPiece,
  createRecordedTrialPain,
  createTrialDraft,
  startTrialPiece,
  stopTrialPiece,
  trialActiveDate,
  updateTrialDraft,
} from './trial-draft';
import { highCountryTrialDefinition } from '../program/chapter-three-trial.seed';

const hikeDay = '2026-12-29';
const circuitDay = '2026-12-30';

function check(date: string, overrides: Partial<ReadinessCheck> = {}): ReadinessCheck {
  return {
    id: `green-${date}`,
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
    ...overrides,
  };
}

/** The pack's hike-day parts, finished as written in 03_THE_HIGH_COUNTRY.md. */
function hikePhases(): TrialPhaseResult[] {
  return [
    {
      phaseId: 'pre-start-plan',
      responses: {
        direction: 'North on the ridge trail',
        junctions: 'Fire road at mile 1, spur at mile 2',
        expectedDistance: '5 miles',
        expectedElevation: '1,200 ft',
        turnaroundPoint: 'The overlook',
        turnaroundTime: '1:00 pm',
      },
    },
    {
      phaseId: 'hike',
      metrics: { durationMinutes: 150, distanceMiles: 5, rpe: 6, elevationGainFeet: 1200 },
      responses: { knee: 'Fine', back: 'Fine' },
    },
    { phaseId: 'location-estimate', responses: { 'estimate-1': 'Just past the fire road' } },
    {
      phaseId: 'high-point',
      metrics: { quietMinutesDone: true },
      responses: { reflection: 'A steady home.' },
    },
    { phaseId: 'circuit' },
  ];
}

function circuitRounds() {
  return [1, 2].map((round) => ({
    round,
    movements: [
      { exerciseId: 'step-up', repsBySide: { left: 10, right: 10 } },
      { exerciseId: 'push-up', reps: 10 },
      { exerciseId: 'assisted-pull-up', reps: 5 },
      { exerciseId: 'farmer-carry', durationSeconds: 45 },
      { exerciseId: 'side-plank', durationSecondsBySide: { left: 30, right: 30 } },
    ],
  }));
}

function hikeDone(): TrialDraft {
  const draft = createTrialDraft(
    'high-country-trial',
    hikeDay,
    check(hikeDay),
    `${hikeDay}T12:00:00.000Z`,
    'hc',
  );
  let saved = draft;
  for (let index = 1; index <= 3; index++) {
    saved = updateTrialDraft(
      saved,
      { ...saved, phaseResults: hikePhases(), currentPhaseIndex: index },
      check(hikeDay),
      `${hikeDay}T1${index + 2}:00:00.000Z`,
    );
  }
  return completeTrialPiece(saved, check(hikeDay), `${hikeDay}T17:00:00.000Z`);
}

describe('High Country Trial seed', () => {
  it('gives the circuit its structure: two rounds of the five stations', () => {
    const circuit = highCountryTrialDefinition.phases.find((phase) => phase.id === 'circuit');
    expect(circuit?.circuit).toEqual({
      rounds: 2,
      movements: [
        { exerciseId: 'step-up', reps: 10, perSide: true },
        { exerciseId: 'push-up', reps: 10 },
        { exerciseId: 'assisted-pull-up', reps: 5 },
        { exerciseId: 'farmer-carry', durationSeconds: 45 },
        { exerciseId: 'side-plank', durationSeconds: 30, perSide: true },
      ],
    });
  });
});

describe('High Country Trial parts', () => {
  it('needs every pre-start plan answer, and the hike’s time, distance, RPE, knee and back', () => {
    const phases = hikePhases();
    expect(phases.slice(0, 4).every((phase, index) => highCountryPhaseComplete(phase, index))).toBe(
      true,
    );
    const noTurnaround = {
      ...phases[0],
      responses: { ...phases[0].responses, turnaroundTime: '' },
    };
    expect(highCountryPhaseComplete(noTurnaround, 0)).toBe(false);
    // Elevation gain is recorded when known, never required.
    const noGain = { ...phases[1], metrics: { durationMinutes: 150, distanceMiles: 5, rpe: 6 } };
    expect(highCountryPhaseComplete(noGain, 1)).toBe(true);
    expect(highCountryPhaseComplete({ ...phases[1], responses: { knee: 'Fine' } }, 1)).toBe(false);
  });

  it('holds the winter stand-in to 1.5 hours or more, with its terrain and no treadmill', () => {
    const standIn = (minutes: number, terrain: string): TrialPhaseResult => ({
      phaseId: 'hike',
      metrics: { standIn: true, durationMinutes: minutes, distanceMiles: 4.5, rpe: 5 },
      responses: { knee: 'Fine', back: 'Fine', terrain },
    });
    expect(highCountryPhaseComplete(standIn(90, 'outdoor'), 1)).toBe(true);
    expect(highCountryPhaseComplete(standIn(120, 'indoor-track'), 1)).toBe(true);
    expect(highCountryPhaseComplete(standIn(80, 'outdoor'), 1)).toBe(false);
    expect(highCountryPhaseComplete(standIn(100, 'treadmill'), 1)).toBe(false);
  });

  it('needs one location estimate, the quiet minutes and the written high-point answer', () => {
    expect(highCountryPhaseComplete({ phaseId: 'location-estimate', responses: {} }, 2)).toBe(
      false,
    );
    expect(
      highCountryPhaseComplete(
        { phaseId: 'high-point', metrics: { quietMinutesDone: true }, responses: {} },
        3,
      ),
    ).toBe(false);
  });

  it('needs both circuit rounds as written', () => {
    expect(
      highCountryPhaseComplete({ phaseId: 'circuit', circuitRounds: circuitRounds() }, 4),
    ).toBe(true);
    const short = circuitRounds();
    short[1].movements[1] = { exerciseId: 'push-up', reps: 8 };
    expect(highCountryPhaseComplete({ phaseId: 'circuit', circuitRounds: short }, 4)).toBe(false);
  });
});

describe('High Country Trial pieces', () => {
  it('keeps the hike on its own day and stops at the end of the hike piece', () => {
    const draft = createTrialDraft(
      'high-country-trial',
      hikeDay,
      check(hikeDay),
      `${hikeDay}T12:00:00.000Z`,
      'hc',
    );
    expect(draft.pieces).toEqual([
      {
        pieceId: 'hike',
        date: hikeDay,
        readinessId: `green-${hikeDay}`,
        startedAt: `${hikeDay}T12:00:00.000Z`,
      },
    ]);
    const done = hikeDone();
    expect(done.pieces?.[0].completedAt).toBe(`${hikeDay}T17:00:00.000Z`);
    // The circuit is its own piece: no moving into it from the hike day's draft.
    expect(() =>
      updateTrialDraft(
        done,
        { ...done, currentPhaseIndex: 4 },
        check(hikeDay),
        `${hikeDay}T18:00:00.000Z`,
      ),
    ).toThrow(/later Green day/);
  });

  it('opens the circuit on a later Green day only, and dates the pass by it', () => {
    const done = hikeDone();
    expect(() =>
      startTrialPiece(done, hikeDay, check(hikeDay), `${hikeDay}T19:00:00.000Z`),
    ).toThrow(/later day/);
    expect(() =>
      startTrialPiece(
        done,
        circuitDay,
        check(circuitDay, { id: 'yellow', backPain: 3, status: 'yellow' }),
        `${circuitDay}T12:00:00.000Z`,
      ),
    ).toThrow(/Green/);
    const circuit = startTrialPiece(
      done,
      circuitDay,
      check(circuitDay),
      `${circuitDay}T12:00:00.000Z`,
    );
    expect(circuit.currentPhaseIndex).toBe(4);
    expect(trialActiveDate(circuit)).toBe(circuitDay);

    const rounds = updateTrialDraft(
      circuit,
      {
        ...circuit,
        phaseResults: circuit.phaseResults.map((phase) =>
          phase.phaseId === 'circuit'
            ? { phaseId: 'circuit', circuitRounds: circuitRounds() }
            : phase,
        ),
      },
      check(circuitDay),
      `${circuitDay}T12:30:00.000Z`,
    );
    const result = completeTrialDraft(rounds, check(circuitDay), `${circuitDay}T13:00:00.000Z`);
    expect(result).toMatchObject({
      trialId: 'high-country-trial',
      date: circuitDay,
      readinessId: `green-${circuitDay}`,
      reflection: 'A steady home.',
    });
    expect(result.pieces?.map((piece) => [piece.pieceId, piece.date])).toEqual([
      ['hike', hikeDay],
      ['circuit', circuitDay],
    ]);
  });

  it('lets pain at 3 on the trail stand, and stops the hike at 4', () => {
    const draft = createTrialDraft(
      'high-country-trial',
      hikeDay,
      check(hikeDay),
      `${hikeDay}T12:00:00.000Z`,
      'hc',
    );
    let saved = draft;
    for (let index = 1; index <= 3; index++) {
      saved = updateTrialDraft(
        saved,
        { ...saved, phaseResults: hikePhases(), currentPhaseIndex: index },
        check(hikeDay),
        `${hikeDay}T1${index + 2}:00:00.000Z`,
      );
    }
    const three = createRecordedTrialPain(
      saved,
      { phaseId: 'hike', bodyArea: 'knee', severity: 3, actionTaken: 'continue' },
      `${hikeDay}T15:30:00.000Z`,
    );
    const withThree = { ...saved, painEvents: [three] };
    expect(
      completeTrialPiece(withThree, check(hikeDay), `${hikeDay}T17:00:00.000Z`).pieces?.[0],
    ).toMatchObject({ completedAt: `${hikeDay}T17:00:00.000Z` });
    const four = { ...three, id: 'pain-4', severity: 4 };
    expect(() =>
      completeTrialPiece(
        { ...saved, painEvents: [four] },
        check(hikeDay),
        `${hikeDay}T17:00:00.000Z`,
      ),
    ).toThrow(/pain/i);
  });

  it('keeps a passed hike through a stopped circuit, which starts fresh next time', () => {
    const circuit = startTrialPiece(
      hikeDone(),
      circuitDay,
      check(circuitDay),
      `${circuitDay}T12:00:00.000Z`,
    );
    const pain = createRecordedTrialPain(
      circuit,
      { phaseId: 'circuit', bodyArea: 'shoulder', severity: 3, actionTaken: 'end-exercise' },
      `${circuitDay}T12:10:00.000Z`,
    );
    const { attempt, draft } = stopTrialPiece(
      { ...circuit, painEvents: [pain] },
      'stopped',
      undefined,
      `${circuitDay}T12:20:00.000Z`,
    );
    expect(attempt).toMatchObject({ outcome: 'stopped', date: circuitDay, painEvents: [pain] });
    expect(attempt.id).not.toBe(circuit.id);
    expect(draft?.pieces).toHaveLength(1);
    expect(draft?.pieces?.[0].completedAt).toBeDefined();
    expect(draft?.painEvents).toEqual([]);
    expect(draft?.currentPhaseIndex).toBe(3);
    expect(draft?.phaseResults[4]).toEqual({ phaseId: 'circuit' });
  });

  it('records a weather postponement of the hike without failing it, keeping the plan', () => {
    const draft = createTrialDraft(
      'high-country-trial',
      hikeDay,
      check(hikeDay),
      `${hikeDay}T12:00:00.000Z`,
      'hc',
    );
    const planned = updateTrialDraft(
      draft,
      { ...draft, phaseResults: hikePhases(), currentPhaseIndex: 1 },
      check(hikeDay),
      `${hikeDay}T13:00:00.000Z`,
    );
    const postponed = stopTrialPiece(
      planned,
      'postponed-for-weather',
      'Thunder at the trailhead',
      `${hikeDay}T13:30:00.000Z`,
    );
    expect(postponed.attempt).toMatchObject({
      outcome: 'postponed-for-weather',
      weatherReason: 'Thunder at the trailhead',
    });
    expect(postponed.draft?.pieces).toEqual([]);
    expect(postponed.draft?.phaseResults[0]).toEqual(hikePhases()[0]);
    expect(postponed.draft?.currentPhaseIndex).toBe(0);

    // A stopped hike with nothing passed ends the draft, as for the other trials.
    const stopped = stopTrialPiece(planned, 'stopped', undefined, `${hikeDay}T13:30:00.000Z`);
    expect(stopped.attempt.id).toBe(planned.id);
    expect(stopped.draft).toBeUndefined();
  });
});

describe('Week 12 Hearth part (d): telling your spouse the high-point answer', () => {
  it('shows from the day the hike is finished until it is marked Done on an earlier day', () => {
    const done = hikeDone();
    expect(hikeFinishedOn(done, [])).toBe(hikeDay);
    expect(hikeFinishedOn(null, [])).toBeNull();
    expect(highPointTellStatus(hikeDay, '2026-12-28', [])).toBeNull();
    expect(highPointTellStatus(hikeDay, hikeDay, [])).toBe('due');
    expect(highPointTellStatus(hikeDay, circuitDay, [])).toBe('due');
    expect(highPointTellStatus(hikeDay, circuitDay, [circuitDay])).toBe('done-today');
    expect(highPointTellStatus(hikeDay, '2026-12-31', [circuitDay])).toBeNull();
    expect(highPointTellStatus(null, circuitDay, [])).toBeNull();
  });
});
