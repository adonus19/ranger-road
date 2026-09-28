import { Injectable } from '@angular/core';
import type { LocalDate, MissionInstance } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';

/** Keeps short lived database connections out of the mission screen. */
@Injectable({ providedIn: 'root' })
export class MissionHistory {
  async forDate(date: LocalDate): Promise<MissionInstance[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getMissionInstancesForDate(date);
    } finally {
      database.close();
    }
  }

  async add(record: MissionInstance): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.addMissionInstance(record);
    } finally {
      database.close();
    }
  }
}
