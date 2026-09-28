import { describe, expect, it } from 'vitest';
import type { ReadinessCheck, TrialDraft } from './models';
import { createGateTrialResult } from './trial';
import {
  completeGateTrialDraft,
  createGateTrialDraft,
  createRecordedTrialPain,
  gateTrialPhaseComplete,
  stopGateTrialDraft,
  updateGateTrialDraft,
} from './trial-draft';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';

const green: ReadinessCheck = {
  id: 'green',
  date: '2026-10-22',
  checkedAt: '2026-10-22T11:00:00.000Z',
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

const startedAt = '2026-10-22T12:00:00.000Z';

function freshDraft(): TrialDraft {
  return createGateTrialDraft(green.date, green, startedAt, 'trial-draft-1');
}

function fullDraft(): TrialDraft {
  const draft = freshDraft();
  const completed = createGateTrialResult(completeGateTrialInput(green));
  return { ...draft, currentPhaseIndex: 4, phaseResults: completed.phaseResults };
}

describe('Gate Trial draft domain', () => {
  it('starts only with a same-day Green check and snapshots five ordered phases', () => {
    const draft = freshDraft();
    expect(draft).toMatchObject({
      id: 'trial-draft-1',
      trialId: 'gate-trial',
      readinessId: green.id,
      currentPhaseIndex: 0,
      revision: 1,
    });
    expect(draft.phaseResults.map((phase) => phase.phaseId)).toEqual([
      'brisk-walk',
      'controlled-circuit',
      'mind-reflection',
      'psalm-and-prayer',
      'rangers-oath',
    ]);
    expect(() => createGateTrialDraft('2026-10-21', green, startedAt)).toThrow(/trial date/i);
    expect(() => createGateTrialDraft(green.date, { ...green, poorSleep: true, status: 'yellow' }, startedAt))
      .toThrow(/Green/);
    expect(() => createGateTrialDraft(green.date, undefined, startedAt)).toThrow(/readiness/);
  });

  it('keeps partial walk and one-sided circuit entries, and rejects stale writes', () => {
    const draft = freshDraft();
    const edited = structuredClone(draft);
    edited.phaseResults[0] = {
      phaseId: 'brisk-walk',
      metrics: { distanceMiles: 1.2, durationMinutes: 21 },
      responses: { knee: 'Steady.' },
    };
    edited.phaseResults[1] = {
      phaseId: 'controlled-circuit',
      circuitRounds: [{ round: 1, movements: [{ exerciseId: 'step-up', repsBySide: { left: 8 } }] }],
    };
    const saved = updateGateTrialDraft(draft, edited, green, '2026-10-22T12:05:00.000Z');
    expect(saved.revision).toBe(2);
    expect(saved.phaseResults[0].metrics?.['distanceMiles']).toBe(1.2);
    expect(saved.phaseResults[1].circuitRounds?.[0].movements[0].repsBySide).toEqual({ left: 8 });
    expect(saved.phaseResults[1].metrics?.['roundsCompleted']).toBe(1);
    expect(gateTrialPhaseComplete(saved.phaseResults[0], 0)).toBe(false);
    expect(() => updateGateTrialDraft(saved, edited, green, '2026-10-22T12:06:00.000Z'))
      .toThrow(/changed/);
  });

  it('autosaves partial observations after Yellow while blocking physical advancement', () => {
    const draft = freshDraft();
    const yellow: ReadinessCheck = {
      ...green,
      id: 'yellow-later',
      checkedAt: '2026-10-22T12:10:00.000Z',
      poorSleep: true,
      status: 'yellow',
    };
    const edited = structuredClone(draft);
    edited.phaseResults[0] = {
      phaseId: 'brisk-walk',
      metrics: { distanceMiles: 2, durationMinutes: 36, rpe: 5 },
      responses: {
        knee: 'Steady.',
        back: 'Steady.',
        recoveryAfterFiveMinutes: 'Breathing settled.',
      },
    };
    const saved = updateGateTrialDraft(draft, edited, yellow, '2026-10-22T12:15:00.000Z');
    expect(saved.phaseResults[0].responses?.['recoveryAfterFiveMinutes']).toBe('Breathing settled.');
    expect(() =>
      updateGateTrialDraft(
        saved,
        { ...saved, currentPhaseIndex: 1 },
        yellow,
        '2026-10-22T12:16:00.000Z',
      ),
    ).toThrow(/Green/);
    const stopped = stopGateTrialDraft(saved, '2026-10-22T12:17:00.000Z');
    expect(stopped.outcome).toBe('stopped');
    expect(stopped.phaseResults[0]).toEqual(saved.phaseResults[0]);
  });

  it('records trial-linked pain without allowing an adverse or reduced trial to pass', () => {
    const draft = fullDraft();
    const pain = createRecordedTrialPain(
      draft,
      {
        phaseId: 'controlled-circuit',
        exerciseId: 'box-squat',
        bodyArea: 'Back',
        severity: 3,
        actionTaken: 'reduce',
      },
      '2026-10-22T15:00:00.000Z',
      'pain-1',
    );
    expect(pain).toMatchObject({
      trialAttemptId: draft.id,
      trialPhaseId: 'controlled-circuit',
      exerciseId: 'box-squat',
      severity: 3,
    });
    const painful = { ...draft, painEvents: [pain] };
    expect(() => completeGateTrialDraft(painful, green, '2026-10-22T16:00:00.000Z'))
      .toThrow(/reduced or pain rose/);
    expect(stopGateTrialDraft(painful, '2026-10-22T16:00:00.000Z').painEvents).toEqual([pain]);
    expect(() =>
      createRecordedTrialPain(
        draft,
        { phaseId: 'controlled-circuit', bodyArea: 'Back', severity: 11, actionTaken: 'continue' },
        '2026-10-22T16:00:00.000Z',
      ),
    ).toThrow(/0 to 10/);
  });

  it('creates a complete immutable result only after all five phases and latest Green', () => {
    const draft = { ...fullDraft(), photoAsset: 'local-photo-1' };
    expect(draft.phaseResults.every((phase, index) => gateTrialPhaseComplete(phase, index))).toBe(true);
    const result = completeGateTrialDraft(draft, green, '2026-10-22T16:00:00.000Z');
    expect(result).toMatchObject({
      id: draft.id,
      readinessId: green.id,
      recordedAt: '2026-10-22T16:00:00.000Z',
      photoAsset: 'local-photo-1',
    });
    expect(result.postMissionFunction).toBeUndefined();
    expect(result.definitionSnapshot).not.toBe(draft.definitionSnapshot);
    expect(() => completeGateTrialDraft({ ...draft, currentPhaseIndex: 3 }, green, '2026-10-22T16:00:00.000Z'))
      .toThrow(/phases in order/);
    expect(() =>
      completeGateTrialDraft(draft, { ...green, poorSleep: true, status: 'yellow' }, '2026-10-22T16:00:00.000Z'),
    ).toThrow(/Green/);
  });
});
