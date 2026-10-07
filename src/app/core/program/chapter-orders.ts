import type { MissionDefinition, MissionType, ReadinessCheck } from '../domain/models';
import type { ChapterDay } from './campaign-position';
import type { ChapterDayContent, ChapterWeekContent } from './chapter-program';

export interface TodayOrder {
  id: string;
  title: string;
  kind: 'watch' | 'weekly';
  guidance?: string;
  /** The dated order's kind, so screens can choose a fitting pictogram. */
  missionType?: MissionType;
}

/** The week whose orders apply on the day. */
export function getWeekContent(day: ChapterDay): ChapterWeekContent {
  const program = day.program;
  const content = program.weeks[day.contentWeek - program.chapter.weeks[0]];
  if (!content) {
    throw new RangeError(`No ${program.chapter.id} content for week ${day.contentWeek}.`);
  }
  return content;
}

/** The day's content; an attempt day takes the chapter's trial instead. */
export function getDayContent(day: ChapterDay): ChapterDayContent {
  if (day.attemptDay) return day.program.trialAttempt;
  const content = getWeekContent(day).days[day.weekday];
  if (!content) {
    throw new RangeError(
      `No ${day.program.chapter.id} content for week ${day.contentWeek}, day ${day.weekday}.`,
    );
  }
  return content;
}

/** Mission IDs stay stable across content revisions, so saved records keep matching. */
function missionIdPrefix(day: ChapterDay): string {
  const chapterId = day.program.chapter.id;
  if (day.attemptDay) return `${chapterId}-${day.program.trial.id}-attempt-day-${day.weekday}`;
  if (day.leadIn) return `${chapterId}-lead-in-day-${day.weekday}`;
  return `${chapterId}-week-${day.week}-day-${day.weekday}`;
}

/**
 * The three documented orders for a day: Morning Watch, the main order, and Evening Watch.
 * While a trial is pending, the last week's other days repeat with their own IDs; a planned
 * trial is a plan, never an automatic completion or date gate.
 */
