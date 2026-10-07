import type { LocalDate } from '../domain/models';
import { addDays, getWeekday, mondayOnOrBefore } from './calendar';
import type { ChapterDay, DayMakeup } from './campaign-position';
import { getActivityChoices, getDayContent } from './chapter-orders';

/** Saved work the schedule reads. Nothing about the schedule itself is stored. */
export interface MakeupHistory {
  records: readonly { date: LocalDate; definitionId: string }[];
  sessions: readonly { date: LocalDate; workoutDefinitionId: string }[];
  /** Dates with a Red readiness check: a Forge planned then moves rather than counting as done. */
  redDates: ReadonlySet<LocalDate>;
}

/** The plain chapter day for a date, without make-ups, or null outside the campaign. */
export type DayResolver = (date: LocalDate) => ChapterDay | null;

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OPTIONAL_WALK =
  'Your walk today is optional: do it alongside the Forge, or in place of one leg exercise’s sets.';
const FULL_OR_REDUCED = 'Full or reduced, your choice.';

interface WeekPlan {
  /** Weekday (1–6) → the dates whose orders fill it: main first, then optional ones. */
  days: Map<number, { primary: LocalDate; optional: LocalDate[]; note: string }>;
  /** Forge B's date when it could not be done this week and may open a three-Forge week. */
  carryOut?: LocalDate;
}

/**
 * Apply the Missed Forge Make-ups rule (RANGERS_ROAD_PROGRAM.md) to one day. A session is
 * only treated as missed once its day has passed, so a moved session appears the next morning.
 */
export function withMakeup(
  day: ChapterDay,
  date: LocalDate,
  today: LocalDate,
  resolve: DayResolver,
  history: MakeupHistory,
): ChapterDay {
  const weekday = getWeekday(date);
  if (weekday === 7) return day;
  const planner = new Planner(today, resolve, history);
  const slot = planner.week(mondayOnOrBefore(date)).days.get(weekday);
  if (!slot) return day;
  const primary = resolve(slot.primary);
  if (!primary) return day;
  const makeup: DayMakeup = {
    primary,
    optional: slot.optional.map(resolve).filter((item): item is ChapterDay => !!item),
    note: slot.note,
  };
  return { ...day, makeup };
}

class Planner {
  private readonly weeks = new Map<LocalDate, WeekPlan>();

  constructor(
    private readonly today: LocalDate,
    private readonly resolve: DayResolver,
    private readonly history: MakeupHistory,
  ) {}

  week(monday: LocalDate): WeekPlan {
    let plan = this.weeks.get(monday);
    if (!plan) {
      plan = this.plan(monday);
      this.weeks.set(monday, plan);
    }
    return plan;
  }

