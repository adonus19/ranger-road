import { Injectable, signal } from '@angular/core';
import type { LocalDate } from '../domain/models';
import type { ChapterDay } from '../program/campaign-position';
import { resolveCampaignPosition, type TrialRecord } from '../program/campaign-position';
import { withMakeup, type MakeupHistory } from '../program/makeup-schedule';
import { RoadDatabase } from '../persistence/road-database';

/**
 * The saved work the make-up schedule reads. Screens refresh it as they open; until it is
 * read (or if it cannot be), days show their own dated orders.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleHistory {
  /** Null until read: without saved history nothing is treated as missed. */
  readonly history = signal<MakeupHistory | null>(null);

  async refresh(): Promise<void> {
    try {
      const database = await RoadDatabase.open();
      try {
        const [records, sessions, checks] = await Promise.all([
          database.getAllHistorical('missionInstances'),
          database.getAllHistorical('workoutSessions'),
          database.getAllReadinessChecks(),
        ]);
        this.history.set({
          records: records.map(({ date, definitionId }) => ({ date, definitionId })),
          sessions: sessions.map(({ date, workoutDefinitionId }) => ({
            date,
            workoutDefinitionId,
          })),
          redDates: new Set(
            latestByDate(checks)
              .filter((c) => c.status === 'red')
              .map((c) => c.date),
          ),
        });
      } finally {
        database.close();
      }
    } catch {
      // Without history the dated orders still stand.
    }
  }

  /** A date's chapter day with any make-up applied. */
  dayFor(
    startDate: LocalDate,
    date: LocalDate,
    today: LocalDate,
    trials: readonly TrialRecord[],
  ): ChapterDay | null {
    const resolve = (on: LocalDate) => {
      const position = resolveCampaignPosition(startDate, on, trials);
      return position && !position.awaitingNextChapter ? position.chapter : null;
    };
    const position = resolveCampaignPosition(startDate, date, trials);
    if (!position) return null;
    // Once a chapter is complete and the next is not in the app, nothing is moved.
    const history = this.history();
    if (position.awaitingNextChapter || !history) return position.chapter;
    return withMakeup(position.chapter, date, today, resolve, history);
  }
}

/** The last check of each day decides whether that day was Red. */
function latestByDate<T extends { date: LocalDate; checkedAt: string }>(checks: readonly T[]): T[] {
  const latest = new Map<LocalDate, T>();
  for (const check of checks) {
    const current = latest.get(check.date);
    if (!current || check.checkedAt > current.checkedAt) latest.set(check.date, check);
  }
  return [...latest.values()];
}
