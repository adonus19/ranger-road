import type { LocalDate, MissionDefinition } from '../domain/models';
import { getChapterOneSchedule } from './campaign';
import { chapterOneDefinition } from './chapter-one.seed';
import {
  chapterOneContentId,
  getChapterOneDayContent,
  getChapterOneWeekContent,
  type ChapterOneDayContent,
} from './chapter-one-daily.seed';

/** The watches use the documented steps; dated Scripture comes from the daily seed. */
export const chapterOneWatchContent = {
  'morning-watch': [
    'Scripture',
    'Brief prayer',
    "Review Today's Orders",
    'What does my family need from me today?',
  ],
  'evening-watch': ['Win', 'Failure / missed standard', 'Gratitude', 'Tomorrow'],
} as const;

/** The manual entry for a date; the lead-in uses Week 1 weekday content. */
export function getChapterOneContentForDate(
  startDate: LocalDate,
  date: LocalDate,
): ChapterOneDayContent | undefined {
  const schedule = getChapterOneSchedule(startDate, date);
  if (!schedule) return undefined;
  return getChapterOneDayContent(schedule.contentWeek, schedule.weekday, schedule.attemptDay);
}

/**
 * Build the three documented orders for a Chapter I date. Keep Week 4's
 * content available after the planning target while the trial is pending; its Saturday
 * listing is a plan, not an automatic trial completion or date gate.
 */
export function getChapterOneMissionsForDate(
  startDate: LocalDate,
  date: LocalDate,
): MissionDefinition[] {
  const schedule = getChapterOneSchedule(startDate, date);
  if (!schedule) {
    return [];
  }

  const week = schedule.week;
  const day = schedule.weekday;
  const content = getChapterOneDayContent(schedule.contentWeek, day, schedule.attemptDay);
  const weekContent = getChapterOneWeekContent(schedule.contentWeek);
  const readingBookTitle = weekContent.readingBookTitle;
  const activityDetails = [
    ...(content.activity.details ?? []),
    ...(content.activity.fieldcraftPractice && weekContent.fieldcraft
      ? [weekContent.fieldcraft]
      : []),
  ];

  const shared = { chapterId: chapterOneDefinition.id, week, day, required: true };
  const idPrefix = schedule.attemptDay
    ? `${chapterOneDefinition.id}-gate-trial-attempt-day-${day}`
    : week === 0
      ? `${chapterOneDefinition.id}-lead-in-day-${day}`
      : `${chapterOneDefinition.id}-week-${week}-day-${day}`;

  return [
    {
      ...shared,
      id: `${idPrefix}-morning-watch`,
      missionType: 'scripture',
      title: 'Morning Watch',
      contentReferences: ['morning-watch'],
      scriptureReference: content.scriptureReference,
      ...(content.morningReflectionPrompt
        ? { reflectionPrompt: content.morningReflectionPrompt }
        : {}),
    },
    {
      ...shared,
      id: `${idPrefix}-weekly`,
      missionType: content.activity.missionType,
      title: content.activity.title,
      contentReferences: [content.activity.definitionId ?? content.activity.plannedTrialId].filter(
        (id): id is string => Boolean(id),
      ),
      ...(content.activity.estimatedMinutes !== undefined
        ? { estimatedMinutes: content.activity.estimatedMinutes }
        : {}),
      ...(activityDetails.length ? { activityDetails } : {}),
      ...(content.activity.plannedTrialId
        ? { plannedTrialId: content.activity.plannedTrialId }
        : {}),
      ...(content.activity.trialPreparation
        ? { trialPreparation: content.activity.trialPreparation }
        : {}),
      ...(content.readingMinutes !== undefined ? { readingMinutes: content.readingMinutes } : {}),
      ...(content.readingMinutes !== undefined && readingBookTitle ? { readingBookTitle } : {}),
      ...(content.optionalFamilyQuest ? { optionalFamilyQuest: content.optionalFamilyQuest } : {}),
    },
    {
      ...shared,
      id: `${idPrefix}-evening-watch`,
      missionType: 'reflection',
      title: 'Evening Watch',
      contentReferences: ['evening-watch'],
      ...(content.reflectionPrompt ? { reflectionPrompt: content.reflectionPrompt } : {}),
    },
  ];
}

/**
 * Return the documented alternatives for the day's main order. The original
 * weekly ID stays with the first choice so records made before choices were
 * shown remain reachable; their own definition snapshots retain their titles.
 * Workout IDs, walk durations, and Scripture references come from the daily seed.
 */
export function getChapterOneActivityChoicesForDate(
  startDate: LocalDate,
  date: LocalDate,
): MissionDefinition[] {
  const weekly = getChapterOneMissionsForDate(startDate, date)[1];
  if (!weekly) {
    return [];
  }

  if (weekly.day === 3 && (weekly.week === 2 || weekly.week === 3)) {
    const fieldcraft = getChapterOneWeekContent(weekly.week).fieldcraft;
    return [
      { ...weekly, title: 'Restoration' },
      {
        ...weekly,
        id: `${weekly.id}-skill`,
        missionType: 'fieldcraft',
        title: weekly.week === 3 ? 'Knot practice' : 'Tool inspection',
        requiresReadiness: false,
        contentReferences: [chapterOneContentId(weekly.week, 3, 'fieldcraft')],
        ...(fieldcraft ? { activityDetails: [fieldcraft] } : {}),
      },
    ];
  }

  if (weekly.day === 5 && weekly.week !== 4) {
    const restoration: MissionDefinition = {
      ...weekly,
      id: `${weekly.id}-restoration`,
      missionType: 'restoration',
      title: 'Restoration',
      contentReferences: ['chapter-1-restoration'],
    };
    delete restoration.estimatedMinutes;
    delete restoration.activityDetails;
    return [weekly, restoration];
  }

  return [weekly];
}
