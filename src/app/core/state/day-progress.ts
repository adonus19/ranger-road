import { Injectable, inject, signal } from '@angular/core';
import { JournalStore } from '../../features/journal/journal-store';
import type { DailyCheck, DailyCheckItem, LocalDate, MissionInstance } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';
import { MissionHistory } from './mission-history';

/** What today has recorded so far. Marks are for today only; earlier days are not revisited. */
@Injectable({ providedIn: 'root' })
export class DayProgress {
  private readonly missions = inject(MissionHistory);
  private readonly journal = inject(JournalStore);
  private loadSequence = 0;

  readonly date = signal<LocalDate | null>(null);
  readonly records = signal<MissionInstance[]>([]);
  readonly morningWatch = signal(false);
  readonly eveningWatch = signal(false);
  readonly checks = signal<ReadonlySet<DailyCheckItem>>(new Set());

  /** Reads today's records; a source that cannot be read simply shows nothing marked. */
  async refresh(date: LocalDate): Promise<void> {
    const sequence = ++this.loadSequence;
    const [records, watches, checks] = await Promise.all([
      this.missions.forDate(date).catch(() => [] as MissionInstance[]),
      this.journal.listWatches().catch(() => []),
      this.loadChecks(date),
    ]);
    if (sequence !== this.loadSequence) return;
    this.date.set(date);
    this.records.set(records);
    this.morningWatch.set(watches.some((e) => e.date === date && e.type === 'morning-watch'));
    this.eveningWatch.set(watches.some((e) => e.date === date && e.type === 'evening-watch'));
    this.checks.set(new Set(checks.map((check) => check.item)));
  }

  /** The latest record of any of today's planned choices, or null. */
  recordFor(choiceIds: readonly string[]): MissionInstance | null {
    return (
      this.records()
        .filter((record) => choiceIds.includes(record.definitionId))
        .at(-1) ?? null
    );
  }

  isDone(item: DailyCheckItem): boolean {
    return this.checks().has(item);
  }

  /** A Done tap for today; tapping again undoes it. */
  async setDone(date: LocalDate, item: DailyCheckItem, done: boolean): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      const id = `${date}:${item}`;
      if (done) {
        const check: DailyCheck = { id, date, item, doneAt: new Date().toISOString() };
        await database.setDailyCheck(check);
      } else {
        await database.deleteDailyCheck(id);
      }
    } finally {
      database.close();
    }
    if (this.date() === date) {
      this.checks.update((current) => {
        const next = new Set(current);
        if (done) next.add(item);
        else next.delete(item);
        return next;
      });
    }
  }

  private async loadChecks(date: LocalDate): Promise<DailyCheck[]> {
    try {
      const database = await RoadDatabase.open();
      try {
        return await database.getDailyChecksForDate(date);
      } finally {
        database.close();
      }
    } catch {
      return [];
    }
  }
}

/** "Done" for a full outcome; otherwise a neutral "Recorded", never a judgment. */
export function recordLabel(record: MissionInstance | null): string | null {
  if (!record) return null;
  return record.status === 'completed' && !record.reduced ? 'Done' : 'Recorded';
}
