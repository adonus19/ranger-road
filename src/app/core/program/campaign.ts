import type { Campaign, LocalDate, MissionType, ReadinessCheck } from '../domain/models';
import { chapterOneDefinition, chapterOneWeeklyRhythm, type Weekday } from './chapter-one.seed';
import { getChapterOneDayContent } from './chapter-one-daily.seed';

export const CHAPTER_ONE_FULL_WEEKS = 4;
export const CHAPTER_ONE_WEEK_DAYS = 7;
export const CHAPTER_ONE_SCHEDULE_VERSION = 3;

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

export interface TodayOrder {
  id: string;
  title: string;
  kind: 'watch' | 'weekly';
  guidance?: string;
  /** The dated order's kind, so screens can choose a fitting pictogram. */
  missionType?: MissionType;
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

/** Days until the next Gate Trial attempt; 0 on an attempt day. */
export function getDaysUntilGateTrial(startDate: LocalDate, today: LocalDate): number {
  return getDaysUntil(getNextGateTrialAttempt(startDate, today), today);
}

/** 1 is Monday and 7 is Sunday, for a civil date. */
export function getWeekday(date: LocalDate): Weekday {
  const utcDay = new Date(civilDay(date) * 86_400_000).getUTCDay();
  return (utcDay === 0 ? 7 : utcDay) as Weekday;
}

const weekday = getWeekday;

/** A Monday start enters Week 1 at once; other starts lead in through Sunday. */
export function getChapterOneLeadInDays(startDate: LocalDate): number {
  const startWeekday = weekday(startDate);
  return startWeekday === 1 ? 0 : 8 - startWeekday;
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
  const first = getGateTrialTargetDate(startDate);
  if (today <= first) return first;
  const day = weekday(today);
  return addDays(today, day === 1 ? 0 : day <= 4 ? 4 - day : 8 - day);
}

export function isGateTrialAttemptDay(startDate: LocalDate, date: LocalDate): boolean {
  return getChapterOneSchedule(startDate, date)?.attemptDay ?? false;
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

  const day = weekday(date);
  const afterTarget = fullWeekDay > CHAPTER_ONE_FULL_WEEKS * CHAPTER_ONE_WEEK_DAYS;
  return {
    campaignDay,
    week,
    contentWeek: week === 0 ? 1 : week,
    weekday: day,
    leadInDays,
    targetDay: getChapterOneTargetDay(startDate),
    afterTarget,
    attemptDay: afterTarget && (day === 1 || day === 4),
  };
}

/**
 * Older campaigns saved a generated planning target: Day 1 + 27 (schedule 1), or the
 * Sunday that closes Week 4 (schedule 2). Move only a generated value to the first
 * Gate Trial attempt; any other saved date is left as it was, though attempts now
 * follow the Monday and Thursday rule. This changes campaign planning metadata, never
 * any append-only history row.
 */
export function reconcileChapterOneCampaign(campaign: Campaign): Campaign {
  if (
    campaign.currentChapterId !== chapterOneDefinition.id ||
    (campaign.scheduleVersion ?? 0) >= CHAPTER_ONE_SCHEDULE_VERSION
  )
    return campaign;
  const endOfWeekFour = getChapterOneTargetDay(campaign.startDate);
  const generatedTargets = [
    addDays(campaign.startDate, 27),
    addDays(campaign.startDate, endOfWeekFour - 1),
    addDays(campaign.startDate, endOfWeekFour - 2),
  ];
  const targetWasGenerated =
    !campaign.trialTargetDate || generatedTargets.includes(campaign.trialTargetDate);
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
  const content = getChapterOneDayContent(week, slot.weekday, schedule.attemptDay);
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
    {
      id: `weekday-${slot.weekday}`,
      title,
      kind: 'weekly',
      missionType: content.activity.missionType,
      ...(guidance ? { guidance } : {}),
    },
    { id: 'evening-watch', title: 'Evening Watch', kind: 'watch' },
  ];
}
