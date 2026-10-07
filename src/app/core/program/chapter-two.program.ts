import type { ChapterDefinition } from '../domain/models';
import { chapterOneWeeklyRhythm } from './chapter-one.seed';
import type { ChapterProgram } from './chapter-program';
import { chapterTwoDailySeed, chapterTwoTrialAttempt } from './chapter-two-daily.seed';
import { threeMileTrialDefinition } from './chapter-two-trial.seed';
import {
  chapterTwoForgeA,
  chapterTwoForgeB,
  chapterTwoRestoration,
  chapterTwoWeekEightVolumeGuide,
  chapterTwoWorkoutWeekNote,
} from './chapter-two-workouts';

export const chapterTwoDefinition: ChapterDefinition = {
  id: 'chapter-2',
  number: 2,
  name: 'The Road',
  theme: 'Build the engine.',
  weeks: [5, 6, 7, 8],
  objectives: [
    '3-mile comfort',
    'aerobic base',
    'reduced breathlessness',
    'attention and presence',
  ],
  trialId: threeMileTrialDefinition.id,
};

/** Chapter II, The Road: 02_THE_ROAD.md as dated orders, workouts, and the Three-Mile Trial. */
export const chapterTwoProgram: ChapterProgram = {
  chapter: chapterTwoDefinition,
  trial: threeMileTrialDefinition,
  weeklyRhythm: chapterOneWeeklyRhythm,
  faithThemes: ['stillness', 'listening', 'presence', 'faithfulness'],
  // Weeks 5 and 8 name no leadership mission, so Keep shows no Hearth row on those weeks.
  leadership: [],
  fieldcraft: ['Navigation I'],
  trialName: 'Three-Mile Trial',
  trialRoute: '/road/three-mile-trial',
  leadsIn: false,
  weeks: chapterTwoDailySeed,
  trialAttempt: chapterTwoTrialAttempt,
  workouts: [chapterTwoForgeA, chapterTwoForgeB, chapterTwoRestoration],
  restorationId: chapterTwoRestoration.id,
  workoutPlan: (workoutId, week) => {
    const note = chapterTwoWorkoutWeekNote(workoutId, week);
    const volumeGuide = chapterTwoWeekEightVolumeGuide(workoutId, week);
    return {
      ...(note ? { note } : {}),
      ...(volumeGuide ? { volumeGuide } : {}),
      reduced: week === 8 && workoutId === chapterTwoForgeB.id,
    };
  },
};
