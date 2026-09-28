import type { ChapterDefinition } from '../domain/models';
import { gateTrialDefinition } from './chapter-one-trial.seed';

export { gateTrialDefinition } from './chapter-one-trial.seed';

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A documented weekly slot. Alternatives remain open until the mission engine is built. */
export interface WeeklyMissionSlot {
  weekday: Weekday;
  title: string;
}

export const chapterOneDefinition: ChapterDefinition = {
  id: 'chapter-1',
  number: 1,
  name: 'The Muster',
  theme: 'Answer the call.',
  weeks: [1, 2, 3, 4],
  objectives: [
    'consistency',
    'baseline movement',
    'strength re-entry',
    'walking base',
    'faith rhythm',
    'responsibility',
  ],
  trialId: 'gate-trial',
};

export const chapterOneWeeklyRhythm: readonly WeeklyMissionSlot[] = [
  { weekday: 1, title: 'Forge A' },
  { weekday: 2, title: 'Road / conditioning' },
  { weekday: 3, title: 'Restoration or skill' },
  { weekday: 4, title: 'Forge B' },
  { weekday: 5, title: 'Short conditioning or restoration' },
  { weekday: 6, title: 'Quest / long road / trial preparation' },
  { weekday: 7, title: 'Rest, worship, reflection' },
];

export const chapterOneSeed = {
  chapter: chapterOneDefinition,
  trial: gateTrialDefinition,
  weeklyRhythm: chapterOneWeeklyRhythm,
  faithThemes: ['self-government', 'integrity', 'service', 'perseverance'],
  leadership: [
    'Ask your spouse what would genuinely help this week',
    'own one household responsibility',
    'practice presence',
  ],
  fieldcraft: ['tool inspection', 'basic knots'],
} as const;
