import { describe, expect, it } from 'vitest';
import type { ReadinessCheck, TrialResult } from './models';
import { gateTrialDefinition } from '../program/chapter-one.seed';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { createGateTrialResult, validateCompletedGateTrialResult } from './trial';

const green: ReadinessCheck = {
  id: 'readiness-green',
  date: '2026-10-22',
  checkedAt: '2026-10-22T12:00:00.000Z',
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

const input = {
  ...completeGateTrialInput(green),
  postMissionFunction: 'Able to be present at home afterward.',
};

describe('Gate Trial result', () => {
  it('captures the documented phases, concrete effort, reflection, and a detached definition', () => {
    const result = createGateTrialResult(input);
    expect(result).toMatchObject({
      id: input.id,
      trialId: 'gate-trial',
      date: input.date,
      readinessId: green.id,
      recordedAt: input.recordedAt,
      postMissionFunction: input.postMissionFunction,
    });
    expect(result.phaseResults.map((phase) => phase.phaseId)).toEqual(
      gateTrialDefinition.phases.map((phase) => phase.id),
    );
    expect(result.phaseResults[0].metrics).toMatchObject({
      distanceMiles: 2,
      durationMinutes: 36,
      rpe: 5,
    });
    expect(result.phaseResults[0].responses).toMatchObject({ knee: 'Steady.', back: 'Steady.' });
    expect(result.phaseResults[1].metrics).toMatchObject({
      roundsCompleted: 3,
      durationMinutes: 22,
    });
    expect(result.phaseResults[1].circuitRounds).toHaveLength(3);
    expect(result.phaseResults[3].metrics).toEqual({ confirmed: true, prayerMinutes: 12 });
    expect(result.phaseResults[3].responses?.['identity']).toBe(input.faithReflection);
    expect(result.phaseResults[4].notes).toBe(input.rangersOath);
    expect(result.definitionSnapshot).toEqual(gateTrialDefinition);
    expect(result.definitionSnapshot).not.toBe(gateTrialDefinition);
  });

  it('requires a same-day, consistent Green readiness check for a completed trial', () => {
    expect(() =>
      createGateTrialResult({ ...input, readiness: { ...green, date: '2026-10-21' } }),
    ).toThrow(/trial date/);
    expect(() =>
      createGateTrialResult({ ...input, readiness: { ...green, poorSleep: true } }),
    ).toThrow(/does not match/);
    expect(() =>
      createGateTrialResult({
        ...input,
        readiness: { ...green, poorSleep: true, status: 'yellow' },
      }),
    ).toThrow(/Green/);
    expect(() =>
      createGateTrialResult({
        ...input,
        readiness: { ...green, energy: 1, status: 'red' },
      }),
    ).toThrow(/Green/);
    expect(() =>
      createGateTrialResult({ ...input, recordedAt: '2026-10-22T10:00:00.000Z' }),
    ).toThrow(/Check readiness before/);
  });

  it('cannot mark the trial complete with a short walk, partial circuit, or missing formation phase', () => {
    expect(() => createGateTrialResult({ ...input, distanceMiles: 1.9 })).toThrow(/2 miles/);
    expect(() => createGateTrialResult({ ...input, walkDurationMinutes: 0 })).toThrow(/duration/);
    expect(() =>
      createGateTrialResult({ ...input, circuitRounds: input.circuitRounds.slice(0, 2) }),
    ).toThrow(/3 rounds/);
    expect(() => createGateTrialResult({ ...input, restAfterWalkMinutes: 4 })).toThrow(/5 minutes/);
    expect(() => createGateTrialResult({ ...input, prayerMinutes: 9 })).toThrow(/10 quiet minutes/);
    expect(() => createGateTrialResult({ ...input, psalmAndPrayerCompleted: false })).toThrow(
      /Psalm 121/,
    );
    expect(() =>
      createGateTrialResult({
        ...input,
        mindReflection: { ...input.mindReflection, family: ' ' },
      }),
    ).toThrow(/family/);
    expect(() => createGateTrialResult({ ...input, faithReflection: ' ' })).toThrow(
      /husband and father/,
    );
    expect(() => createGateTrialResult({ ...input, rangersOath: ' ' })).toThrow(/Ranger's Oath/);
    expect(() => createGateTrialResult({ ...input, postMissionFunction: ' ' })).toThrow(
      /post-mission/,
    );
  });

  it('allows immediate completion without an early recovery answer', () => {
    expect(
      createGateTrialResult({ ...input, postMissionFunction: undefined }).postMissionFunction,
    ).toBeUndefined();
  });

  it('requires the prescribed phase order in new completed results', () => {
    const saved = createGateTrialResult(input);
    expect(() =>
      validateCompletedGateTrialResult({
        ...saved,
        definitionSnapshot: {
          ...saved.definitionSnapshot,
          phases: [...saved.definitionSnapshot.phases].reverse(),
        },
        phaseResults: [...saved.phaseResults].reverse(),
      }),
    ).toThrow(/definition snapshot/);
    expect(() =>
      validateCompletedGateTrialResult({
        ...saved,
        phaseResults: [...saved.phaseResults].reverse(),
      }),
    ).toThrow(/five Gate Trial phases/);
  });

  it('rejects forged or incomplete saved results at the storage boundary', () => {
    const saved = createGateTrialResult(input);
    const invalid: TrialResult[] = [
      { ...saved, date: '2026-02-30' },
      { ...saved, readinessId: undefined },
      { ...saved, definitionSnapshot: undefined },
      { ...saved, definitionSnapshot: { ...saved.definitionSnapshot, chapterId: 'chapter-2' } },
      { ...saved, definitionSnapshot: { ...saved.definitionSnapshot, contentVersion: 1 } },
      { ...saved, phaseResults: saved.phaseResults.slice(0, 4) },
      {
        ...saved,
        phaseResults: [
          saved.phaseResults[0],
          saved.phaseResults[0],
          ...saved.phaseResults.slice(2),
        ],
      },
      {
        ...saved,
        phaseResults: [
          {
            ...saved.phaseResults[0],
            metrics: { ...saved.phaseResults[0].metrics, distanceMiles: 1 },
          },
          ...saved.phaseResults.slice(1),
        ],
      },
      {
        ...saved,
        phaseResults: saved.phaseResults.map((phase) =>
          phase.phaseId === 'psalm-and-prayer' ? { phaseId: phase.phaseId } : phase,
        ),
      },
      {
        ...saved,
        phaseResults: saved.phaseResults.map((phase) =>
          phase.phaseId === 'psalm-and-prayer'
            ? { phaseId: phase.phaseId, metrics: { confirmed: false } }
            : phase,
        ),
      },
    ];
    for (const result of invalid) {
      expect(() => validateCompletedGateTrialResult(result)).toThrow();
    }
  });

  it('rejects missing or short circuit stations even when a caller claims three rounds', () => {
    const saved = createGateTrialResult(input);
    const rounds = structuredClone(saved.phaseResults[1].circuitRounds!);
    rounds[0].movements.find((movement) => movement.exerciseId === 'assisted-pull-up')!.reps = 4;
    const forged = {
      ...saved,
      phaseResults: saved.phaseResults.map((phase) =>
        phase.phaseId === 'controlled-circuit' ? { ...phase, circuitRounds: rounds } : phase,
      ),
    };
    expect(() => validateCompletedGateTrialResult(forged)).toThrow(/assisted-pull-up/);
    rounds[0].movements = rounds[0].movements.filter(
      (movement) => movement.exerciseId !== 'side-plank',
    );
    expect(() => validateCompletedGateTrialResult(forged)).toThrow(/six circuit stations/);
  });
});
