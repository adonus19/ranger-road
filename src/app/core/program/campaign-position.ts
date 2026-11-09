import type { LocalDate, TrialResult } from '../domain/models';
import {
  addDays,
  daysBetween,
  getCampaignDay,
  getWeekday,
  mondayOnOrAfter,
  mondayOnOrBefore,
} from './calendar';
import type { ChapterProgram, Weekday } from './chapter-program';
import { chapterPrograms } from './program-catalog';

export const WEEK_DAYS = 7;

export type TrialRecord = Pick<TrialResult, 'trialId' | 'date'>;

/** Where a date falls inside one chapter. */
export interface ChapterDay<T extends TrialRecord = TrialRecord> {
  program: ChapterProgram;
  campaignDay: number;
  /** Campaign week: Chapter I's lead-in is 0 and its weeks are 1–4; Chapter II's are 5–8. */
  week: number;
  /** The week whose orders apply: Week 1 in the lead-in, the last week while the trial waits. */
  contentWeek: number;
  weekday: Weekday;
  leadIn: boolean;
  /** After the chapter's last full week, while its trial waits for a pass. */
  afterLastWeek: boolean;
  /**
   * The trial takes this day's order: a day after the last week on which the trial was passed
   * or (via `withTrialDay`) started or stopped. Other days after the last week repeat it.
   */
  attemptDay: boolean;
  /** The first day of this chapter's own orders. */
  start: LocalDate;
  /** The Monday that begins the chapter's first full week. */
  firstMonday: LocalDate;
  /** The first day the trial can be taken, and its suggested day: the Monday after the last week. */
  firstAttempt: LocalDate;
  /** The first completed result for this chapter's trial. Completing it is the pass. */
  pass?: T;
  /** The next chapter's first day, once the trial is passed. */
  nextStart?: LocalDate;
  /** Set when a missed Forge session changes this day's orders (see makeup-schedule.ts). */
  makeup?: DayMakeup;
}

/**
 * A day whose main order comes from another date: a moved Forge session, or an order a moved
 * session displaced. Each source keeps its own mission IDs, so saved records still match.
 */
export interface DayMakeup {
  /** The source of the day's main order. */
  primary: ChapterDay;
  /** Orders kept beside it as optional, such as the day's own walk. */
  optional: ChapterDay[];
  /** Calm wording shown with the main order. */
  note: string;
}

export interface CampaignPosition<T extends TrialRecord = TrialRecord> {
  campaignDay: number;
  /** Today's chapter, or the last chapter in the app once its trial is passed. */
  chapter: ChapterDay<T>;
  /** From the next chapter's first day while that chapter's orders are not in the app yet. */
  awaitingNextChapter: boolean;
}

/**
 * Place a date in the campaign. Chapter I begins on Day 1; each later chapter begins after the
 * previous trial's pass (see Trial Timing in CHAPTERS_AND_TRIALS.md), so the position is
 * derived from saved trial results and never stored. Returns null before Day 1.
 */
export function resolveCampaignPosition<T extends TrialRecord>(
  startDate: LocalDate,
  date: LocalDate,
  completedTrials: readonly T[] = [],
  programs: readonly ChapterProgram[] = chapterPrograms,
): CampaignPosition<T> | null {
  const campaignDay = getCampaignDay(startDate, date);
  if (campaignDay < 1) return null;

  let start = startDate;
  for (const [index, program] of programs.entries()) {
    const chapter = getChapterDay(program, start, date, campaignDay, completedTrials);
    if (!chapter.nextStart || date < chapter.nextStart) {
      return { campaignDay, chapter, awaitingNextChapter: false };
    }
    if (index === programs.length - 1) {
      return { campaignDay, chapter, awaitingNextChapter: true };
    }
    start = chapter.nextStart;
  }
  throw new Error('No chapters are in the program.');
}

