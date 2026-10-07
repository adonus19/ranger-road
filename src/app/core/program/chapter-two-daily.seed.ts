import type { ChapterDayContent, ChapterWeekContent } from './chapter-program';

/** Friday's brisk-interval walk, written as plain steps; any timer is optional. */
function intervalWalk(brisk: string, totalMinutes?: number): ChapterDayContent['activity'] {
  return {
    title: 'Walk with brisk intervals',
    missionType: 'conditioning',
    ...(totalMinutes ? { estimatedMinutes: totalMinutes } : {}),
    details: [
      `5 minutes easy, then 6 rounds of ${brisk} brisk / 2 minutes easy, then an easy ${totalMinutes ? 'remainder' : 'cooldown'}.`,
    ],
  };
}

const forgeA = {
  title: 'Forge A',
  missionType: 'strength',
  definitionId: 'chapter-2-forge-a',
} as const;
const forgeB = {
  title: 'Forge B',
  missionType: 'strength',
  definitionId: 'chapter-2-forge-b',
} as const;
const restoration = {
  title: 'Restoration',
  missionType: 'restoration',
  definitionId: 'chapter-2-restoration',
} as const;
const restDay = { title: 'Rest and worship', missionType: 'reflection' } as const;

/**
 * Chapter II's dated orders, from 02_THE_ROAD.md. Chapter II starts the day after a Monday pass
 * or the Monday after any other pass; it has no lead-in. After Week 8, Mondays and Thursdays
 * are Three-Mile Trial attempts and the other days repeat Week 8 until it is passed.
 */
export const chapterTwoDailySeed: readonly ChapterWeekContent[] = [
  {
    name: 'Be Still',
    days: {
      1: { scriptureReference: 'Psalm 46:1–11', activity: forgeA },
      2: {
        scriptureReference: 'Mark 1:35–39',
        activity: {
          title: '30-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 30,
        },
      },
      3: {
        scriptureReference: 'Psalm 62:1–8',
        activity: restoration,
        readingMinutes: 10,
      },
      4: { scriptureReference: 'Luke 10:38–42', activity: forgeB },
      5: { scriptureReference: 'Isaiah 30:15', activity: intervalWalk('1 minute', 30) },
      6: {
        scriptureReference: 'Psalm 131',
        activity: {
          title: '45-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 45,
        },
      },
      7: {
        scriptureReference: 'Matthew 6:25–34',
        activity: restDay,
        reflectionPrompt: 'What am I constantly hurrying toward?',
      },
    },
    reading: 'Three 10-minute phone-free reading sessions.',
  },
  {
    name: 'Listen',
    days: {
      1: { scriptureReference: 'James 1:19–20', activity: forgeA },
      2: {
        scriptureReference: 'Proverbs 18:2, 13',
        activity: {
          title: '35-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 35,
        },
      },
      3: { scriptureReference: 'Proverbs 20:5', activity: restoration, readingMinutes: 10 },
      4: { scriptureReference: 'Luke 8:4–15', activity: forgeB },
      5: { scriptureReference: 'Ecclesiastes 5:1–2', activity: intervalWalk('90 seconds') },
      6: {
        scriptureReference: '1 Samuel 3:1–10',
        activity: {
          title: '50–55-minute walk',
          missionType: 'conditioning',
          details: ['Trail, if practical.'],
        },
      },
      7: {
        scriptureReference: 'Psalm 25:4–5',
        activity: restDay,
        reflectionPrompt: 'What did I hear once I stopped preparing my response?',
      },
    },
    leadershipMission:
      'Ask spouse how she is doing. Ask whether she wants listening, thinking together, or action before offering solutions.',
  },
  {
    name: 'Be Present at Home',
    days: {
      1: { scriptureReference: 'Deuteronomy 6:4–9', activity: forgeA },
      2: {
        scriptureReference: 'Psalm 127',
        activity: { title: '35-minute walk', missionType: 'conditioning', estimatedMinutes: 35 },
      },
      3: { scriptureReference: 'Ephesians 5:15–21', activity: restoration },
      4: { scriptureReference: 'Colossians 3:12–17', activity: forgeB },
      5: { scriptureReference: 'Proverbs 17:22', activity: intervalWalk('2 minutes') },
      6: {
        scriptureReference: 'Mark 10:13–16',
        activity: {
          title: '60-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 60,
        },
      },
      7: { scriptureReference: 'Psalm 128', activity: restDay },
    },
    hearthMission: 'One full hour at home with phone put away.',
    leadershipMission: 'One full hour at home with phone put away.',
  },
  {
    name: 'Walk Faithfully',
    days: {
      1: {
        scriptureReference: 'Micah 6:8',
        activity: {
          ...forgeA,
          details: [
            'No aggressive progression: the written sets and reps, with no load increases.',
          ],
        },
      },
      2: {
        scriptureReference: 'Galatians 5:22–26',
        activity: {
          title: '30-minute easy walk',
          missionType: 'conditioning',
          estimatedMinutes: 30,
        },
      },
      3: { scriptureReference: 'Psalm 119:105', activity: restoration },
      4: {
        scriptureReference: 'Proverbs 3:5–8',
        activity: {
          ...forgeB,
          title: 'Forge B at reduced volume',
          details: ['About 25% less volume.'],
        },
      },
      5: {
        scriptureReference: 'Hebrews 10:23–25',
        activity: { title: 'Easy recovery', missionType: 'restoration' },
      },
      6: {
        scriptureReference: 'Psalm 121',
        activity: {
          title: '30-minute easy walk',
          missionType: 'conditioning',
          estimatedMinutes: 30,
          trialPreparation:
            'Then prepare for Monday’s Three-Mile Trial: choose the 3-mile route, set out the 30-lb suitcase carry weight, and find three flights of stairs.',
        },
      },
      7: {
        scriptureReference: 'Isaiah 40:28–31',
        activity: restDay,
        reflectionPrompt: 'Where has consistent small effort begun changing me?',
      },
    },
  },
];

/**
 * A Monday or Thursday after Week 8: the Three-Mile Trial takes that strength slot until it is
 * passed. Its Scripture, Psalm 121, is read on each attempt day.
 */
export const chapterTwoTrialAttempt: ChapterDayContent = {
  scriptureReference: 'Psalm 121',
  activity: {
    title: 'Three-Mile Trial',
    missionType: 'trial',
    plannedTrialId: 'three-mile-trial',
    details: ['Record the trial through its dedicated flow when Green and ready.'],
  },
};
