import { formatIntervalLength } from './interval-plan';
import type { ChapterActivityContent, ChapterWeekContent } from './chapter-program';
import {
  chapterThreeForgeA,
  chapterThreeForgeB,
  chapterThreeRestoration,
} from './chapter-three-workouts';

const STEP_DOWNS = 'slow step-downs, 2 × 6 per leg';

/**
 * Tuesday's climb: bodyweight step-ups as plain steps, with an optional timer. 5 minutes easy
 * walking first, then the intervals, then 5 minutes easy plus the step-down finisher, which
 * stays in Week 12. On a Red day the Restoration routine takes its place.
 */
function climb(rounds: number, stepUpSeconds: number, reduced = false): ChapterActivityContent {
  const easySeconds = 120;
  return {
    title: reduced ? 'Reduced climb conditioning' : 'Climb conditioning',
    missionType: 'conditioning',
    details: [
      'Bodyweight step-ups on the Forge box or on stairs.',
      `5 minutes easy walking, then ${rounds} rounds of ${formatIntervalLength(stepUpSeconds)} step-ups / ${formatIntervalLength(easySeconds)} easy walking.`,
      `Then 5 minutes easy walking, and the finisher: ${STEP_DOWNS}.`,
    ],
    intervals: {
      warmupMinutes: 5,
      rounds,
      briskSeconds: stepUpSeconds,
      easySeconds,
      cooldownMinutes: 5,
      workLabel: 'Step-ups',
      finisher: `Finish with the ${STEP_DOWNS}.`,
    },
    exerciseGuideIds: ['step-up', 'slow-step-down'],
    redDayOrder: {
      title: 'Restoration in place of the climb',
      guidance: 'No step-ups today. Do the Restoration routine instead, if appropriate.',
    },
  };
}

const forgeA = {
  title: 'Forge A',
  missionType: 'strength',
  definitionId: chapterThreeForgeA.id,
} as const;
const forgeB = {
  title: 'Forge B',
  missionType: 'strength',
  definitionId: chapterThreeForgeB.id,
} as const;
const restoration = {
  title: 'Restoration',
  missionType: 'restoration',
  definitionId: chapterThreeRestoration.id,
} as const;
const easyRoad: ChapterActivityContent = {
  title: '25–30-minute easy road walk',
  missionType: 'conditioning',
};
const restDay = { title: 'Rest and worship', missionType: 'reflection' } as const;

/**
 * Chapter III's dated orders, from 03_THE_HIGH_COUNTRY.md. Chapter III starts the day after a
 * Monday pass of the Three-Mile Trial, or the Monday after any other pass. After Week 12 every
 * day repeats Week 12 until the High Country Trial is passed; the trial can be taken any day.
 * Hearth missions and the Week 11 field card are wired with the Field Manual (ticket 05).
 */
export const chapterThreeDailySeed: readonly ChapterWeekContent[] = [
  {
    name: 'Perseverance',
    days: {
      1: { scriptureReference: 'Romans 5:1–5', activity: forgeA },
      2: { scriptureReference: 'James 1:2–4', activity: climb(6, 60) },
      3: {
        scriptureReference: 'Hebrews 10:35–39',
        activity: {
          ...restoration,
          details: ['Restoration II as written, plus one extra round of ankle rock.'],
        },
        readingMinutes: 10,
      },
      4: { scriptureReference: 'Galatians 6:7–10', activity: forgeB },
      5: { scriptureReference: 'Psalm 37:3–7', activity: easyRoad },
      6: {
        scriptureReference: 'Hebrews 12:1–3',
        activity: {
          title: '60-minute mixed-surface walk',
          missionType: 'conditioning',
          estimatedMinutes: 60,
        },
      },
      7: {
        scriptureReference: 'Psalm 27',
        activity: restDay,
        reflectionPrompt: 'Where do I tend to quit when progress becomes slow?',
      },
    },
  },
  {
    name: 'Courage',
    days: {
      1: { scriptureReference: 'Joshua 1:6–9', activity: forgeA },
      2: { scriptureReference: 'Psalm 56:1–4', activity: climb(7, 90) },
      3: { scriptureReference: '2 Timothy 1:6–7', activity: restoration, readingMinutes: 10 },
      4: { scriptureReference: 'Psalm 27:1–5', activity: forgeB },
      5: { scriptureReference: 'John 16:33', activity: easyRoad },
      6: {
        scriptureReference: 'Isaiah 41:8–10',
        activity: {
          title: '60–70-minute walk',
          missionType: 'conditioning',
          details: ['Include stairs or step-ups.'],
        },
      },
      7: {
        scriptureReference: 'Psalm 112',
        activity: restDay,
        // Approved with the Field Manual drafts (session 2, 2026-11-09).
        reflectionPrompt:
          'What did I fear would happen in the conversation I’d been avoiding, and what happened? If it hasn’t happened yet, what’s still in the way?',
      },
    },
  },
  {
    name: 'Humility',
    days: {
      1: { scriptureReference: 'Philippians 2:1–8', activity: forgeA },
      2: { scriptureReference: 'Proverbs 11:2', activity: climb(6, 120) },
      3: { scriptureReference: 'James 4:6–10', activity: restoration, readingMinutes: 10 },
      4: { scriptureReference: 'Micah 6:8', activity: forgeB },
      5: { scriptureReference: 'Romans 12:3–10', activity: easyRoad },
      6: {
        scriptureReference: '1 Peter 5:5–7',
        activity: {
          title: '60–90-minute local trail rehearsal',
          missionType: 'conditioning',
          fieldcraftPractice: true,
        },
        optionalFamilyQuest:
          'On the rehearsal, let your daughter help navigate a marked trail and own one simple navigation responsibility.',
      },
      7: {
        scriptureReference: 'Psalm 25',
        activity: restDay,
        reflectionPrompt: 'Where am I more concerned with being right than being useful?',
      },
    },
    fieldcraft:
      'Navigation II field mission: before the rehearsal, study the trail map and predict the elevation gain and where the turnaround point would be; check afterward.',
  },
  {
    name: 'The Climb',
    days: {
      1: {
        scriptureReference: 'Psalm 121',
        activity: {
          ...forgeA,
          title: 'Forge A at reduced volume',
          details: ['About 25% less volume, with no load increases.'],
        },
      },
      2: { scriptureReference: 'Isaiah 40:28–31', activity: climb(4, 90, true) },
      3: { scriptureReference: 'Psalm 18:29–36', activity: restoration, readingMinutes: 10 },
      4: {
        scriptureReference: 'Habakkuk 3:17–19',
        activity: {
          ...forgeB,
          title: 'Forge B at reduced volume',
          details: ['About 25% less volume, with no load increases.'],
        },
      },
      5: {
        scriptureReference: 'Hebrews 12:1–3',
        activity: {
          title: '20-minute easy walk',
          missionType: 'conditioning',
          estimatedMinutes: 20,
          details: ['Recovery: an easy walk or Restoration, your choice.'],
          alternatives: [
            {
              idSuffix: 'restoration',
              title: 'Restoration',
              missionType: 'restoration',
              contentReferences: [chapterThreeRestoration.id],
            },
          ],
        },
      },
      6: {
        scriptureReference: 'Psalm 24',
        activity: {
          title: 'Easy walk',
          missionType: 'conditioning',
          trialPreparation:
            'Then prepare for the High Country Trial: choose the trail, check the forecast, and pack.',
        },
      },
      7: {
        scriptureReference: 'Psalm 46',
        activity: restDay,
        reflectionPrompt: 'What am I climbing toward that is actually worth reaching?',
      },
    },
  },
];
