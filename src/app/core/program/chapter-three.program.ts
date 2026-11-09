import type { ChapterDefinition } from '../domain/models';
import { CUSTOM_FORGE_ID } from '../domain/workout';
import { chapterOneWeeklyRhythm } from './chapter-one.seed';
import type { ChapterProgram } from './chapter-program';
import { chapterThreeDailySeed } from './chapter-three-daily.seed';
import { highCountryTrialDefinition } from './chapter-three-trial.seed';
import {
  chapterThreeForgeA,
  chapterThreeForgeB,
  chapterThreeRestoration,
  chapterThreeVolumeGuide,
  chapterThreeWorkoutNote,
} from './chapter-three-workouts';

export const chapterThreeDefinition: ChapterDefinition = {
  id: 'chapter-3',
  number: 3,
  name: 'The High Country',
  theme: 'Climb deliberately.',
  weeks: [9, 10, 11, 12],
  objectives: [
    'prepare for real elevation',
    'step-up strength',
    'downhill control',
    'ankle/hip stability',
    'trail confidence',
  ],
  trialId: highCountryTrialDefinition.id,
};

/** Chapter III, The High Country: 03_THE_HIGH_COUNTRY.md as dated orders and workouts. */
export const chapterThreeProgram: ChapterProgram = {
  chapter: chapterThreeDefinition,
  trial: highCountryTrialDefinition,
  weeklyRhythm: chapterOneWeeklyRhythm,
  faithThemes: ['perseverance', 'courage', 'humility', 'endurance'],
  // Each week names its own Hearth mission in the daily seed (wired in ticket 05).
  leadership: [],
  fieldcraft: ['Navigation II'],
  trialName: 'High Country Trial',
  trialRoute: '/road/high-country-trial',
  trialDayNote: 'Pick a clear-weather day.',
  leadsIn: false,
  anyDayTrial: true,
  weeks: chapterThreeDailySeed,
  workouts: [chapterThreeForgeA, chapterThreeForgeB, chapterThreeRestoration],
  restorationId: chapterThreeRestoration.id,
  optionalForgeId: CUSTOM_FORGE_ID,
  // Week 12, and every day that repeats it while the trial waits, is reduced with no load increases.
  workoutPlan: (workoutId, week, weekday) => {
    const note = chapterThreeWorkoutNote(workoutId, week, weekday);
    const volumeGuide = chapterThreeVolumeGuide(workoutId, week);
    return {
      ...(note ? { note } : {}),
      ...(volumeGuide ? { volumeGuide } : {}),
      reduced: !!volumeGuide,
    };
  },
};