  private plan(monday: LocalDate): WeekPlan {
    const empty: WeekPlan = { days: new Map() };
    const at = (weekday: number) => addDays(monday, weekday - 1);
    const hasA = this.isForge(at(1));
    const hasB = this.isForge(at(4));
    if (!hasA && !hasB) return empty;

    // A three-Forge week needs a full, normal week of its own (never a deload or trial week).
    const previous = this.week(addDays(monday, -7)).carryOut;
    const carry = previous && hasA && hasB ? previous : undefined;

    const forges = new Map<number, LocalDate>();
    let carryOut: LocalDate | undefined;
    let aDay: number | null = null;
    if (carry) forges.set(1, carry);

    if (hasA) {
      aDay = this.place(at(1), monday, carry ? [3, 4] : [1, 2, 3]);
      if (aDay) forges.set(aDay, at(1));
    }
    if (hasB) {
      const base = Math.max(carry ? 5 : 4, aDay ? aDay + 2 : 0);
      const bDay = this.place(at(4), monday, range(base, 6));
      if (bDay) forges.set(bDay, at(4));
      else carryOut = at(4);
    }

    // Orders a moved Forge displaces: Wednesday's goes to Thursday when it is free; in a
    // three-Forge week Friday's walk joins Tuesday's, and the longer of the two is kept.
    const movedOwn = new Map<number, number>();
    if (forges.has(3) && !forges.has(4) && !this.isForge(at(3))) movedOwn.set(3, 4);
    if (carry) movedOwn.set(5, 2);

    const days: WeekPlan['days'] = new Map();
    for (let weekday = 1; weekday <= 6; weekday++) {
      const own = at(weekday);
      const ownIsForge = (weekday === 1 && hasA) || (weekday === 4 && hasB);
      const forge = forges.get(weekday);
      const movedIn = [...movedOwn].filter(([, to]) => to === weekday).map(([from]) => at(from));
      const ownStays = !ownIsForge && !movedOwn.has(weekday);
      const notes: string[] = [];
      let primary: LocalDate;
      const optional: LocalDate[] = [];

      if (forge) {
        primary = forge;
        if (forge !== own)
          notes.push(`${this.title(forge)}, moved from ${this.dayName(forge, own)}.`);
        if (forge !== own && !ownIsForge) notes.push(FULL_OR_REDUCED);
        for (const extra of [...(ownStays ? [own] : []), ...movedIn]) optional.push(extra);
        if (optional.some((extra) => this.isWalk(extra))) notes.push(OPTIONAL_WALK);
      } else if (movedIn.length) {
        const candidates = [...(ownStays ? [own] : []), ...movedIn];
        primary = candidates.reduce((longest, item) =>
          this.minutes(item) > this.minutes(longest) ? item : longest,
        );
        if (primary !== own)
          notes.push(`${this.title(primary)}, moved from ${this.dayName(primary, own)}.`);
      } else {
        continue;
      }
      if (carry && weekday === 1) {
        notes.push(
          'This is a three-Forge week. Each session can be full or reduced, and so can Saturday’s walk.',
        );
      }
      if (primary === own && !optional.length) continue;
      days.set(weekday, { primary, optional, note: notes.join(' ') });
    }
    return { days, ...(carryOut ? { carryOut } : {}) };
  }

  /**
   * The weekday a session is done or planned on. Done anywhere this week settles it; otherwise
   * it takes the first listed day that has not passed unrecorded. Null means dropped.
   */
  private place(source: LocalDate, monday: LocalDate, weekdays: number[]): number | null {
    for (let weekday = 1; weekday <= 6; weekday++) {
      const date = addDays(monday, weekday - 1);
      if (date >= source && this.done(source, date)) return weekday;
    }
    for (const weekday of weekdays) {
      const date = addDays(monday, weekday - 1);
      if (date >= this.today) return weekday;
    }
    return null;
  }

  /**
   * Done on a date: an outcome recorded for its mission, or (for days before one-step recording)
   * its Forge saved, on a day that was not Red. Callers only ask about dates on or after the
   * source, so last week's Forge B done on Monday is never read as this week's.
   */
  private done(source: LocalDate, date: LocalDate): boolean {
    if (this.history.redDates.has(date)) return false;
    const day = this.resolve(source);
    if (!day) return false;
    const choices = getActivityChoices(day);
    const ids = new Set(choices.map((choice) => choice.id));
    const workouts = new Set(choices.flatMap((choice) => choice.contentReferences));
    return (
      this.history.records.some((record) => record.date === date && ids.has(record.definitionId)) ||
      this.history.sessions.some(
        (session) => session.date === date && workouts.has(session.workoutDefinitionId),
      )
    );
  }

  /** A Forge day in a normal chapter week: not the lead-in, a deload week, or a trial wait. */
  private isForge(date: LocalDate): boolean {
    const day = this.resolve(date);
    if (!day || day.leadIn || day.afterLastWeek || date < day.start) return false;
    if (day.week === day.program.chapter.weeks.at(-1)) return false;
    const activity = getDayContent(day).activity;
    return activity.missionType === 'strength' && !!activity.definitionId;
  }

  private isWalk(date: LocalDate): boolean {
    const day = this.resolve(date);
    return !!day && getDayContent(day).activity.missionType === 'conditioning';
  }

  private minutes(date: LocalDate): number {
    const day = this.resolve(date);
    return (day && getDayContent(day).activity.estimatedMinutes) || 0;
  }

  private title(date: LocalDate): string {
    const day = this.resolve(date);
    return day ? getDayContent(day).activity.title : 'Today’s order';
  }

  private dayName(source: LocalDate, own: LocalDate): string {
    const name = WEEKDAY_NAMES[getWeekday(source) - 1];
    return source < mondayOnOrBefore(own) ? `last ${name}` : name;
  }
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
}
