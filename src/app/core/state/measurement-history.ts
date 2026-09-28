import { Injectable } from '@angular/core';
import type { SavedMeasurement } from '../domain/measurement';
import type { ReadinessCheck } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';

/** Short-lived IndexedDB connections keep measurements available offline. */
@Injectable({ providedIn: 'root' })
export class MeasurementHistory {
  /** Every measurement entry, oldest first by the time it was recorded. */
  async all(): Promise<SavedMeasurement[]> {
    const database = await RoadDatabase.open();
    try {
      const entries = await database.getAllHistorical('measurementEntries');
      return entries.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id));
    } finally {
      database.close();
    }
  }

  /** Readiness checks are read here so a check-in can average them. */
  async readinessChecks(): Promise<ReadinessCheck[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getAllReadinessChecks();
    } finally {
      database.close();
    }
  }

  async add(entry: SavedMeasurement): Promise<SavedMeasurement> {
    const database = await RoadDatabase.open();
    try {
      return await database.addMeasurementEntry(entry);
    } finally {
      database.close();
    }
  }
}
