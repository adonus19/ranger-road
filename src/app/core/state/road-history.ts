import { Injectable } from '@angular/core';
import type { LocalDate } from '../domain/models';
import {
  compareRoadSessionsNewest,
  RoadDatabase,
  type SavedRoadSession,
} from '../persistence/road-database';

export type { SavedRoadSession } from '../persistence/road-database';

/** Short-lived IndexedDB connections keep this history available offline. */
@Injectable({ providedIn: 'root' })
export class RoadHistory {
  async forDate(date: LocalDate): Promise<SavedRoadSession[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getRoadSessionsForDate(date);
    } finally {
      database.close();
    }
  }

  /** Recent means session-date order, then save time for sessions on the same date. */
  async recent(limit = 5): Promise<SavedRoadSession[]> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new RangeError('History limit must be a nonnegative whole number.');
    }
    if (limit === 0) {
      return [];
    }

    const database = await RoadDatabase.open();
    try {
      const sessions = await database.getAllHistorical('roadSessions');
      return sessions.sort(compareRoadSessionsNewest).slice(0, limit);
    } finally {
      database.close();
    }
  }

  async add(session: SavedRoadSession): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.addRoadSession(session);
    } finally {
      database.close();
    }
  }

  async update(session: SavedRoadSession): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.updateRoadSession(session);
    } finally {
      database.close();
    }
  }

  async remove(id: string): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.deleteRoadSession(id);
    } finally {
      database.close();
    }
  }

  async get(id: string): Promise<SavedRoadSession | undefined> {
    const database = await RoadDatabase.open();
    try {
      return (await database.getAllHistorical('roadSessions')).find((session) => session.id === id);
    } finally {
      database.close();
    }
  }
}
