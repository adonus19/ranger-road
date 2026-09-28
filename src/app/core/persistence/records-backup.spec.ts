import { describe, expect, it } from 'vitest';
import {
  DAMAGED_RECORDS_COPY,
  NEWER_RECORDS_COPY,
  NOT_A_RECORDS_COPY,
  createRecordsBackup,
  parseRecordsBackup,
  recordsMissingFrom,
  summarizeRecords,
} from './records-backup';
import { DATABASE_VERSION, STORE_NAMES, type StoreRecords } from './road-database';

function emptyStores(): StoreRecords {
  return Object.fromEntries(STORE_NAMES.map((name) => [name, []])) as unknown as StoreRecords;
}

function sampleStores(): StoreRecords {
  return {
    ...emptyStores(),
    campaigns: [
      { id: 'primary', startDate: '2026-10-05', currentChapterId: 'chapter-1', status: 'active' },
    ],
    readinessChecks: [
      {
        id: 'readiness-1',
        date: '2026-10-05',
        checkedAt: '2026-10-05T11:00:00.000Z',
        status: 'green',
      },
      {
        id: 'readiness-2',
        date: '2026-10-07',
        checkedAt: '2026-10-07T11:00:00.000Z',
        status: 'yellow',
      },
    ],
    journalEntries: [
      { id: 'watch-1', date: '2026-10-06', type: 'morning-watch', response: 'Patience.' },
    ],
    postMissionFunctions: [
      { id: 'recovery-1', trialResultId: 'gate-1', recordedAt: '2026-10-31T15:00:00.000Z' },
    ],
  };
}

describe('records backup file', () => {
  it('round-trips every store through JSON exactly as saved', () => {
    const backup = createRecordsBackup(sampleStores(), '2026-10-12T23:02:00.000Z');

    expect(backup).toMatchObject({
      format: 'rangers-road-records',
      version: 1,
      databaseVersion: DATABASE_VERSION,
      savedAt: '2026-10-12T23:02:00.000Z',
    });
    expect(parseRecordsBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('opens a copy from an older schema with the later stores empty', () => {
    const stores: Record<string, unknown> = { ...sampleStores() };
    delete stores['postMissionFunctions'];
    const parsed = parseRecordsBackup(
      JSON.stringify({ ...createRecordsBackup(sampleStores()), databaseVersion: 3, stores }),
    );

    expect(parsed.databaseVersion).toBe(3);
    expect(parsed.stores.postMissionFunctions).toEqual([]);
    expect(parsed.stores.readinessChecks).toHaveLength(2);
  });

  it('refuses files that are not a copy of these records', () => {
    expect(() => parseRecordsBackup('not json')).toThrow(NOT_A_RECORDS_COPY);
    expect(() => parseRecordsBackup('[]')).toThrow(NOT_A_RECORDS_COPY);
    expect(() =>
      parseRecordsBackup(JSON.stringify({ format: 'something-else', stores: {} })),
    ).toThrow(NOT_A_RECORDS_COPY);
  });

  it('refuses a copy from a newer app or schema instead of dropping what it cannot read', () => {
    const backup = createRecordsBackup(sampleStores());

    expect(() => parseRecordsBackup(JSON.stringify({ ...backup, version: 2 }))).toThrow(
      NEWER_RECORDS_COPY,
    );
    expect(() =>
      parseRecordsBackup(JSON.stringify({ ...backup, databaseVersion: DATABASE_VERSION + 1 })),
    ).toThrow(NEWER_RECORDS_COPY);
  });

  it('refuses a damaged copy before anything is replaced', () => {
    const backup = createRecordsBackup(sampleStores());
    const withStores = (stores: Record<string, unknown>) =>
      JSON.stringify({ ...backup, stores: { ...backup.stores, ...stores } });

    expect(() => parseRecordsBackup(JSON.stringify({ ...backup, savedAt: 'yesterday' }))).toThrow(
      DAMAGED_RECORDS_COPY,
    );
    expect(() => parseRecordsBackup(withStores({ unknownStore: [] }))).toThrow(
      DAMAGED_RECORDS_COPY,
    );
    expect(() => parseRecordsBackup(withStores({ journalEntries: {} }))).toThrow(
      DAMAGED_RECORDS_COPY,
    );
    expect(() =>
      parseRecordsBackup(withStores({ journalEntries: [{ date: '2026-10-06' }] })),
    ).toThrow(DAMAGED_RECORDS_COPY);
    expect(() =>
      parseRecordsBackup(withStores({ journalEntries: [{ id: 'same' }, { id: 'same' }] })),
    ).toThrow(DAMAGED_RECORDS_COPY);
    expect(() =>
      parseRecordsBackup(withStores({ campaigns: [{ id: 'primary', startDate: '2026-02-30' }] })),
    ).toThrow(DAMAGED_RECORDS_COPY);
    expect(() =>
      parseRecordsBackup(withStores({ readinessChecks: [{ id: 'readiness-1' }] })),
    ).toThrow(DAMAGED_RECORDS_COPY);
    expect(() =>
      parseRecordsBackup(withStores({ workoutDrafts: [{ id: 'draft-1' }, { id: 'draft-2' }] })),
    ).toThrow(DAMAGED_RECORDS_COPY);
  });

  it('summarizes Day 1, the newest dated entry and the row count without the campaign', () => {
    expect(summarizeRecords(sampleStores())).toEqual({
      startDate: '2026-10-05',
      latestDate: '2026-10-07',
      count: 4,
    });
    expect(summarizeRecords(emptyStores())).toEqual({ count: 0 });
  });

  it('counts the rows on this device that a copy would remove', () => {
    const device = sampleStores();
    device.readinessChecks.push({ id: 'readiness-3', date: '2026-10-09' });
    device.workoutDrafts.push({ id: 'draft-1', date: '2026-10-09' });

    expect(recordsMissingFrom(device, sampleStores())).toBe(2);
    expect(recordsMissingFrom(sampleStores(), device)).toBe(0);
    expect(recordsMissingFrom(emptyStores(), sampleStores())).toBe(0);
  });
});