/** A date inside one chapter that began on `start`. Dates before Day 1 are not checked here. */
export function getChapterDay<T extends TrialRecord>(
  program: ChapterProgram,
  start: LocalDate,
  date: LocalDate,
  campaignDay: number,
  completedTrials: readonly T[] = [],
): ChapterDay<T> {
  const weeks = program.chapter.weeks;
  const firstWeek = weeks[0];
  // Chapter I leads in through Sunday; a later chapter that starts on a Tuesday after a
  // Monday pass still counts that Monday as its first week's.
  const firstMonday = program.leadsIn ? mondayOnOrAfter(start) : mondayOnOrBefore(start);
  const fromFirstMonday = daysBetween(firstMonday, date);
  const leadIn = fromFirstMonday < 0;
  const weekIndex = Math.floor(fromFirstMonday / WEEK_DAYS);
  const afterLastWeek = weekIndex >= weeks.length;
  const week = leadIn ? 0 : firstWeek + Math.min(weekIndex, weeks.length - 1);
  const weekday = getWeekday(date);
  const firstAttempt = addDays(firstMonday, weeks.length * WEEK_DAYS);
  const pass = firstPass(program, completedTrials);
  return {
    program,
    campaignDay,
    week,
    contentWeek: leadIn ? firstWeek : week,
    weekday,
    leadIn,
    afterLastWeek,
    attemptDay: afterLastWeek && pass?.date === date,
    start,
    firstMonday,
    firstAttempt,
    ...(pass ? { pass, nextStart: getNextChapterStart(pass.date, firstAttempt) } : {}),
  };
}

/** The first completed result for the chapter's trial. */
function firstPass<T extends TrialRecord>(
  program: ChapterProgram,
  completedTrials: readonly T[],
): T | undefined {
  return completedTrials
    .filter((result) => result.trialId === program.trial.id)
    .reduce<T | undefined>(
      (first, result) => (!first || result.date < first.date ? result : first),
      undefined,
    );
}

/**
 * The next chapter starts the day after a Monday pass, because the trial took that week's
 * Forge A, or the Monday after a pass on any other day. A pass saved before the trial window
 * opened (an older record) starts it on the first attempt day.
 */
export function getNextChapterStart(passDate: LocalDate, firstAttempt: LocalDate): LocalDate {
  if (passDate < firstAttempt) return firstAttempt;
  const weekday = getWeekday(passDate);
  return addDays(passDate, weekday === 1 ? 1 : 8 - weekday);
}

/**
 * The next day the trial can be taken (Trial Timing, CHAPTERS_AND_TRIALS.md): any day from the
 * first, which is the Monday after the chapter's last week.
 */
export function getNextAttemptFrom(firstAttempt: LocalDate, from: LocalDate): LocalDate {
  return from < firstAttempt ? firstAttempt : from;
}

export function getNextAttempt(chapter: ChapterDay, from: LocalDate): LocalDate {
  return getNextAttemptFrom(chapter.firstAttempt, from);
}

/** The trial can be taken today: its chapter's last week is over and it is not passed. */
export function isTrialAvailable(chapter: ChapterDay): boolean {
  return chapter.afterLastWeek && !chapter.pass;
}

/**
 * A day after the chapter's last week on which its trial was started, stopped or passed takes
 * the trial as its order, in place of the repeated week's (Trial Timing). A moved Forge
 * session on that day is dropped, not rescheduled. `trialDays` lists those days by trial.
 */
export function withTrialDay<T extends TrialRecord>(
  day: ChapterDay<T>,
  date: LocalDate,
  trialDays: readonly TrialRecord[],
): ChapterDay<T> {
  if (day.attemptDay) return day.makeup ? withoutMakeup(day) : day;
  if (!day.afterLastWeek || (day.pass && date > day.pass.date)) return day;
  const taken = trialDays.some(
    (record) => record.trialId === day.program.trial.id && record.date === date,
  );
  return taken ? withoutMakeup({ ...day, attemptDay: true }) : day;
}

function withoutMakeup<T extends TrialRecord>(day: ChapterDay<T>): ChapterDay<T> {
  const copy = { ...day };
  delete copy.makeup;
  return copy;
}
