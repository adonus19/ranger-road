import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck } from '../domain/models';
import { RoadDatabase, STORE_NAMES, type StoreRecords } from './road-database';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

const check: ReadinessCheck = {
  id: 'readiness-1',
  date: '2026-10-06',
  checkedAt: '2026-10-06T11:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 4,
  backPain: 1,
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

function emptyStores(): StoreRecords {
  return Object.fromEntries(STORE_NAMES.map((name) => [name, []])) as unknown as StoreRecords;
}

describe('records backup persistence', () => {
  it('reads every store in one snapshot, including empty ones', async () => {
    const database = await RoadDatabase.open(`records-${crypto.randomUUID()}`);
    await database.putCampaign(campaign);
    await database.addReadinessCheck(check);
    await database.addHistorical('journalEntries', {
      id: 'watch-1',
      date: '2026-10-06',
      type: 'morning-watch',
      prompt: 'What does my family need from me today?',
      response: 'Patience.',
    });

    const records = await database.exportRecords();

    expect(Object.keys(records).sort()).toEqual([...STORE_NAMES].sort());
    expect(records.campaigns).toEqual([campaign]);
    expect(records.readinessChecks).toEqual([check]);
    expect(records.journalEntries).toHaveLength(1);
    expect(records.postMissionFunctions).toEqual([]);
    database.close();
  });

  it('replaces every store with the copy, and the date index finds restored readiness', async () => {
    const database = await RoadDatabase.open(`records-${crypto.randomUUID()}`);
    await database.putCampaign({ ...campaign, startDate: '2026-09-28' });
    await database.addHistorical('journalEntries', {
      id: 'watch-only-here',
      date: '2026-10-01',
      type: 'evening-watch',
      prompt: 'Evening',
      response: 'Gone after the restore.',
    });
    const copy: StoreRecords = {
      ...emptyStores(),
      campaigns: [{ ...campaign }],
      readinessChecks: [{ ...check }],
    };

    await database.replaceRecords(copy);

    const records = await database.exportRecords();
    expect(records.campaigns).toEqual([campaign]);
    expect(records.journalEntries).toEqual([]);
    expect(await database.getLatestReadinessForDate('2026-10-06')).toEqual(check);
    database.close();
  });

  it('leaves this device unchanged when any row in the copy cannot be stored', async () => {
    const database = await RoadDatabase.open(`records-${crypto.randomUUID()}`);
    await database.putCampaign(campaign);
    await database.addReadinessCheck(check);
    const before = await database.exportRecords();
    const broken = {
      ...emptyStores(),
      campaigns: [{ ...campaign, startDate: '2026-11-02' }],
      journalEntries: [{ id: { not: 'a key' } }],
    } as unknown as StoreRecords;

    await expect(database.replaceRecords(broken)).rejects.toBeTruthy();

    expect(await database.exportRecords()).toEqual(before);
    database.close();
  });
});
