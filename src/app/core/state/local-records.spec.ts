import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReadinessCheck } from '../domain/models';
import { parseRecordsBackup } from '../persistence/records-backup';
import { DATABASE_NAME } from '../persistence/road-database';
import { CampaignState } from './campaign-state';
import { LocalRecords, recordsBackupFileName } from './local-records';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const readinessInput = {
  date: '2026-10-06',
  sleepHours: 7,
  poorSleep: false,
  energy: 4 as const,
  backPain: 1,
  shoulderPain: 0,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
};

describe('LocalRecords', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 9, 0));
    TestBed.resetTestingModule();
    await deleteDatabase();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('names the copy for the day it was saved on this device', () => {
    expect(recordsBackupFileName(new Date(2026, 9, 12, 23, 30).toISOString())).toBe(
      'rangers-road-records-2026-10-12.json',
    );
  });

  it('restores a copy and shows its campaign and today’s readiness without a reload', async () => {
    const state = TestBed.inject(CampaignState);
    const records = TestBed.inject(LocalRecords);
    await state.initialize();
    await state.startCampaign('2026-10-05');
    await state.recordReadiness(readinessInput);
    const saved = parseRecordsBackup(JSON.stringify(await records.backup()));
    expect(saved.stores.campaigns).toHaveLength(1);
    expect(saved.stores.readinessChecks).toHaveLength(1);

    const restoredCheck: ReadinessCheck = {
      ...readinessInput,
      id: 'readiness-from-copy',
      checkedAt: '2026-10-06T12:00:00.000Z',
      status: 'yellow',
      backPain: 4,
    };
    const copy = parseRecordsBackup(
      JSON.stringify({
        ...saved,
        stores: {
          ...saved.stores,
          campaigns: [{ ...saved.stores.campaigns[0], startDate: '2026-09-28' }],
          readinessChecks: [restoredCheck],
        },
      }),
    );

    await records.restore(copy);

    expect(state.campaign()?.startDate).toBe('2026-09-28');
    expect(state.readiness()?.id).toBe('readiness-from-copy');
    expect((await records.read()).readinessChecks).toEqual([restoredCheck]);
  });
});
