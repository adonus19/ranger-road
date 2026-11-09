import { Injectable, signal } from '@angular/core';
import type { LocalDate } from '../domain/models';
import type { ChapterDay } from '../program/campaign-position';
import {
  resolveCampaignPosition,
  withTrialDay,
  type TrialRecord,
} from '../program/campaign-position';
import { withMakeup, type MakeupHistory } from '../program/makeup-schedule';
import { getOptionalForge, type OptionalForgeOffer } from '../program/optional-forge';
import { RoadDatabase } from '../persistence/road-database';

/**
 * The saved work the make-up schedule reads. Screens refresh it as they open; until it is
 * read (or if it cannot be), days show their own dated orders.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleHistory {
  /** Null until read: without saved history nothing is treated as missed. */
  readonly history = signal<MakeupHistory | null>(null);
  /** Days a trial was started on (drafts and kept attempts): the trial is that day's order. */
  readonly trialDays = signal<readonly TrialRecord[]>([]);

  async refresh(): Promise<void> {
    try {
      const database = await RoadDatabase.open();
      try {
        const [records, sessions, checks, trialDays] = await Promise.all([
          database.getAllHistorical('missionInstances'),
          database.getAllHistorical('workoutSessions'),
          database.getAllReadinessChecks(),
          database.getTrialDays(),
        ]);
        this.trialDays.set(trialDays);
        this.history.set({
          records: records.map(({ date, definitionId }) => ({ date, definitionId })),
          sessions: sessions.map(({ date, workoutDefinitionId, outcome }) => ({
            date,
            workoutDefinitionId,
            ...(outcome ? { outcome } : {}),
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

  /**
   * Today's optional Forge card, or null. Without saved history (not read yet, or unreadable)
   * the card stays away, since this week's session might already be done.
   */
  optionalForge(
    startDate: LocalDate,
    today: LocalDate,
    trials: readonly TrialRecord[],
  ): OptionalForgeOffer | null {
    const history = this.history();
    if (!history) return null;
    const resolve = chapterResolver(startDate, trials);
    // Never on a day a trial was taken.
    const own = resolve(today);
    if (own && withTrialDay(own, today, this.trialDays()).attemptDay) return null;
    return getOptionalForge(today, today, resolve, history);
  }

  /** A date's chapter day with any make-up applied, or the trial if it was taken that day. */
  dayFor(
    startDate: LocalDate,
    date: LocalDate,
    today: LocalDate,
    trials: readonly TrialRecord[],
  ): ChapterDay | null {
    const resolve = chapterResolver(startDate, trials);
    const position = resolveCampaignPosition(startDate, date, trials);
    if (!position) return null;
    // Once a chapter is complete and the next is not in the app, nothing is moved.
    const history = this.history();
    if (position.awaitingNextChapter) return position.chapter;
    const day = history
      ? withMakeup(position.chapter, date, today, resolve, history)
      : position.chapter;
    return withTrialDay(day, date, this.trialDays());
  }
}

/** A date's plain chapter day; null once the chapter is complete and the next is not in the app. */
function chapterResolver(startDate: LocalDate, trials: readonly TrialRecord[]) {
  return (on: LocalDate) => {
    const position = resolveCampaignPosition(startDate, on, trials);
    return position && !position.awaitingNextChapter ? position.chapter : null;
  };
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
