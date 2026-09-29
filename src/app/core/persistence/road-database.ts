import type {
  Campaign,
  IsoTimestamp,
  JournalEntry,
  LocalDate,
  MeasurementEntry,
  MissionInstance,
  PainEvent,
  PostMissionFunction,
  ReadinessCheck,
  RoadSession,
  TrialAttempt,
  TrialDraft,
  TrialResult,
  WorkoutDraft,
  WorkoutSession,
} from '../domain/models';
import {
  createMeasurementEntry,
  summarizeReadiness,
  type SavedMeasurement,
} from '../domain/measurement';
import { createPostMissionFunction, type RecoveryInput } from '../domain/post-mission-function';
import { classifyReadiness } from '../domain/readiness';
import { createRoadSession } from '../domain/road-session';
import { validateCompletedGateTrialResult, type SavedGateTrialResult } from '../domain/trial';
import {
  completeGateTrialDraft,
  createGateTrialDraft,
  createRecordedTrialPain,
  stopGateTrialDraft,
  updateGateTrialDraft,
  type RecordedTrialPainEvent,
  type TrialPainInput,
} from '../domain/trial-draft';
import {
  completeWorkoutDraft,
  createRecordedWorkoutPain,
  createWorkoutDraft,
  latestWorkoutReadiness,
  previousWorkoutLoad,
  updateWorkoutDraft,
  type PreviousWorkoutLoad,
  type RecordedWorkoutPainEvent,
  type WorkoutPainInput,
  type WorkoutStart,
} from '../domain/workout';
import { addDays, getCampaignDay, isGateTrialAttemptDay } from '../program/campaign';
import { checkInSaveError, testsHeldFor } from '../program/check-in-schedule';

export const DATABASE_NAME = 'rangers-road';
export const DATABASE_VERSION = 4;

export const STORE_NAMES = [
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
  'trialDrafts',
  'trialAttempts',
  'postMissionFunctions',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

/** Every store is keyed by a string `id`; a saved copy carries rows exactly as stored. */
export type StoredRecord = { id: string } & Record<string, unknown>;
export type StoreRecords = Record<StoreName, StoredRecord[]>;

export type HistoricalStoreName =
  | 'missionInstances'
  | 'workoutSessions'
  | 'painEvents'
  | 'measurementEntries'
  | 'roadSessions'
  | 'journalEntries'
  | 'trialResults';

/** Older v1 Road sessions have no save timestamp; keep them readable. */
export type SavedRoadSession = RoadSession & { id: string; createdAt?: IsoTimestamp };

/** Session date first, then the time it was saved; legacy rows have a stable ID fallback. */
export function compareRoadSessionsNewest(a: SavedRoadSession, b: SavedRoadSession): number {
  return (
    b.date.localeCompare(a.date) ||
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '') ||
    b.id.localeCompare(a.id)
  );
}

/** Trial date first; a v1 result without a save timestamp remains readable. */
export function compareTrialResultsNewest(a: TrialResult, b: TrialResult): number {
  return (
    b.date.localeCompare(a.date) ||
    (b.recordedAt ?? '').localeCompare(a.recordedAt ?? '') ||
    b.id.localeCompare(a.id)
  );
}

export interface HistoricalRecordByStore {
  missionInstances: MissionInstance;
  workoutSessions: WorkoutSession;
  painEvents: PainEvent & { id: string };
  measurementEntries: MeasurementEntry & { id: string };
  roadSessions: SavedRoadSession;
  journalEntries: JournalEntry & { id: string };
  trialResults: TrialResult;
}

/**
 * Repeatable schema migration. A version bump may add stores or indexes here; it
 * must never delete existing stores or rewrite historical entries.
 */
export function migrateRoadDatabase(database: IDBDatabase, transaction: IDBTransaction): void {
  for (const name of STORE_NAMES) {
    if (!database.objectStoreNames.contains(name)) {
      database.createObjectStore(name, { keyPath: 'id' });
    }
  }

  const readinessStore = transaction.objectStore('readinessChecks');
  if (!readinessStore.indexNames.contains('date')) {
    readinessStore.createIndex('date', 'date', { unique: false });
  }
}

