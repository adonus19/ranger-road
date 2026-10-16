import type { LocalDate, ReadinessStatus } from '../domain/models';
import { addDays, getWeekday, mondayOnOrBefore } from './calendar';
import type { ChapterDay } from './campaign-position';
import { getDayContent } from './chapter-orders';
import {
  isThreeForgeWeek,
  withMakeup,
  type DayResolver,
  type MakeupHistory,
} from './makeup-schedule';
import { chapterPrograms } from './program-catalog';

/** Tuesday, Wednesday, Friday and Saturday (The Optional Forge, RANGERS_ROAD_PROGRAM.md). */
const ELIGIBLE_WEEKDAYS: ReadonlySet<number> = new Set([2, 3, 5, 6]);

/** What the quiet "Optional Forge available" card opens on a day. */
export interface OptionalForgeOffer {
  /** The session the card opens, such as Chapter I's Forge C. */
  workoutId: string;
  /** A deload week (and the trial days that repeat it): the card adds "Keep it light." */
  light: boolean;
}

/** Every chapter's optional Forge, so a session done in any of them settles its week. */
export function optionalForgeIds(): ReadonlySet<string> {
  return new Set(
    chapterPrograms.flatMap((program) =>
      program.optionalForgeId ? [program.optionalForgeId] : [],
    ),
  );
}

export function isOptionalForge(workoutId: string): boolean {
  return optionalForgeIds().has(workoutId);
}

/**
 * Whether the optional Forge is offered on a date. Pure: it reads the make-up planner for the
 * three-Forge week and a moved Forge, and the saved sessions for this week's completed one.
 * A day without the card says nothing; nothing here is stored, counted, or listed as missed.
 */
export function getOptionalForge(
  date: LocalDate,
  today: LocalDate,
  resolve: DayResolver,
  history: MakeupHistory,
  readiness: ReadinessStatus | null,
): OptionalForgeOffer | null {
  if (!ELIGIBLE_WEEKDAYS.has(getWeekday(date))) return null;
  // Red means no strength work today, so there is nothing optional to offer.
  if (readiness === 'red') return null;
  const own = resolve(date);
  const workoutId = own?.program.optionalForgeId;
  if (!own || !workoutId || own.attemptDay) return null;
  if (isThreeForgeWeek(date, today, resolve, history)) return null;
  // Two Forge sessions never stack on one day.
  const day = withMakeup(own, date, today, resolve, history);
  if (day.makeup && isForgeOrder(day.makeup.primary)) return null;
  if (doneThisWeek(date, history)) return null;
  return { workoutId, light: day.contentWeek === day.program.chapter.weeks.at(-1) };
}

function isForgeOrder(day: ChapterDay): boolean {
  return getDayContent(day).activity.missionType === 'strength';
}

/** A completed optional Forge, Monday through Sunday; a stopped one leaves the card. */
function doneThisWeek(date: LocalDate, history: MakeupHistory): boolean {
  const monday = mondayOnOrBefore(date);
  const sunday = addDays(monday, 6);
  const ids = optionalForgeIds();
  return history.sessions.some(
    (session) =>
      ids.has(session.workoutDefinitionId) &&
      session.outcome !== 'stopped' &&
      session.date >= monday &&
      session.date <= sunday,
  );
}
