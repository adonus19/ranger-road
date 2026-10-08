import { describe, expect, it } from 'vitest';
import type { ReadinessCheck, TrialDraft, TrialPhaseResult } from './models';
import { threeMilePhaseComplete, validateCompletedThreeMileTrialResult } from './three-mile-trial';
import {
  completeTrialDraft,
  createRecordedTrialPain,
  createTrialDraft,
  stopTrialDraft,
  updateTrialDraft,
} from './trial-draft';

const date = '2026-11-30';
const green: ReadinessCheck = {
  id: 'green',
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
};
const yellow: ReadinessCheck = { ...green, id: 'yellow', backPain: 3, status: 'yellow' };

/** Every part finished as written in 02_THE_ROAD.md. */
function completeThreeMilePhases(): TrialPhaseResult[] {
  return [
    {
      phaseId: 'three-mile-walk',
      metrics: { distanceMiles: 3, durationMinutes: 52, rpe: 6 },
      responses: { knee: 'Fine', back: 'Fine', recoveryAfterFiveMinutes: 'Breathing settled' },
    },
    {
      phaseId: 'suitcase-carry',
      metrics: { loadPounds: 30, rightSeconds: 60, leftSeconds: 60 },
      responses: { grip: 'moderate', core: 'easy', posture: 'easy' },
    },
    { phaseId: 'stair-test', metrics: { flights: 3, breathlessness: 5 } },
    {
      phaseId: 'leadership-reflection',
      responses: { attentive: 'Mostly', behavior: 'Put the phone away at dinner' },
    },
    { phaseId: 'psalm-and-prayer', metrics: { confirmed: true } },
  ];
}

function start(): TrialDraft {
  return createTrialDraft('three-mile-trial', date, green, `${date}T12:00:00.000Z`, 'tm-1');
}

describe('Three-Mile Trial', () => {
  it('starts on Green with its five parts in order', () => {
    const draft = start();
    expect(draft.trialId).toBe('three-mile-trial');
    expect(draft.phaseResults.map((phase) => phase.phaseId)).toEqual([
      'three-mile-walk',
      'suitcase-carry',
      'stair-test',
      'leadership-reflection',
      'psalm-and-prayer',
    ]);
    expect(() =>
      createTrialDraft('three-mile-trial', date, yellow, `${date}T12:00:00.000Z`),
    ).toThrow('The full Three-Mile Trial waits for a Green readiness day.');
  });

  it('holds each part to what the pack writes', () => {
    const phases = completeThreeMilePhases();
    phases.forEach((phase, index) => expect(threeMilePhaseComplete(phase, index)).toBe(true));
    const shortWalk = { ...phases[0], metrics: { ...phases[0].metrics, distanceMiles: 2.5 } };
    expect(threeMilePhaseComplete(shortWalk, 0)).toBe(false);
    const lightCarry = { ...phases[1], metrics: { ...phases[1].metrics, loadPounds: 25 } };
    expect(threeMilePhaseComplete(lightCarry, 1)).toBe(false);
    const shortSide = { ...phases[1], metrics: { ...phases[1].metrics, leftSeconds: 45 } };
    expect(threeMilePhaseComplete(shortSide, 1)).toBe(false);
    expect(
      threeMilePhaseComplete(
        { phaseId: 'stair-test', metrics: { flights: 2, breathlessness: 4 } },
        2,
      ),
    ).toBe(false);
    expect(
      threeMilePhaseComplete({ phaseId: 'psalm-and-prayer', metrics: { confirmed: false } }, 4),
    ).toBe(false);
  });

  it('moves part by part and completes into a validated result', () => {
    let draft = start();
    const phases = completeThreeMilePhases();
    for (let index = 0; index < phases.length; index++) {
      const edited = structuredClone(draft);
      edited.phaseResults[index] = phases[index];
      if (index < phases.length - 1) edited.currentPhaseIndex = index + 1;
      draft = updateTrialDraft(draft, edited, green, `${date}T12:0${index + 1}:00.000Z`);
    }
    const result = completeTrialDraft(draft, green, `${date}T13:00:00.000Z`);
    expect(result.trialId).toBe('three-mile-trial');
    expect(result.reflection).toContain('Behavior to change: Put the phone away at dinner');
    expect(validateCompletedThreeMileTrialResult(result).id).toBe('tm-1');
  });

  it('will not move past a physical part once readiness turns Yellow', () => {
    const draft = start();
    const edited = structuredClone(draft);
    edited.phaseResults[0] = completeThreeMilePhases()[0];
    edited.currentPhaseIndex = 1;
    expect(() => updateTrialDraft(draft, edited, yellow, `${date}T12:30:00.000Z`)).toThrow(
      'waits for a Green readiness day',
    );
  });

  it('records pain on the stair test and keeps a stopped attempt', () => {
    const draft = start();
    const pain = createRecordedTrialPain(
      draft,
      { phaseId: 'stair-test', bodyArea: 'Knee', severity: 3, actionTaken: 'reduce' },
      `${date}T12:10:00.000Z`,
    );
    expect(pain.trialPhaseId).toBe('stair-test');
    expect(() =>
      createRecordedTrialPain(
        draft,
        {
          phaseId: 'leadership-reflection',
          bodyArea: 'Knee',
          severity: 1,
          actionTaken: 'continue',
        },
        `${date}T12:11:00.000Z`,
      ),
    ).toThrow('physical Three-Mile Trial phase');
    expect(stopTrialDraft(draft, `${date}T12:20:00.000Z`).outcome).toBe('stopped');
  });
});
