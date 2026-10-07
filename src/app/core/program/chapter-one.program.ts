import type { ChapterProgram } from './chapter-program';
import { chapterOneSeed } from './chapter-one.seed';
import { chapterOneDailySeed, chapterOneGateTrialAttempt } from './chapter-one-daily.seed';
import {
  chapterOneForgeA,
  chapterOneForgeB,
  chapterOneRestoration,
  chapterOneWeekFourVolumeGuide,
  chapterOneWorkoutWeekNote,
} from './chapter-one-workouts';

/** Chapter I, The Muster: 01_THE_MUSTER.md as dated orders, workouts, and the Gate Trial. */
export const chapterOneProgram: ChapterProgram = {
  ...chapterOneSeed,
  trialName: 'Gate Trial',
  trialRoute: '/road/gate-trial',
  leadsIn: true,
  weeks: chapterOneDailySeed,
  trialAttempt: chapterOneGateTrialAttempt,
  workouts: [chapterOneForgeA, chapterOneForgeB, chapterOneRestoration],
  restorationId: chapterOneRestoration.id,
  workoutPlan: (workoutId, week) => {
    const note = chapterOneWorkoutWeekNote(workoutId, week);
    const volumeGuide = chapterOneWeekFourVolumeGuide(workoutId, week);
    return {
      ...(note ? { note } : {}),
      ...(volumeGuide ? { volumeGuide: { week, ...volumeGuide } } : {}),
      reduced: week === 4 && workoutId !== chapterOneRestoration.id,
    };
  },
};
