import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck, TrialResult } from '../domain/models';
import type { RecoveryInput } from '../domain/post-mission-function';
import { createGateTrialDraft, stopGateTrialDraft } from '../domain/trial-draft';
import { createGateTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { DATABASE_VERSION, RoadDatabase, STORE_NAMES } from './road-database';

const green: ReadinessCheck = {
  id: 'gate-green',
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

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-09-25',
  currentChapterId: 'chapter-1',
  status: 'active',
};

const answers: RecoveryInput = {
  id: 'recovery-1',
  trialResultId: 'gate-result',
  energy: 'steady',
  soreness: 'a-little',
  irritability: 'calm',
  helpAtHome: 'fully',
  familyLife: 'partly',
};

function completeResult(): TrialResult {
  const result = createGateTrialResult({
    ...completeGateTrialInput(green),
    id: 'gate-result',
    recordedAt: '2026-10-22T14:30:00.000Z',
  });
  result.phaseResults[1].metrics!['effortEndedAt'] = '2026-10-22T14:00:00.000Z';
  return result;
}

describe('post-mission function persistence', () => {
  it('saves one linked recovery check without changing its completed trial', async () => {
    const name = `recovery-${crypto.randomUUID()}`;
    const firstTab = await RoadDatabase.open(name);
    await firstTab.putCampaign(campaign);
    await firstTab.addReadinessCheck(green);
    const original = completeResult();
    await firstTab.addTrialResult(original as ReturnType<typeof createGateTrialResult>);
    await expect(firstTab.addPostMissionFunction(answers, '2026-10-22T14:59:59.999Z'))
      .rejects.toThrow(/60 minutes/);
    expect(await firstTab.getPostMissionFunctions()).toEqual([]);

    const secondTab = await RoadDatabase.open(name);
    const writes = await Promise.allSettled([
      firstTab.addPostMissionFunction(answers, '2026-10-22T15:00:00.000Z'),
      secondTab.addPostMissionFunction({ ...answers, id: 'recovery-2' }, '2026-10-22T15:01:00.000Z'),
    ]);
    expect(writes.filter((write) => write.status === 'fulfilled')).toHaveLength(1);
    expect(writes.filter((write) => write.status === 'rejected')).toHaveLength(1);
    firstTab.close();
    secondTab.close();

    const reopened = await RoadDatabase.open(name);
    const recoveries = await reopened.getPostMissionFunctions();
    expect(recoveries).toHaveLength(1);
    expect(recoveries[0]).toMatchObject({ trialResultId: original.id, effortEndedAt: '2026-10-22T14:00:00.000Z' });
    expect(await reopened.getTrialResultsForTrial('gate-trial')).toEqual([original]);
    await expect(reopened.addPostMissionFunction({ ...answers, id: 'recovery-3' }, '2026-10-22T16:00:00.000Z'))
      .rejects.toThrow(/already has/);
    await expect(reopened.addPostMissionFunction({ ...answers, id: 'missing', trialResultId: 'missing' }, '2026-10-22T16:00:00.000Z'))
      .rejects.toThrow(/not found/);
    expect(await reopened.getPostMissionFunctions()).toEqual(recoveries);
    reopened.close();
  });

  it('upgrades v3 in place and preserves a draft, stopped attempt, completed result, and pain', async () => {
    const name = `recovery-upgrade-${crypto.randomUUID()}`;
    const old = await openRawV3(name);
    const draft = createGateTrialDraft(green.date, green, '2026-10-22T12:00:00.000Z', 'active-draft');
    const attempt = stopGateTrialDraft(
      { ...draft, id: 'stopped-attempt' },
      '2026-10-22T13:00:00.000Z',
    );
    const result = completeResult();
    const pain = {
      id: 'old-pain',
      timestamp: '2026-10-22T12:30:00.000Z',
      bodyArea: 'Knee',
      severity: 2,
      actionTaken: 'continue',
      trialAttemptId: attempt.id,
      trialPhaseId: 'brisk-walk',
    };
    await addRaw(old, 'trialDrafts', draft);
    await addRaw(old, 'trialAttempts', attempt);
    await addRaw(old, 'trialResults', result);
    await addRaw(old, 'painEvents', pain);
    old.close();

    expect(DATABASE_VERSION).toBe(4);
    const upgraded = await RoadDatabase.open(name);
    expect(await upgraded.getActiveTrialDraft()).toEqual(draft);
    expect(await upgraded.getStoppedTrialAttemptsForTrial('gate-trial')).toEqual([attempt]);
    expect(await upgraded.getTrialResultsForTrial('gate-trial')).toEqual([result]);
    expect(await upgraded.getTrialPainForAttempt(attempt.id)).toEqual([pain]);
    expect(await upgraded.getPostMissionFunctions()).toEqual([]);
    const saved = await upgraded.addPostMissionFunction(answers, '2026-10-22T15:00:00.000Z');
    expect(saved.effortEndedAt).toBe('2026-10-22T14:00:00.000Z');
    expect(await upgraded.getActiveTrialDraft()).toEqual(draft);
    expect(await upgraded.getTrialResultsForTrial('gate-trial')).toEqual([result]);
    upgraded.close();
  });
});

function openRawV3(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 3);
    request.onupgradeneeded = () => {
      for (const store of STORE_NAMES) {
        if (store !== 'postMissionFunctions') {
          request.result.createObjectStore(store, { keyPath: 'id' });
        }
      }
      request.transaction!.objectStore('readinessChecks').createIndex('date', 'date');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function addRaw(database: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite');
    transaction.objectStore(store).add(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
