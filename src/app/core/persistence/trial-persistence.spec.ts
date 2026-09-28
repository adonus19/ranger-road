import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck, TrialResult } from '../domain/models';
import { createGateTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { RoadDatabase } from './road-database';

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

function result(id = 'gate-result-1') {
  return createGateTrialResult({
    ...completeGateTrialInput(green),
    id,
  });
}

describe('Gate Trial persistence', () => {
  it('appends a complete result with its original definition and reads it after a reopen', async () => {
    const name = `gate-trial-${crypto.randomUUID()}`;
    const database = await RoadDatabase.open(name);
    await database.putCampaign(campaign);
    await database.addReadinessCheck(green);
    const saved = result();
    await database.addTrialResult(saved);
    await expect(database.addTrialResult({ ...saved, reflection: 'Rewritten.' })).rejects.toThrow();
    database.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getTrialResultsForTrial('gate-trial')).toEqual([saved]);
    expect(await reopened.getTrialResultsForTrial('other-trial')).toEqual([]);
    reopened.close();
  });

  it('refuses a completion if the recorded check is missing or no longer latest', async () => {
    const database = await RoadDatabase.open(`gate-trial-${crypto.randomUUID()}`);
    await database.putCampaign(campaign);
    const saved = result();
    await expect(database.addTrialResult(saved)).rejects.toThrow(/Readiness changed/);
    await database.addReadinessCheck(green);
    await database.addReadinessCheck({
      ...green,
      id: 'gate-yellow-later',
      checkedAt: '2026-10-22T13:00:00.000Z',
      poorSleep: true,
      status: 'yellow',
    });
    await expect(database.addTrialResult(saved)).rejects.toThrow(/Readiness changed/);
    expect(await database.getTrialResultsForTrial('gate-trial')).toEqual([]);
    database.close();
  });

  it('refuses a completion recorded before its linked readiness check', async () => {
    const database = await RoadDatabase.open(`gate-trial-${crypto.randomUUID()}`);
    await database.putCampaign(campaign);
    const saved = result();
    await database.addReadinessCheck({ ...green, checkedAt: '2026-10-22T17:00:00.000Z' });
    await expect(database.addTrialResult(saved)).rejects.toThrow(/Readiness changed/);
    expect(await database.getTrialResultsForTrial('gate-trial')).toEqual([]);
    database.close();
  });

  it('rejects completion without a campaign or before its Day 1', async () => {
    const database = await RoadDatabase.open(`gate-trial-${crypto.randomUUID()}`);
    await database.addReadinessCheck(green);
    const saved = result();
    await expect(database.addTrialResult(saved)).rejects.toThrow(/campaign Day 1/);
    await database.putCampaign({ ...campaign, startDate: '2026-10-23' });
    await expect(database.addTrialResult(saved)).rejects.toThrow(/campaign Day 1/);
    expect(await database.getTrialResultsForTrial('gate-trial')).toEqual([]);
    database.close();
  });

  it('rejects a forged result and does not permit bypass through the generic history writer', async () => {
    const database = await RoadDatabase.open(`gate-trial-${crypto.randomUUID()}`);
    await database.putCampaign(campaign);
    await database.addReadinessCheck(green);
    const saved = result();
    await expect(
      database.addTrialResult({ ...saved, definitionSnapshot: undefined } as never),
    ).rejects.toThrow(/definition snapshot/);
    await expect(
      database.addTrialResult({
        ...saved,
        phaseResults: saved.phaseResults.map((phase) =>
          phase.phaseId === 'psalm-and-prayer' ? { phaseId: phase.phaseId } : phase,
        ),
      }),
    ).rejects.toThrow(/Confirm the Psalm 121/);
    await expect(database.addHistorical('trialResults', saved)).rejects.toThrow(
      /Use addTrialResult/,
    );
    expect(await database.getTrialResultsForTrial('gate-trial')).toEqual([]);
    database.close();
  });

  it('keeps older v1 trial rows readable without rewriting them', async () => {
    const name = `gate-trial-${crypto.randomUUID()}`;
    const database = await RoadDatabase.open(name);
    database.close();

    const legacy: TrialResult = {
      id: 'legacy-result',
      trialId: 'gate-trial',
      date: '2026-01-01',
      phaseResults: [],
      reflection: 'Older recorded reflection.',
      postMissionFunction: 'Fine afterward.',
    };
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = raw.transaction('trialResults', 'readwrite');
      transaction.objectStore('trialResults').add(legacy);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    raw.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getTrialResultsForTrial('gate-trial')).toEqual([legacy]);
    reopened.close();
  });
});
