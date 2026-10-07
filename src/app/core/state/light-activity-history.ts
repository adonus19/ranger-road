import { Injectable } from '@angular/core';
import type { LightActivity, LocalDate } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';

@Injectable({ providedIn: 'root' })
export class LightActivityHistory {
  async forDate(date: LocalDate): Promise<LightActivity[]> {
    return this.use((database) => database.getLightActivitiesForDate(date));
  }

  async add(entry: LightActivity): Promise<void> {
    return this.use((database) => database.addLightActivity(entry));
  }

  async remove(id: string): Promise<void> {
    return this.use((database) => database.deleteLightActivity(id));
  }

  private async use<T>(work: (database: RoadDatabase) => Promise<T>): Promise<T> {
    const database = await RoadDatabase.open();
    try {
      return await work(database);
    } finally {
      database.close();
    }
  }
}
