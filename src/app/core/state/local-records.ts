import { Injectable, inject } from '@angular/core';
import type { IsoTimestamp } from '../domain/models';
import { createRecordsBackup, type RecordsBackup } from '../persistence/records-backup';
import { RoadDatabase, type StoreRecords } from '../persistence/road-database';
import { CampaignState, localDateToday } from './campaign-state';

/** "rangers-road-records-2026-10-12.json", dated on this device's calendar. */
export function recordsBackupFileName(savedAt: IsoTimestamp): string {
  return `rangers-road-records-${localDateToday(new Date(savedAt))}.json`;
}

/** Every record on this device at once: read for a saved copy, or replaced by a restore. */
@Injectable({ providedIn: 'root' })
export class LocalRecords {
  private readonly state = inject(CampaignState);

  async read(): Promise<StoreRecords> {
    const database = await RoadDatabase.open();
    try {
      return await database.exportRecords();
    } finally {
      database.close();
    }
  }

  async backup(savedAt?: IsoTimestamp): Promise<RecordsBackup> {
    return createRecordsBackup(await this.read(), savedAt);
  }

  /** Replaces every local record with the copy, then reloads the campaign from it. */
  async restore(backup: RecordsBackup): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.replaceRecords(backup.stores);
    } finally {
      database.close();
    }
    // The records are already replaced; if rereading fails, CampaignState shows its own storage error.
    await this.state.reload().catch(() => undefined);
  }
}
