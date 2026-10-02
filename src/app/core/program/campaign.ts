import type { Campaign, LocalDate, ReadinessCheck } from '../domain/models';
import { addDays, daysBetween, getCampaignDay, getDaysUntil, mondayOnOrAfter } from './calendar';
import { getChapterDay, getNextAttemptFrom, type ChapterDay } from './campaign-position';
import { getDayOrders, type TodayOrder } from './chapter-orders';
import { chapterOneDefinition, type Weekday } from './chapter-one.seed';
import { chapterOneProgram } from './chapter-one.program';

export { addDays, getCampaignDay, getDaysUntil, getWeekday, isLocalDate } from './calendar';
export type { TodayOrder } from './chapter-orders';

export const CHAPTER_ONE_FULL_WEEKS = 4;
export const CHAPTER_ONE_WEEK_DAYS = 7;
export const CHAPTER_ONE_SCHEDULE_VERSION = 4;

export interface ChapterOneSchedule {
  campaignDay: number;
  /** 0 is the short lead-in; 1–4 are full Monday–Sunday weeks. */
  week: 0 | 1 | 2 | 3 | 4;
  /** The lead-in follows Week 1's already documented weekday orders. */
  contentWeek: 1 | 2 | 3 | 4;
  weekday: Weekday;
  leadInDays: number;
  /** Campaign day that closes Week 4. */
  targetDay: number;
  /** After Week 4, while the Gate Trial window is open. */
  afterTarget: boolean;
  /** A Monday or Thursday after Week 4, when the Gate Trial takes the strength slot. */
  attemptDay: boolean;
}

/** Days until the next Gate Trial attempt; 0 on an attempt day. */
export function getDaysUntilGateTrial(startDate: LocalDate, today: LocalDate): number {
  return getDaysUntil(getNextGateTrialAttempt(startDate, today), today);
}

/** A Monday start enters Week 1 at once; other starts lead in through Sunday. */
export function getChapterOneLeadInDays(startDate: LocalDate): number {
  return daysBetween(startDate, mondayOnOrAfter(startDate));
}

/** Campaign day that closes four complete weeks, including any lead-in days. */
export function getChapterOneTargetDay(startDate: LocalDate): number {
  return getChapterOneLeadInDays(startDate) + CHAPTER_ONE_FULL_WEEKS * CHAPTER_ONE_WEEK_DAYS;
}

/** Campaign day of the first Gate Trial attempt: the Monday after Week 4. */
export function getGateTrialPlannedDay(startDate: LocalDate): number {
  return getChapterOneTargetDay(startDate) + 1;
}

/**
 * The first Gate Trial attempt, the Monday after Week 4, in place of that week's Forge A.
 * Until the trial is passed, each following Thursday and Monday is another attempt day.
 */
export function getGateTrialTargetDate(startDate: LocalDate): LocalDate {
  return addDays(startDate, getGateTrialPlannedDay(startDate) - 1);
}

/** The next Gate Trial attempt on or after today: the first attempt, then Mondays and Thursdays. */
export function getNextGateTrialAttempt(startDate: LocalDate, today: LocalDate): LocalDate {
  return getNextAttemptFrom(getGateTrialTargetDate(startDate), today);
}

export function isGateTrialAttemptDay(startDate: LocalDate, date: LocalDate): boolean {
  return getChapterOneSchedule(startDate, date)?.attemptDay ?? false;
}

/**
 * A date in Chapter I, without trial history: after Week 4 every Monday and Thursday stays an
 * attempt day. Screens that span chapters use resolveCampaignPosition instead.
 */
export function getChapterOneDay(startDate: LocalDate, date: LocalDate): ChapterDay | null {
  const campaignDay = getCampaignDay(startDate, date);
  return campaignDay < 1 ? null : getChapterDay(chapterOneProgram, startDate, date, campaignDay);
}

/** Resolve a Chapter I date without making a partial first week count as Week 1. */
export function getChapterOneSchedule(
  startDate: LocalDate,
  date: LocalDate,
): ChapterOneSchedule | null {
  const day = getChapterOneDay(startDate, date);
  if (!day) return null;
  return {
    campaignDay: day.campaignDay,
    week: day.week as ChapterOneSchedule['week'],
    contentWeek: day.contentWeek as ChapterOneSchedule['contentWeek'],
    weekday: day.weekday,
    leadInDays: getChapterOneLeadInDays(startDate),
    targetDay: getChapterOneTargetDay(startDate),
    afterTarget: day.afterLastWeek,
    attemptDay: day.attemptDay,
  };
}

/**
 * Older campaigns generated Day 1 + 27 (version 1), the Sunday closing Week 4
 * (version 2), or Week 4 Saturday (version 3). Match only the saved version's
 * generated date, so a separately chosen date survives. Version 4 places the
 * first attempt on Monday. This changes planning metadata, never history rows.
 */
export function reconcileChapterOneCampaign(campaign: Campaign): Campaign {
  if (
    campaign.currentChapterId !== chapterOneDefinition.id ||
    (campaign.scheduleVersion ?? 0) >= CHAPTER_ONE_SCHEDULE_VERSION
  )
    return campaign;
  const previousVersion = campaign.scheduleVersion ?? 1;
  const endOfWeekFour = getChapterOneTargetDay(campaign.startDate);
  const generatedTarget =
    previousVersion === 3
      ? addDays(campaign.startDate, endOfWeekFour - 2)
      : previousVersion === 2
        ? addDays(campaign.startDate, endOfWeekFour - 1)
        : addDays(campaign.startDate, 27);
  const targetWasGenerated =
    !campaign.trialTargetDate || campaign.trialTargetDate === generatedTarget;
  return {
    ...campaign,
    scheduleVersion: CHAPTER_ONE_SCHEDULE_VERSION,
    trialTargetDate: targetWasGenerated
      ? getGateTrialTargetDate(campaign.startDate)
      : campaign.trialTargetDate,
  };
}

/** Chapter I's orders for a date, without trial history. */
export function getTodaysOrders(
  startDate: LocalDate,
  today: LocalDate,
  readinessStatus: ReadinessCheck['status'] | null = null,
): TodayOrder[] {
  const day = getChapterOneDay(startDate, today);
  return day ? getDayOrders(day, readinessStatus) : [];
}