export class RoadDatabase {
  private constructor(private readonly database: IDBDatabase) {
    this.database.onversionchange = () => this.database.close();
  }

  static open(name = DATABASE_NAME): Promise<RoadDatabase> {
    if (!globalThis.indexedDB) {
      return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const transaction = request.transaction;
        if (!transaction) {
          throw new Error('IndexedDB upgrade transaction is unavailable.');
        }
        migrateRoadDatabase(request.result, transaction);
      };
      request.onsuccess = () => resolve(new RoadDatabase(request.result));
      request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab.'));
    });
  }

  close(): void {
    this.database.close();
  }

  getCampaign(id: string): Promise<Campaign | undefined> {
    return this.read<Campaign>('campaigns', id);
  }

  /** Campaign state changes over time, so this store permits an explicit upsert. */
  putCampaign(campaign: Campaign): Promise<void> {
    return this.write('campaigns', 'put', campaign);
  }

  addReadinessCheck(check: ReadinessCheck): Promise<void> {
    return this.write('readinessChecks', 'add', check);
  }

  async getLatestReadinessForDate(date: LocalDate): Promise<ReadinessCheck | undefined> {
    const checks = await new Promise<ReadinessCheck[]>((resolve, reject) => {
      const transaction = this.database.transaction('readinessChecks', 'readonly');
      const request = transaction.objectStore('readinessChecks').index('date').getAll(date);
      request.onsuccess = () => resolve(request.result as ReadinessCheck[]);
      request.onerror = () =>
        reject(request.error ?? new Error('Unable to read readiness checks.'));
    });

    return checks
      .sort((a, b) =>
        a.checkedAt === b.checkedAt
          ? a.id.localeCompare(b.id)
          : a.checkedAt.localeCompare(b.checkedAt),
      )
      .at(-1);
  }

  getAllReadinessChecks(): Promise<ReadinessCheck[]> {
    return this.readAll<ReadinessCheck>('readinessChecks');
  }

  /** Chapter I date lookup uses the existing v1 store without an index migration. */
  async getMissionInstancesForDate(date: LocalDate): Promise<MissionInstance[]> {
    const records = await this.readAll<MissionInstance>('missionInstances');
    return records
      .filter((record) => record.date === date)
      .sort(
        (a, b) =>
          (a.completedAt ?? a.startedAt ?? '').localeCompare(b.completedAt ?? b.startedAt ?? '') ||
          a.id.localeCompare(b.id),
      );
  }

  /** Multiple attempts are allowed, but a saved attempt cannot be replaced. */
  addMissionInstance(record: MissionInstance): Promise<void> {
    return this.addHistorical('missionInstances', record);
  }

  /** Date lookup uses the v1 store; a saved session remains append-only. */
  async getRoadSessionsForDate(date: LocalDate): Promise<SavedRoadSession[]> {
    const sessions = await this.getAllHistorical('roadSessions');
    return sessions.filter((session) => session.date === date).sort(compareRoadSessionsNewest);
  }

  async addRoadSession(session: RoadSession & { id: string }): Promise<void> {
    await this.addHistorical('roadSessions', {
      ...createRoadSession(session),
      createdAt: new Date().toISOString(),
    });
  }

  /** Version 2 permits one resumable draft; all completed workout rows remain in the v1 store. */
  async getActiveWorkoutDraft(): Promise<WorkoutDraft | undefined> {
    const drafts = await this.readAll<WorkoutDraft>('workoutDrafts');
    if (drafts.length > 1) {
      throw new Error(
        'More than one active workout was found. Preserve the drafts before continuing.',
      );
    }
    return drafts[0];
  }

  /** One write transaction serializes the single-draft check and latest readiness check. */
  startWorkoutDraft(input: WorkoutStart): Promise<WorkoutDraft> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['campaigns', 'readinessChecks', 'workoutDrafts'],
        'readwrite',
      );
      let campaign: Campaign | undefined;
      let drafts: WorkoutDraft[] | undefined;
      let checks: ReadinessCheck[] | undefined;
      let started: WorkoutDraft | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The workout could not be started.');
        transaction.abort();
      };
      const startWhenLoaded = () => {
        if (!drafts || !checks || !campaign || started) return;
        try {
          if (drafts.length)
            throw new Error('Finish or stop the active workout before starting another.');
          if (getCampaignDay(campaign.startDate, input.date) < 1) {
            throw new Error('A workout cannot start before campaign Day 1.');
          }
          started = createWorkoutDraft(input, latestWorkoutReadiness(checks, input.date));
          transaction.objectStore('workoutDrafts').add(started);
        } catch (error) {
          fail(error);
        }
      };
      const campaignRequest = transaction.objectStore('campaigns').get('primary');
      campaignRequest.onsuccess = () => {
        campaign = campaignRequest.result as Campaign | undefined;
        if (!campaign) {
          fail(new Error('Start the campaign before beginning a workout.'));
        } else {
          startWhenLoaded();
        }
      };
      const draftsRequest = transaction.objectStore('workoutDrafts').getAll();
      draftsRequest.onsuccess = () => {
        drafts = draftsRequest.result as WorkoutDraft[];
        startWhenLoaded();
      };
      const checksRequest = transaction
        .objectStore('readinessChecks')
        .index('date')
        .getAll(input.date);
      checksRequest.onsuccess = () => {
        checks = checksRequest.result as ReadinessCheck[];
        startWhenLoaded();
      };
      transaction.oncomplete = () => resolve(structuredClone(started!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to start the workout.'));
    });
  }

  /** Set edits are resumable. A new Red readiness result stops further set writes. */
  saveWorkoutDraft(edited: WorkoutDraft): Promise<WorkoutDraft> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['readinessChecks', 'workoutDrafts'],
        'readwrite',
      );
      let saved: WorkoutDraft | undefined;
      let stored: WorkoutDraft | undefined;
      let checks: ReadinessCheck[] | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure =
          error instanceof Error ? error : new Error('The workout draft could not be saved.');
        transaction.abort();
      };
      const saveWhenLoaded = () => {
        if (!stored || !checks || saved) return;
        try {
          saved = updateWorkoutDraft(stored, edited, latestWorkoutReadiness(checks, stored.date));
          transaction.objectStore('workoutDrafts').put(saved);
        } catch (error) {
          fail(error);
        }
      };
      const draftRequest = transaction.objectStore('workoutDrafts').get(edited.id);
      draftRequest.onsuccess = () => {
        stored = draftRequest.result as WorkoutDraft | undefined;
        if (!stored) fail(new Error('The active workout was not found.'));
        else saveWhenLoaded();
      };
      const checksRequest = transaction
        .objectStore('readinessChecks')
        .index('date')
        .getAll(edited.date);
      checksRequest.onsuccess = () => {
        checks = checksRequest.result as ReadinessCheck[];
        saveWhenLoaded();
      };
      transaction.oncomplete = () => resolve(structuredClone(saved!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the workout draft.'));
    });
  }

  /** Pain is appended immediately and linked to the active draft in the same transaction. */
  recordWorkoutPain(draftId: string, input: WorkoutPainInput): Promise<RecordedWorkoutPainEvent> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(['painEvents', 'workoutDrafts'], 'readwrite');
      let recorded: RecordedWorkoutPainEvent | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The pain record could not be saved.');
        transaction.abort();
      };
      const draftRequest = transaction.objectStore('workoutDrafts').get(draftId);
      draftRequest.onsuccess = () => {
        try {
          const draft = draftRequest.result as WorkoutDraft | undefined;
          if (!draft) throw new Error('The active workout was not found.');
          recorded = createRecordedWorkoutPain(draft, input);
          const updated = structuredClone(draft);
          updated.exerciseResults
            .find((result) => result.exerciseId === recorded!.exerciseId)!
            .painEvents.push(recorded);
          updated.updatedAt = recorded.timestamp;
          updated.reduced = true;
          transaction.objectStore('painEvents').add(recorded);
          transaction.objectStore('workoutDrafts').put(updated);
        } catch (error) {
          fail(error);
        }
      };
      transaction.oncomplete = () => resolve(structuredClone(recorded!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the pain record.'));
    });
  }

  /** A completed snapshot is added once, and its draft is removed atomically. */
  finishWorkoutDraft(
    draftId: string,
    outcome: 'completed' | 'stopped' = 'completed',
  ): Promise<WorkoutSession> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['readinessChecks', 'workoutDrafts', 'workoutSessions'],
        'readwrite',
      );
      let draft: WorkoutDraft | undefined;
      let checks: ReadinessCheck[] | undefined;
      let session: WorkoutSession | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The workout could not be finished.');
        transaction.abort();
      };
      const finishWhenLoaded = () => {
        if (!draft || !checks || session) return;
        try {
          session = completeWorkoutDraft(
            draft,
            latestWorkoutReadiness(checks, draft.date),
            outcome,
          );
          transaction.objectStore('workoutSessions').add(session);
          transaction.objectStore('workoutDrafts').delete(draft.id);
        } catch (error) {
          fail(error);
        }
      };
      const draftRequest = transaction.objectStore('workoutDrafts').get(draftId);
      draftRequest.onsuccess = () => {
        draft = draftRequest.result as WorkoutDraft | undefined;
        if (!draft) fail(new Error('The active workout was not found.'));
        else {
          const checksRequest = transaction
            .objectStore('readinessChecks')
            .index('date')
            .getAll(draft.date);
          checksRequest.onsuccess = () => {
            checks = checksRequest.result as ReadinessCheck[];
            finishWhenLoaded();
          };
        }
      };
      transaction.oncomplete = () => resolve(structuredClone(session!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to finish the workout.'));
    });
  }

  async getWorkoutSessionsForDate(date: LocalDate): Promise<WorkoutSession[]> {
    const sessions = await this.getAllHistorical('workoutSessions');
    return sessions
      .filter((session) => session.date === date)
      .sort(
        (a, b) =>
          (b.completedAt ?? '').localeCompare(a.completedAt ?? '') || b.id.localeCompare(a.id),
      );
  }

  async getPreviousWorkoutLoad(exerciseId: string): Promise<PreviousWorkoutLoad | undefined> {
    const sessions = await this.getAllHistorical('workoutSessions');
    return previousWorkoutLoad(sessions, exerciseId);
  }

  async getTrialResultsForTrial(trialId: string): Promise<TrialResult[]> {
    const results = await this.getAllHistorical('trialResults');
    return results.filter((result) => result.trialId === trialId).sort(compareTrialResultsNewest);
  }

  async getActiveTrialDraft(): Promise<TrialDraft | undefined> {
    const drafts = await this.readAll<TrialDraft>('trialDrafts');
    if (drafts.length > 1) {
      throw new Error('More than one active trial was found. Preserve the drafts before continuing.');
    }
    return drafts[0];
  }

  async getStoppedTrialAttemptsForTrial(trialId: string): Promise<TrialAttempt[]> {
    const attempts = await this.readAll<TrialAttempt>('trialAttempts');
    return attempts
      .filter((attempt) => attempt.trialId === trialId)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.stoppedAt.localeCompare(a.stoppedAt) ||
          b.id.localeCompare(a.id),
      );
  }

  async getTrialPainForAttempt(attemptId: string): Promise<RecordedTrialPainEvent[]> {
    const events = await this.getAllHistorical('painEvents');
    return events
      .filter((event): event is RecordedTrialPainEvent => event.trialAttemptId === attemptId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  }

  /**
   * One write transaction checks the campaign, the attempt day, that the trial is not
   * already passed, the single-draft rule, and the latest Green check.
   */
  startTrialDraft(date: LocalDate): Promise<TrialDraft> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['campaigns', 'readinessChecks', 'trialDrafts', 'trialResults'],
        'readwrite',
      );
      let campaign: Campaign | undefined;
      let campaignLoaded = false;
      let drafts: TrialDraft[] | undefined;
      let checks: ReadinessCheck[] | undefined;
      let results: TrialResult[] | undefined;
      let started: TrialDraft | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The Gate Trial could not be started.');
        transaction.abort();
      };
      const startWhenLoaded = () => {
        if (!campaignLoaded || !drafts || !checks || !results || started) return;
        try {
          if (!campaign || getCampaignDay(campaign.startDate, date) < 1) {
            throw new Error('The Gate Trial cannot start before campaign Day 1.');
          }
          if (results.some((result) => result.trialId === 'gate-trial')) {
            throw new Error('The Gate Trial is already passed.');
          }
          if (!isGateTrialAttemptDay(campaign.startDate, date)) {
            throw new Error(
              'The Gate Trial opens on the Monday after Week 4, then on Mondays and Thursdays until it is passed.',
            );
          }
          if (drafts.length) {
            throw new Error('Finish or stop the active Gate Trial before starting another.');
          }
          started = createGateTrialDraft(date, latestSameDayReadiness(checks, date));
          transaction.objectStore('trialDrafts').add(started);
        } catch (error) {
          fail(error);
        }
      };
      const campaignRequest = transaction.objectStore('campaigns').get('primary');
      campaignRequest.onsuccess = () => {
        campaign = campaignRequest.result as Campaign | undefined;
        campaignLoaded = true;
        startWhenLoaded();
      };
      const draftsRequest = transaction.objectStore('trialDrafts').getAll();
      draftsRequest.onsuccess = () => {
        drafts = draftsRequest.result as TrialDraft[];
        startWhenLoaded();
      };
      const checksRequest = transaction.objectStore('readinessChecks').index('date').getAll(date);
      checksRequest.onsuccess = () => {
        checks = checksRequest.result as ReadinessCheck[];
        startWhenLoaded();
      };
      const resultsRequest = transaction.objectStore('trialResults').getAll();
      resultsRequest.onsuccess = () => {
        results = resultsRequest.result as TrialResult[];
        startWhenLoaded();
      };
      transaction.oncomplete = () => resolve(structuredClone(started!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to start the Gate Trial.'));
    });
  }

  /** Autosave partial text and rounds, even after readiness changes; phase advancement is gated. */
  saveTrialDraft(edited: TrialDraft): Promise<TrialDraft> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['readinessChecks', 'trialDrafts'],
        'readwrite',
      );
      let stored: TrialDraft | undefined;
      let checks: ReadinessCheck[] | undefined;
      let saved: TrialDraft | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The trial draft could not be saved.');
        transaction.abort();
      };
      const saveWhenLoaded = () => {
        if (!stored || !checks || saved) return;
        try {
          saved = updateGateTrialDraft(
            stored,
            edited,
            latestSameDayReadiness(checks, stored.date),
          );
          transaction.objectStore('trialDrafts').put(saved);
        } catch (error) {
          fail(error);
        }
      };
      const draftRequest = transaction.objectStore('trialDrafts').get(edited.id);
      draftRequest.onsuccess = () => {
        stored = draftRequest.result as TrialDraft | undefined;
        if (!stored) fail(new Error('The active Gate Trial was not found.'));
        else saveWhenLoaded();
      };
      const checksRequest = transaction
        .objectStore('readinessChecks')
        .index('date')
        .getAll(edited.date);
      checksRequest.onsuccess = () => {
        checks = checksRequest.result as ReadinessCheck[];
        saveWhenLoaded();
      };
      transaction.oncomplete = () => resolve(structuredClone(saved!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the trial draft.'));
    });
  }

  /** Trial pain is appended immediately and copied to the draft atomically. */
  recordTrialPain(draftId: string, input: TrialPainInput): Promise<RecordedTrialPainEvent> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(['painEvents', 'trialDrafts'], 'readwrite');
      let recorded: RecordedTrialPainEvent | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The trial pain record could not be saved.');
        transaction.abort();
      };
      const draftRequest = transaction.objectStore('trialDrafts').get(draftId);
      draftRequest.onsuccess = () => {
        try {
          const draft = draftRequest.result as TrialDraft | undefined;
          if (!draft) throw new Error('The active Gate Trial was not found.');
          recorded = createRecordedTrialPain(draft, input);
          const updated = structuredClone(draft);
          updated.painEvents.push(recorded);
          updated.updatedAt = recorded.timestamp;
          updated.revision += 1;
          transaction.objectStore('painEvents').add(recorded);
          transaction.objectStore('trialDrafts').put(updated);
        } catch (error) {
          fail(error);
        }
      };
      transaction.oncomplete = () => resolve(structuredClone(recorded!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the trial pain record.'));
    });
  }

  finishTrialDraft(draftId: string, outcome: 'completed'): Promise<SavedGateTrialResult>;
  finishTrialDraft(draftId: string, outcome: 'stopped'): Promise<TrialAttempt>;
  finishTrialDraft(
    draftId: string,
    outcome: 'completed' | 'stopped',
  ): Promise<SavedGateTrialResult | TrialAttempt> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['campaigns', 'readinessChecks', 'trialDrafts', 'trialResults', 'trialAttempts'],
        'readwrite',
      );
      let saved: SavedGateTrialResult | TrialAttempt | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The Gate Trial could not be finished.');
        transaction.abort();
      };
      const draftRequest = transaction.objectStore('trialDrafts').get(draftId);
      draftRequest.onsuccess = () => {
        try {
          const draft = draftRequest.result as TrialDraft | undefined;
          if (!draft) throw new Error('The active Gate Trial was not found.');
          if (outcome === 'stopped') {
            saved = stopGateTrialDraft(draft);
            transaction.objectStore('trialAttempts').add(saved);
            transaction.objectStore('trialDrafts').delete(draftId);
            return;
          }
          const campaignRequest = transaction.objectStore('campaigns').get('primary');
          campaignRequest.onsuccess = () => {
            try {
              const campaign = campaignRequest.result as Campaign | undefined;
              if (!campaign || getCampaignDay(campaign.startDate, draft.date) < 1) {
                throw new Error('The Gate Trial cannot be completed before campaign Day 1.');
              }
              const checksRequest = transaction
                .objectStore('readinessChecks')
                .index('date')
                .getAll(draft.date);
              checksRequest.onsuccess = () => {
                try {
                  saved = completeGateTrialDraft(
                    draft,
                    latestSameDayReadiness(checksRequest.result as ReadinessCheck[], draft.date),
                  );
                  transaction.objectStore('trialResults').add(saved);
                  transaction.objectStore('trialDrafts').delete(draftId);
                } catch (error) {
                  fail(error);
                }
              };
            } catch (error) {
              fail(error);
            }
          };
        } catch (error) {
          fail(error);
        }
      };
      transaction.oncomplete = () => resolve(structuredClone(saved!));
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to finish the Gate Trial.'));
    });
  }

  /** Check campaign Day 1 and latest same-day readiness in the write transaction. */
  async addTrialResult(result: SavedGateTrialResult): Promise<void> {
    const normalized = validateCompletedGateTrialResult(result);
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['campaigns', 'readinessChecks', 'trialResults'],
        'readwrite',
      );
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The Gate Trial could not be saved.');
        transaction.abort();
      };
      const campaignRequest = transaction.objectStore('campaigns').get('primary');
      campaignRequest.onsuccess = () => {
        try {
          const campaign = campaignRequest.result as Campaign | undefined;
          if (!campaign || getCampaignDay(campaign.startDate, normalized.date) < 1) {
            throw new Error('The Gate Trial cannot be completed before campaign Day 1.');
          }
          const checks = transaction
            .objectStore('readinessChecks')
            .index('date')
            .getAll(normalized.date);
          checks.onsuccess = () => {
            try {
              const latest = (checks.result as ReadinessCheck[])
                .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt) || a.id.localeCompare(b.id))
                .at(-1);
              if (
                !latest ||
                latest.id !== normalized.readinessId ||
                latest.status !== 'green' ||
                classifyReadiness(latest) !== 'green' ||
                !Number.isFinite(Date.parse(latest.checkedAt)) ||
                Date.parse(latest.checkedAt) > Date.parse(normalized.recordedAt)
              ) {
                throw new Error('Readiness changed. Check again before completing the Gate Trial.');
              }
              transaction.objectStore('trialResults').add(normalized);
            } catch (error) {
              fail(error);
            }
          };
        } catch (error) {
          fail(error);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the Gate Trial.'));
    });
  }

  /**
   * Check-ins and held tests read the campaign, prior entries, and readiness in the
   * same write transaction as the append. This prevents a second tab from saving
   * two check-ins in one window or recording tests after readiness turns Red.
   */
  async addMeasurementEntry(entry: SavedMeasurement): Promise<SavedMeasurement> {
    const normalized = createMeasurementEntry(entry);
    if (normalized.kind === 'body') {
      await this.addHistorical('measurementEntries', normalized);
      return normalized;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['campaigns', 'measurementEntries', 'readinessChecks'],
        'readwrite',
      );
      const campaigns = transaction.objectStore('campaigns');
      const measurements = transaction.objectStore('measurementEntries');
      const readiness = transaction.objectStore('readinessChecks');
      let saved: SavedMeasurement | undefined;
      let failure: Error | undefined;
      let campaign: Campaign | undefined;
      let campaignLoaded = false;
      let appended = false;
      let entries: SavedMeasurement[] | undefined;
      let checks: ReadinessCheck[] | undefined;

      const appendWhenLoaded = () => {
        if (!campaignLoaded || !entries || !checks || appended) {
          return;
        }
        appended = true;
        try {
          const latestToday = checks
            .filter((check) => check.date === normalized.date)
            .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt) || a.id.localeCompare(b.id))
            .at(-1);
          const readinessStatus = latestToday
            ? latestToday.status === 'red' || classifyReadiness(latestToday) === 'red'
              ? 'red'
              : latestToday.status
            : undefined;
          const hasTests =
            normalized.pushups !== undefined ||
            normalized.pullupAssistance !== undefined ||
            normalized.squatDepth !== undefined ||
            normalized.toeReach !== undefined;
          const reason = checkInSaveError(
            campaign?.startDate,
            normalized.date,
            normalized.kind as 'check-in' | 'tests',
            entries,
            readinessStatus,
            hasTests,
          );
          if (reason) {
            throw new Error(reason);
          }
          if (normalized.kind === 'check-in') {
            if (Boolean(normalized.testsHeld) !== testsHeldFor(readinessStatus)) {
              throw new Error('Readiness changed. Reopen the check-in before saving.');
            }
            saved = createMeasurementEntry({
              ...normalized,
              readinessSummary: summarizeReadiness(
                checks,
                addDays(normalized.date, -27),
                normalized.date,
              ),
            });
          } else {
            saved = normalized;
          }
          measurements.add(saved);
        } catch (error) {
          failure = error instanceof Error ? error : new Error('The check-in could not be saved.');
          transaction.abort();
        }
      };

      const campaignRequest = campaigns.get('primary');
      campaignRequest.onsuccess = () => {
        campaign = campaignRequest.result as Campaign | undefined;
        campaignLoaded = true;
        appendWhenLoaded();
      };
      const entriesRequest = measurements.getAll();
      entriesRequest.onsuccess = () => {
        entries = entriesRequest.result as SavedMeasurement[];
        appendWhenLoaded();
      };
      const checksRequest = readiness.getAll();
      checksRequest.onsuccess = () => {
        checks = checksRequest.result as ReadinessCheck[];
        appendWhenLoaded();
      };
      transaction.oncomplete = () => resolve(saved!);
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the check-in.'));
    });
  }

  /**
   * A recovery check links to one completed result, in the same transaction that
   * confirms the result exists and has no check yet.
   */
  addPostMissionFunction(
    input: RecoveryInput,
    now: IsoTimestamp = new Date().toISOString(),
  ): Promise<PostMissionFunction> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(
        ['trialResults', 'postMissionFunctions'],
        'readwrite',
      );
      let saved: PostMissionFunction | undefined;
      let failure: Error | undefined;
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('The recovery check could not be saved.');
        transaction.abort();
      };
      const resultRequest = transaction.objectStore('trialResults').get(input.trialResultId);
      resultRequest.onsuccess = () => {
        const result = resultRequest.result as TrialResult | undefined;
        if (!result) {
          fail(new Error('This Gate Trial record was not found on this device.'));
          return;
        }
        const existing = transaction.objectStore('postMissionFunctions').getAll();
        existing.onsuccess = () => {
          try {
            const entries = existing.result as PostMissionFunction[];
            if (entries.some((entry) => entry.trialResultId === result.id)) {
              throw new Error('This trial already has a recovery check.');
            }
            saved = createPostMissionFunction(result, input, now);
            transaction.objectStore('postMissionFunctions').add(saved);
          } catch (error) {
            fail(error);
          }
        };
      };
      transaction.oncomplete = () => resolve(saved!);
      transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error('Unable to save the recovery check.'));
    });
  }

  getPostMissionFunctions(): Promise<PostMissionFunction[]> {
    return this.readAll<PostMissionFunction>('postMissionFunctions');
  }

  /** Every store in one read transaction, so a saved copy is a consistent snapshot. */
  exportRecords(): Promise<StoreRecords> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction([...STORE_NAMES], 'readonly');
      const records = {} as StoreRecords;
      for (const name of STORE_NAMES) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => {
          records[name] = request.result as StoredRecord[];
        };
      }
      transaction.oncomplete = () => resolve(records);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Your records could not be read.'));
    });
  }

  /**
   * Restoring a saved copy is the one operation that replaces history. The person
   * confirms it first, and every store is cleared and refilled in one transaction,
   * so a failure leaves this device exactly as it was.
   */
  replaceRecords(stores: StoreRecords): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction([...STORE_NAMES], 'readwrite');
      try {
        for (const name of STORE_NAMES) {
          const store = transaction.objectStore(name);
          store.clear();
          for (const record of stores[name]) store.add(record);
        }
      } catch (error) {
        // A record IndexedDB cannot store throws here; abort so nothing is cleared.
        transaction.abort();
        reject(error instanceof Error ? error : new Error('The copy could not be restored.'));
        return;
      }
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('The copy could not be restored.'));
    });
  }

  /** Historical writes use add, so an existing record cannot be silently replaced. */
  addHistorical<K extends HistoricalStoreName>(
    store: K,
    record: HistoricalRecordByStore[K],
  ): Promise<void> {
    if (store === 'missionInstances') {
      const mission = record as MissionInstance;
      if (!mission.definitionSnapshot || mission.definitionSnapshot.id !== mission.definitionId) {
        return Promise.reject(
          new Error('A mission record needs its matching definition snapshot.'),
        );
      }
      if (mission.definitionSnapshot.plannedTrialId) {
        return Promise.reject(new Error('Use addTrialResult to save a planned trial.'));
      }
    }
    if (store === 'trialResults') {
      return Promise.reject(
        new Error('Use addTrialResult to check readiness before saving a trial.'),
      );
    }
    return this.write(store, 'add', record);
  }

  getAllHistorical<K extends HistoricalStoreName>(store: K): Promise<HistoricalRecordByStore[K][]> {
    return this.readAll<HistoricalRecordByStore[K]>(store);
  }

  private read<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(store, 'readonly');
      const request = transaction.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error ?? new Error(`Unable to read ${store}.`));
    });
  }

  private readAll<T>(store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(store, 'readonly');
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error ?? new Error(`Unable to read ${store}.`));
    });
  }

  private write(store: string, operation: 'add' | 'put', record: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(store, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error(`Unable to write ${store}.`));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error(`Unable to write ${store}.`));
      transaction.objectStore(store)[operation](record);
    });
  }
}

function latestSameDayReadiness(
  checks: ReadinessCheck[],
  date: LocalDate,
): ReadinessCheck | undefined {
  return checks
    .filter((check) => check.date === date)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt) || a.id.localeCompare(b.id))
    .at(-1);
}
