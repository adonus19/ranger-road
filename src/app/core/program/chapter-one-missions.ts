import type { LocalDate, MissionDefinition } from '../domain/models';
import { getChapterOneDay } from './campaign';
import type { ChapterDayContent } from './chapter-program';
import { getActivityChoices, getDayContent, getDayMissions } from './chapter-orders';

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
): ChapterDayContent | undefined {
  const day = getChapterOneDay(startDate, date);
  return day ? getDayContent(day) : undefined;
}

/** Chapter I's three orders for a date, without trial history. */
export function getChapterOneMissionsForDate(
  startDate: LocalDate,
  date: LocalDate,
): MissionDefinition[] {
  const day = getChapterOneDay(startDate, date);
  return day ? getDayMissions(day) : [];
}

/** Chapter I's documented choices for a date's main order, without trial history. */
export function getChapterOneActivityChoicesForDate(
  startDate: LocalDate,
  date: LocalDate,
): MissionDefinition[] {
  const day = getChapterOneDay(startDate, date);
  return day ? getActivityChoices(day) : [];
}
