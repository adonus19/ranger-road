import { describe, expect, it } from 'vitest';
import type { TrialResult } from './models';
import {
  createPostMissionFunction,
  pendingRecovery,
  recoveryOpensAt,
  type RecoveryInput,
} from './post-mission-function';

const effortEndedAt = '2026-10-22T14:00:00.000Z';
const recordedAt = '2026-10-22T14:30:00.000Z';

const result: TrialResult = {
  id: 'gate-result',
  trialId: 'gate-trial',
  date: '2026-10-22',
  recordedAt,
  phaseResults: [
    { phaseId: 'brisk-walk' },
    { phaseId: 'controlled-circuit', metrics: { effortEndedAt } },
    { phaseId: 'mind-reflection' },
    { phaseId: 'psalm-and-prayer' },
    { phaseId: 'rangers-oath' },
  ],
  reflection: 'I stayed steady.',
};

const answers: RecoveryInput = {
  id: 'recovery-1',
  trialResultId: result.id,
  energy: 'steady',
  soreness: 'a-little',
  irritability: 'calm',
  helpAtHome: 'fully',
  familyLife: 'partly',
};

describe('post-mission function', () => {
  it('times the Three-Mile Trial’s check from the end of the stair test', () => {
    const threeMile: TrialResult = {
      id: 'three-mile-result',
      trialId: 'three-mile-trial',
      date: '2026-11-30',
      recordedAt: '2026-11-30T16:00:00.000Z',
      phaseResults: [
        { phaseId: 'three-mile-walk' },
        { phaseId: 'suitcase-carry' },
        { phaseId: 'stairs', metrics: { effortEndedAt: '2026-11-30T14:00:00.000Z' } },
        { phaseId: 'reflection' },
        { phaseId: 'prayer' },
      ],
      reflection: '',
    };
    expect(recoveryOpensAt(threeMile)).toBe(Date.parse('2026-11-30T15:00:00.000Z'));
    const saved = createPostMissionFunction(
      threeMile,
      { ...answers, trialResultId: threeMile.id },
      '2026-11-30T15:10:00.000Z',
    );
    expect(saved).toMatchObject({
      trialId: 'three-mile-trial',
      effortEndedAt: '2026-11-30T14:00:00.000Z',
      minutesAfter: 70,
    });
  });

  it('opens 60 minutes after the physical effort, including when the result was saved later', () => {
    expect(recoveryOpensAt(result)).toBe(Date.parse('2026-10-22T15:00:00.000Z'));
    expect(() => createPostMissionFunction(result, answers, '2026-10-22T14:59:59.999Z'))
      .toThrow(/60 minutes/);

    const saved = createPostMissionFunction(result, { ...answers, note: '  Helped with dinner.  ' }, '2026-10-22T15:00:00.000Z');
    expect(saved).toMatchObject({
      trialId: result.trialId,
      trialResultId: result.id,
      effortEndedAt,
      recordedAt: '2026-10-22T15:00:00.000Z',
      minutesAfter: 60,
      note: 'Helped with dinner.',
    });
    expect(result.postMissionFunction).toBeUndefined();
  });

  it('uses the result save time for older records without an effort timestamp', () => {
    const oldResult = { ...result, phaseResults: [] };
    expect(recoveryOpensAt(oldResult)).toBe(Date.parse('2026-10-22T15:30:00.000Z'));
    const saved = createPostMissionFunction(oldResult, answers, '2026-10-22T15:30:00.000Z');
    expect(saved.effortEndedAt).toBe(recordedAt);
    expect(saved.minutesAfter).toBe(60);
  });

  it('requires a linked result, a valid time, all five answers, and a short note', () => {
    expect(() => createPostMissionFunction(result, { ...answers, id: ' ' }, '2026-10-22T15:00:00.000Z'))
      .toThrow(/identifier/);
    expect(() => createPostMissionFunction(result, { ...answers, trialResultId: 'other' }, '2026-10-22T15:00:00.000Z'))
      .toThrow(/different trial/);
    expect(() => createPostMissionFunction(
      { ...result, postMissionFunction: 'Recovered well.' }, answers, '2026-10-22T15:00:00.000Z',
    )).toThrow(/already has/);
    expect(() => createPostMissionFunction(result, answers, 'bad timestamp'))
      .toThrow(/valid recovery check time/);
    for (const field of ['energy', 'soreness', 'irritability', 'helpAtHome', 'familyLife'] as const) {
      expect(() => createPostMissionFunction(
        result,
        { ...answers, [field]: '' },
        '2026-10-22T15:00:00.000Z',
      )).toThrow(/Choose a word/);
    }
    expect(() => createPostMissionFunction(
      result,
      { ...answers, note: 'x'.repeat(501) },
      '2026-10-22T15:00:00.000Z',
    )).toThrow(/500 characters/);
  });

  it('offers only the newest unchecked result during Keep’s reminder window', () => {
    const previous = { ...result, id: 'previous', recordedAt: '2026-10-21T14:30:00.000Z', phaseResults: [] };
    expect(pendingRecovery([previous, result], [], Date.parse('2026-10-22T15:00:00.000Z'))?.id)
      .toBe(result.id);
    const saved = createPostMissionFunction(result, answers, '2026-10-22T15:00:00.000Z');
    expect(pendingRecovery([previous, result], [saved], Date.parse('2026-10-22T15:00:00.000Z')))
      .toBeUndefined();
  });
});
