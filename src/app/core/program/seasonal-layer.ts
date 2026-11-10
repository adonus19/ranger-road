import type { LocalDate } from '../domain/models';
import { addDays, getWeekday } from './calendar';

/**
 * The Advent and Christmas seasonal layer (FAITH_AND_LEADERSHIP.md, "Seasonal Layer"). A
 * calendar layer, not part of any chapter: it shows on its real dates every year, computed from
 * Christmas Day. Seed content only; nothing here is stored, and Done is a `seasonal` daily check.
 */
export type SeasonalKey =
  'advent-1' | 'advent-2' | 'advent-3' | 'advent-4' | 'christmas-eve' | 'christmas-day';

export interface SeasonalDay {
  key: SeasonalKey;
  /** Row label, e.g. "Advent 1 · Hope". */
  title: string;
  /** Scripture is kept as a reference, as everywhere in the app. */
  reference: string;
  /** Approved 2026-11-10 (FIELD_MANUAL.md, "Advent and Christmas family questions"). */
  question: string;
  /** Christmas Eve only: the family evening moved here from Week 12's Hearth part (e). */
  evening?: string;
}

const SEASONAL_DAYS: Record<SeasonalKey, Omit<SeasonalDay, 'key'>> = {
  'advent-1': {
    title: 'Advent 1 · Hope',
    reference: 'Isaiah 9:2–7',
    question:
      'The child in this reading is given four names. Which one means the most to you right now, and why?',
  },
  'advent-2': {
    title: 'Advent 2 · Peace',
    reference: 'Isaiah 40:1–11',
    question: 'God is pictured as a shepherd carrying the lambs close. When have you felt carried?',
  },
  'advent-3': {
    title: 'Advent 3 · Joy',
    reference: 'Luke 1:46–55',
    question:
      'Mary lists what God has done. What has God done for our family this year that we can thank him for?',
  },
  'advent-4': {
    title: 'Advent 4 · Love',
    reference: 'Matthew 1:18–25',
    question:
      'Joseph did the hard, right thing quietly. What is one quiet way we can love someone this week?',
  },
  'christmas-eve': {
    title: 'Christmas Eve',
    reference: 'Luke 2:1–20',
    question:
      'The shepherds hurried to see, then told everyone. If you had been there, what would you have told people first?',
    evening: 'One unhurried, phone-free family evening.',
  },
  'christmas-day': {
    title: 'Christmas Day',
    reference: 'John 1:1–14',
    question:
      'John says the light came into the world and the darkness could not put it out. Where do we need that light in our home this year?',
  },
};

/** The seasonal dates for one year: Advent 4 is the last Sunday before Christmas Day. */
function seasonalDates(year: string): Array<[LocalDate, SeasonalKey]> {
  const christmas = `${year}-12-25`;
  const advent4 = addDays(christmas, -(getWeekday(christmas) % 7 || 7));
  return [
    [addDays(advent4, -21), 'advent-1'],
    [addDays(advent4, -14), 'advent-2'],
    [addDays(advent4, -7), 'advent-3'],
    [advent4, 'advent-4'],
    [`${year}-12-24`, 'christmas-eve'],
    [christmas, 'christmas-day'],
  ];
}

/** Today's seasonal readings, in calendar order: none on most days, two when Advent 4 is Dec 24. */
export function getSeasonalDays(date: LocalDate): SeasonalDay[] {
  return seasonalDates(date.slice(0, 4))
    .filter(([day]) => day === date)
    .map(([, key]) => ({ key, ...SEASONAL_DAYS[key] }));
}
