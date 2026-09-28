import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type {
  Campaign,
  JournalEntry,
  MissionDefinition,
  MissionInstance,
  ReadinessCheck,
  RoadSession,
  WorkoutDefinition,
  WorkoutSession,
} from '../domain/models';
import { DATABASE_VERSION, migrateRoadDatabase, RoadDatabase } from './road-database';

let databaseCounter = 0;
const newName = (): string => `rangers-road-test-${++databaseCounter}`;

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-09-25',
  currentChapterId: 'chapter-1',
  status: 'active',
  trialTargetDate: '2026-10-22',
};

const readiness: ReadinessCheck = {
  id: 'readiness-1',
  date: '2026-09-25',
  checkedAt: '2026-09-25T12:00:00.000Z',
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

describe('RoadDatabase', () => {
  it('opens a versioned schema and explicitly updates campaign state', async () => {
    const name = newName();
    const db = await RoadDatabase.open(name);
    expect(DATABASE_VERSION).toBe(3);
    expect(await db.getCampaign('primary')).toBeUndefined();

    await db.putCampaign(campaign);
    await db.putCampaign({ ...campaign, status: 'paused' });
    db.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getCampaign('primary')).toEqual({ ...campaign, status: 'paused' });
    reopened.close();
  });

  it('retains every readiness check and returns the latest for a local date', async () => {
    const db = await RoadDatabase.open(newName());
    const later = {
      ...readiness,
      id: 'readiness-2',
      checkedAt: '2026-09-25T19:00:00.000Z',
      poorSleep: true,
      status: 'yellow' as const,
    };

    await db.addReadinessCheck(readiness);
    await db.addReadinessCheck(later);
    expect(await db.getLatestReadinessForDate('2026-09-25')).toEqual(later);
    expect(await db.getLatestReadinessForDate('2026-09-26')).toBeUndefined();
    expect(await db.getAllReadinessChecks()).toHaveLength(2);
    await expect(db.addReadinessCheck({ ...later, status: 'red' })).rejects.toThrow();
    expect(await db.getAllReadinessChecks()).toHaveLength(2);
    db.close();
  });

  it('uses append-only writes for journal history across a reopen', async () => {
    const name = newName();
    const db = await RoadDatabase.open(name);
    const entry: JournalEntry & { id: string } = {
      id: 'entry-1',
      date: '2026-09-25',
      type: 'evening-watch',
      prompt: 'Gratitude',
      response: 'A quiet dinner together.',
    };

    await db.addHistorical('journalEntries', entry);
    await expect(
      db.addHistorical('journalEntries', { ...entry, response: 'Overwritten' }),
    ).rejects.toThrow();
    db.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getAllHistorical('journalEntries')).toEqual([entry]);
    reopened.close();
  });

  it('retains the recorded workout definition when program content changes', async () => {
    const db = await RoadDatabase.open(newName());
    const definition: WorkoutDefinition = { id: 'forge-a', title: 'Forge A', exercises: [] };
    const session: WorkoutSession = {
      id: 'session-1',
      date: '2026-09-25',
      workoutDefinitionId: definition.id,
      readinessId: readiness.id,
      exerciseResults: [],
      definitionSnapshot: structuredClone(definition),
    };

    await db.addHistorical('workoutSessions', session);
    definition.title = 'Updated later';
    expect((await db.getAllHistorical('workoutSessions'))[0].definitionSnapshot?.title).toBe(
      'Forge A',
    );
    db.close();
  });

  it('reads every mission attempt for a date in time order and keeps snapshots after a reopen', async () => {
    const name = newName();
    const db = await RoadDatabase.open(name);
    const definition: MissionDefinition = {
      id: 'chapter-1-week-1-day-1-weekly',
      chapterId: 'chapter-1',
      week: 1,
      day: 1,
      missionType: 'strength',
      title: 'Strength / Forge A or Forge B',
      required: true,
      contentReferences: [],
    };
    const first: MissionInstance = {
      id: 'attempt-1',
      definitionId: definition.id,
      date: '2026-09-25',
      status: 'rest',
      reduced: false,
      notes: 'Needed rest.',
      completedAt: '2026-09-25T18:00:00.000Z',
      definitionSnapshot: structuredClone(definition),
    };
    const second: MissionInstance = {
      ...first,
      id: 'attempt-2',
      status: 'completed',
      notes: undefined,
      completedAt: '2026-09-25T09:00:00.000Z',
    };
    const anotherDay = { ...first, id: 'attempt-3', date: '2026-09-26' };

    await db.addMissionInstance(first);
    await db.addMissionInstance(second);
    await db.addMissionInstance(anotherDay);
    await expect(db.addMissionInstance({ ...first, notes: 'Replacement.' })).rejects.toThrow();
    definition.title = 'Changed later';
    db.close();

    const reopened = await RoadDatabase.open(name);
    expect(
      (await reopened.getMissionInstancesForDate('2026-09-25')).map((item) => item.id),
    ).toEqual(['attempt-2', 'attempt-1']);
    expect(
      (await reopened.getMissionInstancesForDate('2026-09-25'))[0].definitionSnapshot?.title,
    ).toBe('Strength / Forge A or Forge B');
    expect(await reopened.getMissionInstancesForDate('2026-09-27')).toEqual([]);
    expect(await reopened.getAllHistorical('missionInstances')).toHaveLength(3);
    reopened.close();
  });

  it('refuses new mission history without a matching definition snapshot', async () => {
    const db = await RoadDatabase.open(newName());
    const record: MissionInstance = {
      id: 'incomplete-attempt',
      definitionId: 'chapter-1-week-1-day-1-weekly',
      date: '2026-09-25',
      status: 'completed',
      reduced: false,
    };

    await expect(db.addMissionInstance(record)).rejects.toThrow(/matching definition snapshot/);
    await expect(
      db.addHistorical('missionInstances', {
        ...record,
        definitionSnapshot: {
          id: 'different-definition',
          chapterId: 'chapter-1',
          week: 1,
          day: 1,
          missionType: 'strength',
          title: 'Strength',
          required: true,
          contentReferences: [],
        },
      }),
    ).rejects.toThrow(/matching definition snapshot/);
    expect(await db.getAllHistorical('missionInstances')).toEqual([]);
    db.close();
  });

  it('does not allow the generic mission store to complete a planned trial', async () => {
    const db = await RoadDatabase.open(newName());
    const definition: MissionDefinition = {
      id: 'chapter-1-week-4-day-6-weekly',
      chapterId: 'chapter-1',
      week: 4,
      day: 6,
      missionType: 'trial',
      title: 'Gate Trial',
      required: true,
      contentReferences: ['gate-trial'],
      plannedTrialId: 'gate-trial',
    };
    const record: MissionInstance = {
      id: 'forged-trial-mission',
      definitionId: definition.id,
      date: '2026-10-03',
      status: 'completed',
      reduced: false,
      definitionSnapshot: definition,
    };

    await expect(db.addMissionInstance(record)).rejects.toThrow(/Use addTrialResult/);
    await expect(db.addHistorical('missionInstances', record)).rejects.toThrow(
      /Use addTrialResult/,
    );
    expect(await db.getAllHistorical('missionInstances')).toEqual([]);
    db.close();
  });

  it('keeps road sessions append-only across a reopen and filters by local date', async () => {
    const name = newName();
    const db = await RoadDatabase.open(name);
    const session: RoadSession & { id: string } = {
      id: 'road-1',
      date: '2026-09-25',
      distance: 2,
      duration: 37,
      terrain: 'Road',
      rpe: 5,
      painBefore: 1,
      painAfter: 2,
    };

    await db.addRoadSession(session);
    await db.addRoadSession({ ...session, id: 'road-2', date: '2026-09-26' });
    await expect(db.addRoadSession({ ...session, distance: 3 })).rejects.toThrow();
    await expect(db.addRoadSession({ ...session, id: 'invalid', painAfter: 12 })).rejects.toThrow();
    db.close();

    const reopened = await RoadDatabase.open(name);
    const saved = await reopened.getRoadSessionsForDate('2026-09-25');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject(session);
    expect(saved[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(await reopened.getRoadSessionsForDate('2026-09-27')).toEqual([]);
    expect(await reopened.getAllHistorical('roadSessions')).toHaveLength(2);
    reopened.close();
  });

  it('keeps a legacy Road row without a save timestamp behind newer same-day rows', async () => {
    const db = await RoadDatabase.open(newName());
    const base = { date: '2026-09-25', distance: 1, duration: 20, terrain: 'Path', rpe: 3 };
    await db.addHistorical('roadSessions', { ...base, id: 'z-legacy' });
    await db.addRoadSession({ ...base, id: 'a-new' });

    expect((await db.getRoadSessionsForDate(base.date)).map((item) => item.id)).toEqual([
      'a-new',
      'z-legacy',
    ]);
    db.close();
  });

  it('keeps measurements append-only and refuses an invalid one', async () => {
    const name = newName();
    const db = await RoadDatabase.open(name);
    const entry = {
      id: 'measure-1',
      kind: 'check-in' as const,
      date: '2026-10-12',
      recordedAt: '2026-10-12T14:00:00.000Z',
      weight: 221.6,
      waist: 41.5,
      restingHeartRate: 68,
    };
    await db.putCampaign(campaign);
    await db.addMeasurementEntry(entry);
    await expect(db.addMeasurementEntry({ ...entry, weight: 219 })).rejects.toThrow();
    await expect(
      db.addMeasurementEntry({ ...entry, id: 'measure-2', restingHeartRate: undefined }),
    ).rejects.toThrow();
    db.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getAllHistorical('measurementEntries')).toEqual([
      {
        ...entry,
        readinessSummary: { from: '2026-09-15', to: '2026-10-12', checks: 0 },
      },
    ]);
    reopened.close();
  });

  it('checks the window atomically when two tabs try to save the same monthly check-in', async () => {
    const name = newName();
    const firstTab = await RoadDatabase.open(name);
    const secondTab = await RoadDatabase.open(name);
    await firstTab.putCampaign(campaign);
    const entry = {
      id: 'measure-first',
      kind: 'check-in' as const,
      date: '2026-09-25',
      recordedAt: '2026-09-25T12:00:00.000Z',
      weight: 221,
      waist: 41,
      restingHeartRate: 68,
    };

    const results = await Promise.allSettled([
      firstTab.addMeasurementEntry(entry),
      secondTab.addMeasurementEntry({ ...entry, id: 'measure-second' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await firstTab.getAllHistorical('measurementEntries')).toHaveLength(1);
    firstTab.close();
    secondTab.close();
  });

  it('requires a same-day non-Red check for any physical test but permits body-only check-ins', async () => {
    const db = await RoadDatabase.open(newName());
    await db.putCampaign(campaign);
    const body = {
      id: 'measure-body',
      kind: 'check-in' as const,
      date: '2026-09-25',
      recordedAt: '2026-09-25T12:00:00.000Z',
      weight: 221,
      waist: 41,
      restingHeartRate: 68,
    };
    const testFields = [
      { pushups: 10 },
      { pullupAssistance: 'none' },
      { squatDepth: 'parallel' as const },
      { toeReach: 3 },
    ];
    for (const [index, field] of testFields.entries()) {
      await expect(
        db.addMeasurementEntry({ ...body, ...field, id: `test-${index}` }),
      ).rejects.toThrow('Check readiness today');
    }
    expect(await db.getAllHistorical('measurementEntries')).toEqual([]);
    await db.addMeasurementEntry(body);
    expect(await db.getAllHistorical('measurementEntries')).toHaveLength(1);
    db.close();
  });

  it('uses the newest same-day check if readiness turns Red before a prepared test is saved', async () => {
    const db = await RoadDatabase.open(newName());
    await db.putCampaign(campaign);
    await db.addReadinessCheck(readiness);
    const prepared = {
      id: 'prepared-test',
      kind: 'check-in' as const,
      date: '2026-09-25',
      recordedAt: '2026-09-25T18:00:00.000Z',
      weight: 221,
      waist: 41,
      restingHeartRate: 68,
      pushups: 10,
    };
    await db.addReadinessCheck({
      ...readiness,
      id: 'readiness-red-later',
      checkedAt: '2026-09-25T17:00:00.000Z',
      energy: 1,
      status: 'red',
    });
    await expect(db.addMeasurementEntry(prepared)).rejects.toThrow('Red');
    expect(await db.getAllHistorical('measurementEntries')).toEqual([]);
    db.close();
  });

  it('captures a fresh readiness lookback and allows held tests only on a later non-Red day', async () => {
    const db = await RoadDatabase.open(newName());
    await db.putCampaign(campaign);
    const red = {
      ...readiness,
      status: 'red' as const,
      energy: 1,
    };
    await db.addReadinessCheck(red);
    const checkIn = {
      id: 'measure-red',
      kind: 'check-in' as const,
      date: '2026-09-25',
      recordedAt: '2026-09-25T15:00:00.000Z',
      weight: 221,
      waist: 41,
      restingHeartRate: 68,
      testsHeld: true,
      readinessSummary: { from: '1900-01-01', to: '1900-01-01', checks: 999 },
    };
    await expect(
      db.addMeasurementEntry({ ...checkIn, id: 'measure-unsafe', testsHeld: false, pushups: 10 }),
    ).rejects.toThrow('Red');
    const saved = await db.addMeasurementEntry(checkIn);
    expect(saved.readinessSummary).toEqual({
      from: '2026-08-29',
      to: '2026-09-25',
      checks: 1,
      averageSleepHours: 7,
      averageBackPain: 0,
      averageShoulderPain: 0,
      averageNeckPain: 0,
    });
    await expect(
      db.addMeasurementEntry({
        id: 'tests-too-soon',
        kind: 'tests',
        date: '2026-09-25',
        recordedAt: '2026-09-25T16:00:00.000Z',
        pushups: 5,
      }),
    ).rejects.toThrow('Red');
    await expect(
      db.addMeasurementEntry({
        id: 'tests-no-readiness',
        kind: 'tests',
        date: '2026-09-26',
        recordedAt: '2026-09-26T08:00:00.000Z',
        pushups: 5,
      }),
    ).rejects.toThrow('Check readiness today');
    await db.addReadinessCheck({
      ...readiness,
      id: 'readiness-next-day',
      date: '2026-09-26',
      checkedAt: '2026-09-26T09:00:00.000Z',
      status: 'green',
    });
    const tests = {
      id: 'tests-later',
      kind: 'tests' as const,
      date: '2026-09-26',
      recordedAt: '2026-09-26T12:00:00.000Z',
      pushups: 5,
    };
    await db.addMeasurementEntry(tests);
    await expect(db.addMeasurementEntry({ ...tests, id: 'tests-again' })).rejects.toThrow(
      'no held tests',
    );
    expect(await db.getAllHistorical('measurementEntries')).toHaveLength(2);
    db.close();
  });

  it('adds missing schema parts during an upgrade without changing old history', async () => {
    const name = newName();
    const legacy = await openRaw(name, 1, (database) => {
      database.createObjectStore('journalEntries', { keyPath: 'id' });
      database.createObjectStore('readinessChecks', { keyPath: 'id' });
      database.createObjectStore('missionInstances', { keyPath: 'id' });
      database.createObjectStore('roadSessions', { keyPath: 'id' });
      database.createObjectStore('workoutSessions', { keyPath: 'id' });
      database.createObjectStore('painEvents', { keyPath: 'id' });
    });
    const oldEntry = {
      id: 'old-entry',
      date: '2026-01-01',
      type: 'daily-watch',
      prompt: 'Win',
      response: 'Kept the appointment.',
    };
    await rawAdd(legacy, 'journalEntries', oldEntry);
    await rawAdd(legacy, 'readinessChecks', readiness);
    const oldMission = {
      id: 'old-mission',
      definitionId: 'legacy-definition',
      date: '2026-01-01',
      status: 'completed',
      reduced: false,
    };
    await rawAdd(legacy, 'missionInstances', oldMission);
    const oldRoad = {
      id: 'old-road',
      date: '2026-01-01',
      distance: 1,
      duration: 20,
      terrain: 'Path',
      rpe: 3,
    };
    await rawAdd(legacy, 'roadSessions', oldRoad);
    const oldWorkout = {
      id: 'old-workout',
      date: '2026-01-01',
      workoutDefinitionId: 'old-forge',
      readinessId: readiness.id,
      exerciseResults: [],
    };
    const oldPain = {
      id: 'old-pain',
      timestamp: '2026-01-01T12:00:00.000Z',
      bodyArea: 'Back',
      severity: 2,
      actionTaken: 'Reduced load',
    };
    await rawAdd(legacy, 'workoutSessions', oldWorkout);
    await rawAdd(legacy, 'painEvents', oldPain);
    legacy.close();

    const upgraded = await openRaw(name, 3, (database, transaction) => {
      migrateRoadDatabase(database, transaction);
    });
    expect(upgraded.objectStoreNames.contains('campaigns')).toBe(true);
    expect(upgraded.objectStoreNames.contains('workoutDrafts')).toBe(true);
    expect(upgraded.objectStoreNames.contains('trialDrafts')).toBe(true);
    expect(upgraded.objectStoreNames.contains('trialAttempts')).toBe(true);
    expect(await rawGet(upgraded, 'journalEntries', 'old-entry')).toEqual(oldEntry);
    expect(await rawGet(upgraded, 'missionInstances', 'old-mission')).toEqual(oldMission);
    expect(await rawGet(upgraded, 'roadSessions', 'old-road')).toEqual(oldRoad);
    expect(await rawGet(upgraded, 'workoutSessions', 'old-workout')).toEqual(oldWorkout);
    expect(await rawGet(upgraded, 'painEvents', 'old-pain')).toEqual(oldPain);
    expect(await rawGetByDate(upgraded, readiness.date)).toEqual([readiness]);
    upgraded.close();
  });

  it('upgrades an existing version 2 database without rewriting any history or workout drafts', async () => {
    const name = newName();
    const old = await openRaw(name, 2, (database) => {
      for (const store of [
        'campaigns',
        'readinessChecks',
        'missionInstances',
        'workoutSessions',
        'painEvents',
        'measurementEntries',
        'roadSessions',
        'journalEntries',
        'trialResults',
        'workoutDrafts',
      ]) {
        database.createObjectStore(store, { keyPath: 'id' });
      }
    });
    const legacyTrial = {
      id: 'old-trial',
      trialId: 'gate-trial',
      date: '2026-01-01',
      phaseResults: [],
      reflection: 'Remembered from version 2.',
    };
    const legacyPain = {
      id: 'old-pain-v2',
      timestamp: '2026-01-01T12:00:00.000Z',
      bodyArea: 'Back',
      severity: 2,
      actionTaken: 'Reduced work',
    };
    const workoutDraft = {
      id: 'old-workout-draft',
      date: '2026-01-01',
      workoutDefinitionId: 'chapter-1-forge-a',
      readinessId: 'old-ready',
      startedAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:10:00.000Z',
    };
    await rawAdd(old, 'trialResults', legacyTrial);
    await rawAdd(old, 'painEvents', legacyPain);
    await rawAdd(old, 'workoutDrafts', workoutDraft);
    old.close();

    const upgraded = await RoadDatabase.open(name);
    expect(await upgraded.getTrialResultsForTrial('gate-trial')).toEqual([legacyTrial]);
    expect(await upgraded.getAllHistorical('painEvents')).toEqual([legacyPain]);
    expect(await upgraded.getActiveWorkoutDraft()).toEqual(workoutDraft);
    expect(await upgraded.getActiveTrialDraft()).toBeUndefined();
    expect(await upgraded.getStoppedTrialAttemptsForTrial('gate-trial')).toEqual([]);
    upgraded.close();
  });
});

function openRaw(
  name: string,
  version: number,
  upgrade: (database: IDBDatabase, transaction: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => upgrade(request.result, request.transaction!);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function rawAdd(database: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(store).add(value);
  });
}

function rawGet(database: IDBDatabase, store: string, id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store, 'readonly').objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function rawGetByDate(database: IDBDatabase, date: string): Promise<ReadinessCheck[]> {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction('readinessChecks', 'readonly')
      .objectStore('readinessChecks')
      .index('date')
      .getAll(date);
    request.onsuccess = () => resolve(request.result as ReadinessCheck[]);
    request.onerror = () => reject(request.error);
  });
}
