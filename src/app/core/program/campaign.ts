import type { Campaign, LocalDate, ReadinessCheck } from '../domain/models';
import { chapterOneDefinition, chapterOneWeeklyRhythm, type Weekday } from './chapter-one.seed';
import { getChapterOneDailyContent } from './chapter-one-daily.seed';

export const CHAPTER_ONE_FULL_WEEKS = 4;
export const CHAPTER_ONE_WEEK_DAYS = 7;
export const CHAPTER_ONE_SCHEDULE_VERSION = 2;

export interface ChapterOneSchedule {
  campaignDay: number;
  /** 0 is the short lead-in; 1–4 are full Monday–Sunday weeks. */
  week: 0 | 1 | 2 | 3 | 4;
  /** The lead-in follows Week 1's already documented weekday orders. */
  contentWeek: 1 | 2 | 3 | 4;
  weekday: Weekday;
  leadInDays: number;
  targetDay: number;
  afterTarget: boolean;
}

export interface TodayOrder {
  id: string;
  title: string;
  kind: 'watch' | 'weekly';
  guidance?: string;
}

/** Parse a date-only value as a civil day, independent of local time and DST. */
function civilDay(date: LocalDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError(`Invalid local date: ${date}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const parsed = new Date(milliseconds);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid local date: ${date}`);
  }

  return Math.floor(milliseconds / 86_400_000);
}

/** Day 1 is the campaign start date. Dates before it return 0. */
export function getCampaignDay(startDate: LocalDate, today: LocalDate): number {
  return Math.max(0, civilDay(today) - civilDay(startDate) + 1);
}

/** The civil date a number of days before (negative) or after a date. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date((civilDay(date) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** True for a real YYYY-MM-DD calendar date. */
export function isLocalDate(value: string): boolean {
  try {
    civilDay(value);
    return true;
  } catch {
    return false;
  }
}

/** Whole civil days from today until a date; never negative. */
export function getDaysUntil(date: LocalDate, today: LocalDate): number {
  return Math.max(0, civilDay(date) - civilDay(today));
}

/** End of Week 4 is the default planning target; a chosen date can replace it. */
export function getDaysUntilGateTrial(
  startDate: LocalDate,
  today: LocalDate,
  plannedTargetDate?: LocalDate,
): number {
  return getDaysUntil(plannedTargetDate ?? getGateTrialTargetDate(startDate), today);
}

function weekday(date: LocalDate): Weekday {
  const utcDay = new Date(civilDay(date) * 86_400_000).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as Weekday;
}

/** A Monday start enters Week 1 at once; other starts lead in through Sunday. */
export function getChapterOneLeadInDays(startDate: LocalDate): number {
  const startWeekday = weekday(startDate);
  return startWeekday === 1 ? 0 : 8 - startWeekday;
}

/** Campaign day that closes four complete weeks, including any lead-in days. */
export function getChapterOneTargetDay(startDate: LocalDate): number {
  return getChapterOneLeadInDays(startDate) + CHAPTER_ONE_FULL_WEEKS * CHAPTER_ONE_WEEK_DAYS;
}

/** End of the fourth full Monday–Sunday week, used only as a planning date. */
export function getGateTrialTargetDate(startDate: LocalDate): LocalDate {
  return addDays(startDate, getChapterOneTargetDay(startDate) - 1);
}

/** Resolve a Chapter I date without making a partial first week count as Week 1. */
export function getChapterOneSchedule(
  startDate: LocalDate,
  date: LocalDate,
): ChapterOneSchedule | null {
  const campaignDay = getCampaignDay(startDate, date);
  if (campaignDay < 1) return null;

  const leadInDays = getChapterOneLeadInDays(startDate);
  const fullWeekDay = campaignDay - leadInDays;
  const week =
    fullWeekDay <= 0
      ? 0
      : (Math.min(CHAPTER_ONE_FULL_WEEKS, Math.ceil(fullWeekDay / CHAPTER_ONE_WEEK_DAYS)) as
          1 | 2 | 3 | 4);

  return {
    campaignDay,
    week,
    contentWeek: week === 0 ? 1 : week,
    weekday: weekday(date),
    leadInDays,
    targetDay: getChapterOneTargetDay(startDate),
    afterTarget: fullWeekDay > CHAPTER_ONE_FULL_WEEKS * CHAPTER_ONE_WEEK_DAYS,
  };
}