export function getDayMissions(day: ChapterDay): MissionDefinition[] {
  const content = getDayContent(day);
  const weekContent = getWeekContent(day);
  const readingBookTitle = weekContent.readingBookTitle;
  const activityDetails = [
    ...(content.activity.details ?? []),
    ...(content.activity.fieldcraftPractice && weekContent.fieldcraft
      ? [weekContent.fieldcraft]
      : []),
  ];

  const shared = {
    chapterId: day.program.chapter.id,
    week: day.week,
    day: day.weekday,
    required: true,
  };
  const idPrefix = missionIdPrefix(day);

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
      ...(content.activity.intervals ? { intervals: content.activity.intervals } : {}),
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
 * The documented ways to do the day's main order. The original weekly ID stays with the
 * first choice so records made before choices were shown remain reachable; their own
 * definition snapshots retain their titles.
 */
export function getActivityChoices(day: ChapterDay): MissionDefinition[] {
  if (!day.makeup) return getOwnActivityChoices(day);
  // A moved session keeps its own IDs; the day's reading and family quest stay with the day.
  const ownWeekly = getDayMissions(day)[1];
  const dayExtras = {
    ...(ownWeekly?.readingMinutes !== undefined
      ? { readingMinutes: ownWeekly.readingMinutes }
      : {}),
    ...(ownWeekly?.readingBookTitle ? { readingBookTitle: ownWeekly.readingBookTitle } : {}),
    ...(ownWeekly?.optionalFamilyQuest
      ? { optionalFamilyQuest: ownWeekly.optionalFamilyQuest }
      : {}),
  };
  const strip = (choice: MissionDefinition): MissionDefinition => {
    const copy = { ...choice };
    delete copy.readingMinutes;
    delete copy.readingBookTitle;
    delete copy.optionalFamilyQuest;
    return copy;
  };
  const primary = getOwnActivityChoices(day.makeup.primary).map(strip);
  if (primary[0]) primary[0] = { ...primary[0], ...dayExtras };
  const optional = day.makeup.optional.flatMap((source) =>
    getOwnActivityChoices(source).map((choice) => ({
      ...strip(choice),
      title: `${choice.title} (optional)`,
    })),
  );
  return [...primary, ...optional];
}

function getOwnActivityChoices(day: ChapterDay): MissionDefinition[] {
  const weekly = getDayMissions(day)[1];
  if (!weekly) return [];
  const activity = getDayContent(day).activity;
  if (!activity.alternatives?.length) return [weekly];

  const fieldcraft = getWeekContent(day).fieldcraft;
  return [
    activity.choiceTitle ? { ...weekly, title: activity.choiceTitle } : weekly,
    ...activity.alternatives.map((alternative) => {
      const choice: MissionDefinition = {
        ...weekly,
        id: `${weekly.id}-${alternative.idSuffix}`,
        missionType: alternative.missionType,
        title: alternative.title,
        contentReferences: [...alternative.contentReferences],
        ...(alternative.nonexertional ? { requiresReadiness: false } : {}),
      };
      delete choice.estimatedMinutes;
      delete choice.activityDetails;
      delete choice.intervals;
      if (alternative.fieldcraftPractice && fieldcraft) choice.activityDetails = [fieldcraft];
      return choice;
    }),
  ];
}

/** Today's Orders for Keep, worded for the day's readiness. */
export function getDayOrders(
  day: ChapterDay,
  readinessStatus: ReadinessCheck['status'] | null = null,
): TodayOrder[] {
  const content = getDayContent(day);
  // A moved session leads the day; the day's own Scripture stays with the watches.
  const activity = day.makeup ? getDayContent(day.makeup.primary).activity : content.activity;
  const trialName = day.program.trialName;
  const restDay = day.weekday === 7;
  let title = activity.title;
  let guidance: string | undefined = activity.details?.join(' ');
  if (activity.plannedTrialId && readinessStatus === 'yellow') {
    title = `${trialName} waits for Green`;
    guidance = `A full ${trialName} needs a Green readiness day.`;
  } else if (activity.plannedTrialId && readinessStatus === 'red') {
    title = `${trialName} waits for Green`;
    guidance = 'No strength or trial today. Easy movement or restoration only if appropriate.';
  } else if (readinessStatus === 'red' && activity.redDayOrder) {
    title = activity.redDayOrder.title;
    guidance = activity.redDayOrder.guidance;
  } else if (readinessStatus === 'red' && !restDay) {
    title = 'Restoration or easy movement, if appropriate';
    guidance = 'No strength mission. Do only what is appropriate for your symptoms.';
  } else if (readinessStatus === 'yellow' && !restDay) {
    guidance = 'Reduce volume about 25%; do not increase load.';
  } else if (readinessStatus === null && !restDay) {
    guidance = 'Check readiness before training.';
  }

  if (day.makeup?.note) guidance = guidance ? `${day.makeup.note} ${guidance}` : day.makeup.note;

  return [
    {
      id: 'morning-watch',
      title: 'Morning Watch',
      kind: 'watch',
      guidance: content.scriptureReference,
    },
    {
      id: `weekday-${day.weekday}`,
      title,
      kind: 'weekly',
      missionType: activity.missionType,
      ...(guidance ? { guidance } : {}),
    },
    { id: 'evening-watch', title: 'Evening Watch', kind: 'watch' },
  ];
}

/** Workouts in the dated order, plus the chapter's restoration as needed. */
export function getWorkoutChoices(day: ChapterDay): string[] {
  const choices = getActivityChoices(day);
  if (!choices.length) return [];
  const ids = choices.flatMap((choice) => choice.contentReferences);
  ids.push(day.program.restorationId);
  return [...new Set(ids)].filter((id) =>
    day.program.workouts.some((workout) => workout.id === id),
  );
}

export function isWorkoutPlanned(day: ChapterDay, workoutId: string): boolean {
  return getActivityChoices(day).some((choice) => choice.contentReferences.includes(workoutId));
}

/** The week's Hearth mission, falling back to its leadership mission or the chapter's first. */
export function getHearthMission(day: ChapterDay): string {
  const week = getWeekContent(day);
  return week.hearthMission ?? week.leadershipMission ?? day.program.leadership[0] ?? '';
}
