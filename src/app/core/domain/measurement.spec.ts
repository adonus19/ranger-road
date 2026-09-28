import { describe, expect, it } from 'vitest';
import { createMeasurementEntry, summarizeReadiness, type SavedMeasurement } from './measurement';
import type { ReadinessCheck } from './models';

const base = { id: 'measure-1', date: '2026-10-12', recordedAt: '2026-10-12T14:00:00.000Z' };
const checkIn: SavedMeasurement = {
  ...base,
  kind: 'check-in',
  weight: 221.6,
  waist: 41.5,
  restingHeartRate: 68,
};

function check(date: string, checkedAt: string, values: Partial<ReadinessCheck> = {}): ReadinessCheck {
  return {
    id: `readiness-${date}-${checkedAt}`,
    date,
    checkedAt,
    sleepHours: 7,
    poorSleep: false,
    energy: 3,
    backPain: 2,
    shoulderPain: 1,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status: 'green',
    ...values,
  };
}

describe('createMeasurementEntry', () => {
  it('keeps what was entered and leaves blank answers out of the record', () => {
    const entry = createMeasurementEntry({
      ...checkIn,
      bloodPressure: { systolic: 128, diastolic: 82 },
      pushups: 0,
      pullupAssistance: '  Purple band ',
      squatDepth: 'parallel',
      toeReach: 0,
      energy: undefined,
    });

    expect(entry).toEqual({
      ...checkIn,
      bloodPressure: { systolic: 128, diastolic: 82 },
      pushups: 0,
      pullupAssistance: 'Purple band',
      squatDepth: 'parallel',
      toeReach: 0,
    });
    expect(entry).not.toHaveProperty('energy');
  });

  it('needs weight, waist, and resting heart rate in a check-in', () => {
    expect(() => createMeasurementEntry({ ...checkIn, restingHeartRate: undefined })).toThrow(
      'A check-in needs weight, waist, and resting heart rate.',
    );
  });

  it('refuses out-of-range numbers and a blood pressure given the wrong way round', () => {
    expect(() => createMeasurementEntry({ ...checkIn, weight: 0 })).toThrow(RangeError);
    expect(() => createMeasurementEntry({ ...checkIn, restingHeartRate: 68.5 })).toThrow(RangeError);
    expect(() => createMeasurementEntry({ ...checkIn, energy: 6 })).toThrow(RangeError);
    expect(() => createMeasurementEntry({ ...checkIn, pullupAssistance: '   ' })).toThrow(RangeError);
    expect(() =>
      createMeasurementEntry({ ...checkIn, bloodPressure: { systolic: 80, diastolic: 120 } }),
    ).toThrow('The first blood pressure number is the higher one.');
  });

  it('records a check-in whose tests a Red day held, and refuses tests alongside it', () => {
    expect(createMeasurementEntry({ ...checkIn, testsHeld: true })).toMatchObject({ testsHeld: true });
    expect(() => createMeasurementEntry({ ...checkIn, testsHeld: true, pushups: 10 })).toThrow(
      'Tests held for a Red day cannot also be recorded.',
    );
  });

  it('holds only weight and waist in a body entry, and only tests in a tests entry', () => {
    expect(createMeasurementEntry({ ...base, kind: 'body', waist: 41 })).toEqual({ ...base, kind: 'body', waist: 41 });
    expect(() => createMeasurementEntry({ ...base, kind: 'body' })).toThrow('Enter a weight or a waist measurement.');
    expect(() => createMeasurementEntry({ ...base, kind: 'body', weight: 220, pushups: 5 })).toThrow(
      'A body entry holds only its own measurements.',
    );
    expect(createMeasurementEntry({ ...base, kind: 'tests', squatDepth: 'below-parallel' })).toEqual({
      ...base,
      kind: 'tests',
      squatDepth: 'below-parallel',
    });
    expect(() => createMeasurementEntry({ ...base, kind: 'tests', weight: 220, pushups: 5 })).toThrow(
      'A tests entry holds only its own measurements.',
    );
  });
});

describe('summarizeReadiness', () => {
  it('averages the latest check of each day inside the window', () => {
    const summary = summarizeReadiness(
      [
        check('2026-09-14', '2026-09-14T12:00:00Z', { sleepHours: 3, backPain: 9 }),
        check('2026-09-15', '2026-09-15T08:00:00Z', { sleepHours: 5, backPain: 6 }),
        check('2026-09-15', '2026-09-15T18:00:00Z', { sleepHours: 6, backPain: 4, neckPain: 1 }),
        check('2026-10-12', '2026-10-12T07:00:00Z', { sleepHours: 7.5, backPain: 1, shoulderPain: 2 }),
      ],
      '2026-09-15',
      '2026-10-12',
    );

    expect(summary).toEqual({
      from: '2026-09-15',
      to: '2026-10-12',
      checks: 2,
      averageSleepHours: 6.75,
      averageBackPain: 2.5,
      averageShoulderPain: 1.5,
      averageNeckPain: 0.5,
    });
  });

  it('reports no averages when there are no checks to average', () => {
    expect(summarizeReadiness([], '2026-09-15', '2026-10-12')).toEqual({
      from: '2026-09-15',
      to: '2026-10-12',
      checks: 0,
    });
  });
});
