import type { IsoTimestamp, LocalDate } from '../domain/models';
import { isLocalDate } from '../program/campaign';
import {
  DATABASE_VERSION,
  STORE_NAMES,
  type StoreName,
  type StoreRecords,
  type StoredRecord,
} from './road-database';

/** Names the file's contents, so restoring can refuse an unrelated JSON file. */
export const RECORDS_BACKUP_FORMAT = 'rangers-road-records';
export const RECORDS_BACKUP_VERSION = 1;
/** Nine months of records stay far below this; it keeps an unrelated large file from being read. */
export const RECORDS_BACKUP_MAX_BYTES = 50 * 1024 * 1024;

/** A copy of every local store, saved by the person and restorable on any device. */
export interface RecordsBackup {
  format: typeof RECORDS_BACKUP_FORMAT;
  version: number;
  /** The schema the rows were read from. An older copy simply lacks later stores. */
  databaseVersion: number;
  savedAt: IsoTimestamp;
  stores: StoreRecords;
}

export interface RecordsSummary {
  /** Campaign Day 1, when one has been chosen. */
  startDate?: LocalDate;
  /** The newest dated entry, such as a readiness check, workout or watch. */
  latestDate?: LocalDate;
  /** Every saved row except the campaign itself. */
  count: number;
}

export const NOT_A_RECORDS_COPY =
  'This file isn’t a copy of your records. Choose a file made with Save a copy.';
export const DAMAGED_RECORDS_COPY = 'This copy can’t be read, so nothing changed. Try another copy.';
export const NEWER_RECORDS_COPY =
  'This copy came from a newer version of the app. Close and reopen the app to update it, then try again.';

export function createRecordsBackup(
  stores: StoreRecords,
  savedAt: IsoTimestamp = new Date().toISOString(),
): RecordsBackup {
  return {
    format: RECORDS_BACKUP_FORMAT,
    version: RECORDS_BACKUP_VERSION,
    databaseVersion: DATABASE_VERSION,
    savedAt,
    stores,
  };
}

/**
 * Checks a chosen file before anything is replaced. Rows are kept exactly as saved;
 * the checks cover what the stores and the app's lookups depend on.
 */
export function parseRecordsBackup(text: string): RecordsBackup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(NOT_A_RECORDS_COPY);
  }
  if (!isObject(value) || value['format'] !== RECORDS_BACKUP_FORMAT) {
    throw new Error(NOT_A_RECORDS_COPY);
  }

  const { version, databaseVersion, savedAt, stores } = value;
  if (
    !isWholeNumber(version) ||
    !isWholeNumber(databaseVersion) ||
    typeof savedAt !== 'string' ||
    !Number.isFinite(Date.parse(savedAt)) ||
    !isObject(stores)
  ) {
    throw new Error(DAMAGED_RECORDS_COPY);
  }
  if (version > RECORDS_BACKUP_VERSION || databaseVersion > DATABASE_VERSION) {
    throw new Error(NEWER_RECORDS_COPY);
  }
  if (Object.keys(stores).some((name) => !(STORE_NAMES as readonly string[]).includes(name))) {
    throw new Error(DAMAGED_RECORDS_COPY);
  }

  const checked = {} as StoreRecords;
  for (const name of STORE_NAMES) {
    checked[name] = checkRows(stores[name] ?? [], name);
  }
  if (checked.campaigns.length > 1 || checked.workoutDrafts.length > 1 || checked.trialDrafts.length > 1) {
    throw new Error(DAMAGED_RECORDS_COPY);
  }

  return {
    format: RECORDS_BACKUP_FORMAT,
    version,
    databaseVersion,
    savedAt,
    stores: checked,
  };
}

export function summarizeRecords(stores: StoreRecords): RecordsSummary {
  const startDate = stores.campaigns[0]?.['startDate'];
  let latestDate: LocalDate | undefined;
  let count = 0;
  for (const name of STORE_NAMES) {
    if (name === 'campaigns') continue;
    for (const record of stores[name]) {
      count += 1;
      const date = record['date'];
      if (typeof date === 'string' && isLocalDate(date) && (!latestDate || date > latestDate)) {
        latestDate = date;
      }
    }
  }
  return {
    ...(typeof startDate === 'string' ? { startDate } : {}),
    ...(latestDate ? { latestDate } : {}),
    count,
  };
}

/** Rows on this device that the copy does not hold. Restoring would remove them. */
export function recordsMissingFrom(current: StoreRecords, copy: StoreRecords): number {
  let missing = 0;
  for (const name of STORE_NAMES) {
    if (name === 'campaigns') continue;
    const kept = new Set(copy[name].map((record) => record.id));
    missing += current[name].filter((record) => !kept.has(record.id)).length;
  }
  return missing;
}

function checkRows(rows: unknown, store: StoreName): StoredRecord[] {
  if (!Array.isArray(rows)) throw new Error(DAMAGED_RECORDS_COPY);
  const ids = new Set<string>();
  for (const row of rows) {
    if (!isObject(row) || typeof row['id'] !== 'string' || !row['id'] || ids.has(row['id'])) {
      throw new Error(DAMAGED_RECORDS_COPY);
    }
    ids.add(row['id']);
    // Day 1 drives every dated screen, and readiness is looked up by its date index.
    const needsDate =
      store === 'campaigns' ? row['startDate'] : store === 'readinessChecks' ? row['date'] : '';
    if (needsDate !== '' && (typeof needsDate !== 'string' || !isLocalDate(needsDate))) {
      throw new Error(DAMAGED_RECORDS_COPY);
    }
  }
  return rows as StoredRecord[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