/**
 * Older campaigns saved Day 1 + 27 as their default planning target. Reconcile
 * only that generated value; an explicitly different target remains the user's.
 * This changes campaign planning metadata, never any append-only history row.
 */
export function reconcileChapterOneCampaign(campaign: Campaign): Campaign {
  if (
    campaign.currentChapterId !== chapterOneDefinition.id ||
    (campaign.scheduleVersion ?? 0) >= CHAPTER_ONE_SCHEDULE_VERSION
  )
    return campaign;
  const oldDefaultTarget = addDays(campaign.startDate, 27);
  const targetWasGenerated =
    !campaign.trialTargetDate || campaign.trialTargetDate === oldDefaultTarget;
  return {
    ...campaign,
    scheduleVersion: CHAPTER_ONE_SCHEDULE_VERSION,
    trialTargetDate: targetWasGenerated
      ? getGateTrialTargetDate(campaign.startDate)
      : campaign.trialTargetDate,
  };
}

/** The order list uses the dated Chapter I content while retaining the weekday IDs. */
export function getTodaysOrders(
  startDate: LocalDate,
  today: LocalDate,
  readinessStatus: ReadinessCheck['status'] | null = null,
): TodayOrder[] {
  const schedule = getChapterOneSchedule(startDate, today);
  if (!schedule) {
    return [];
  }

  const slot = chapterOneWeeklyRhythm.find((item) => item.weekday === schedule.weekday);
  if (!slot) {
    throw new Error('Chapter I weekly rhythm is incomplete');
  }

  const week = schedule.contentWeek;
  const content = getChapterOneDailyContent(week, slot.weekday);
  let title = content.activity.title;
  let guidance: string | undefined = content.activity.details?.join(' ');
  if (content.activity.plannedTrialId && readinessStatus === 'yellow') {
    title = 'Gate Trial waits for Green';
    guidance = 'A full Gate Trial needs a Green readiness day.';
  } else if (content.activity.plannedTrialId && readinessStatus === 'red') {
    title = 'Gate Trial waits for Green';
    guidance = 'No strength or trial today. Easy movement or restoration only if appropriate.';
  } else if (readinessStatus === 'red' && slot.weekday === 3 && (week === 2 || week === 3)) {
    title = 'Restoration or skill practice';
    guidance =
      week === 2
        ? 'No strength or conditioning. Nonexertional tool inspection remains available; restoration or easy movement only if appropriate.'
        : 'No strength or conditioning. Nonexertional knot practice remains available; restoration or easy movement only if appropriate.';
  } else if (readinessStatus === 'red' && slot.weekday !== 7) {
    title = 'Restoration or easy movement, if appropriate';
    guidance = 'No strength mission. Do only what is appropriate for your symptoms.';
  } else if (readinessStatus === 'yellow' && slot.weekday !== 7) {
    guidance = 'Reduce volume about 25%; do not increase load.';
  } else if (readinessStatus === null && slot.weekday !== 7) {
    guidance = 'Check readiness before training.';
  }

  return [
    {
      id: 'morning-watch',
      title: 'Morning Watch',
      kind: 'watch',
      guidance: content.scriptureReference,
    },
    { id: `weekday-${slot.weekday}`, title, kind: 'weekly', ...(guidance ? { guidance } : {}) },
    { id: 'evening-watch', title: 'Evening Watch', kind: 'watch' },
  ];
}
