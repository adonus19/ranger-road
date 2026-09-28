import type { MissionType } from '../domain/models';
import type { Weekday } from './chapter-one.seed';

/** The day-by-day Chapter I orders in 01_THE_MUSTER.md. */
export interface ChapterOneActivityContent {
  title: string;
  missionType: MissionType;
  estimatedMinutes?: number;
  details?: readonly string[];
  /** A definition or guide whose prescription supplies the full activity. */
  definitionId?: string;
  /** A target in the manual, never an automatic trial completion. */
  plannedTrialId?: string;
}

export interface ChapterOneDayContent {
  scriptureReference: string;
  activity: ChapterOneActivityContent;
  readingMinutes?: number;
  reflectionPrompt?: string;
  optionalFamilyQuest?: string;
}

export interface ChapterOneWeekContent {
  name: string;
  days: Record<Weekday, ChapterOneDayContent>;
  leadershipMission?: string;
  hearthMission?: string;
  reading?: string;
  readingBookTitle?: string;
  fieldcraft?: string;
}

/**
 * Any start outside Monday uses the remaining weekdays through Sunday as a
 * short lead-in with Week 1 content. Then Weeks 1–4 each run Monday–Sunday.
 * Week 4 remains available after the planning target while the trial is pending.
 */
export const chapterOneDailySeed: readonly ChapterOneWeekContent[] = [
  {
    name: 'The Call',
    days: {
      1: {
        scriptureReference: 'Proverbs 4:20–27',
        activity: { title: 'Forge A', missionType: 'strength', definitionId: 'chapter-1-forge-a' },
        reflectionPrompt: 'What requires my attention today?',
      },
      2: {
        scriptureReference: '1 Corinthians 9:24–27',
        activity: { title: '25-minute walk', missionType: 'conditioning', estimatedMinutes: 25 },
      },
      3: {
        scriptureReference: 'James 1:19–25',
        activity: {
          title: 'Restoration',
          missionType: 'restoration',
          definitionId: 'chapter-1-restoration',
        },
        readingMinutes: 10,
      },
      4: {
        scriptureReference: 'Luke 16:10',
        activity: { title: 'Forge B', missionType: 'strength', definitionId: 'chapter-1-forge-b' },
      },
      5: {
        scriptureReference: 'Proverbs 16:32',
        activity: {
          title: '20–25-minute easy walk',
          missionType: 'conditioning',
        },
        readingMinutes: 10,
      },
      6: {
        scriptureReference: 'Joshua 1:6–9',
        activity: {
          title: '30-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 30,
        },
        readingMinutes: 10,
      },
      7: {
        scriptureReference: 'Psalm 139:23–24',
        activity: { title: 'Rest and worship', missionType: 'reflection' },
        reflectionPrompt: 'Where am I allowing comfort to make decisions for me?',
      },
    },
    leadershipMission:
      'Ask spouse what one thing would genuinely make this week easier; take ownership of it.',
    hearthMission:
      'Ask spouse what one thing would genuinely make this week easier; take ownership of it.',
    reading: 'Begin Habits of the Household; three 10-minute sessions.',
    readingBookTitle: 'Habits of the Household',
  },
  {
    name: 'Keep Your Word',
    days: {
      1: {
        scriptureReference: 'Matthew 5:33–37',
        activity: {
          title: 'Forge A',
          missionType: 'strength',
          definitionId: 'chapter-1-forge-a',
          details: ['Progress only if Week 1 was clean.'],
        },
      },
      2: {
        scriptureReference: 'Colossians 3:17–24',
        activity: { title: '30-minute walk', missionType: 'conditioning', estimatedMinutes: 30 },
      },
      3: {
        scriptureReference: 'Proverbs 12:22',
        activity: {
          title: 'Restoration',
          missionType: 'restoration',
          definitionId: 'chapter-1-restoration',
        },
        readingMinutes: 10,
      },
      4: {
        scriptureReference: 'James 5:12',
        activity: { title: 'Forge B', missionType: 'strength', definitionId: 'chapter-1-forge-b' },
      },
      5: {
        scriptureReference: 'Psalm 15',
        activity: {
          title: '25-minute easy walk',
          missionType: 'conditioning',
          estimatedMinutes: 25,
        },
        readingMinutes: 10,
      },
      6: {
        scriptureReference: 'Matthew 25:14–30',
        activity: {
          title: '40-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 40,
          details: ['Fieldcraft practice.'],
        },
      },
      7: {
        scriptureReference: 'Psalm 90:12–17',
        activity: { title: 'Rest and worship', missionType: 'reflection' },
        reflectionPrompt:
          'What promises do I casually make that others have learned not to rely upon?',
      },
    },
    leadershipMission:
      'Choose one recurring household responsibility and completely own it this week.',
    fieldcraft:
      'Inspect axe/maul, pickaxe, and commonly used tools. Learn safe storage, handle/head inspection, damage recognition, and edge maintenance.',
  },
  {
    name: 'Strength in Service',
    days: {
      1: {
        scriptureReference: 'Mark 10:42–45',
        activity: { title: 'Forge A', missionType: 'strength', definitionId: 'chapter-1-forge-a' },
      },
      2: {
        scriptureReference: 'Philippians 2:3–8',
        activity: {
          title: '30-minute walk with brisk intervals',
          missionType: 'conditioning',
          estimatedMinutes: 30,
          details: ['5 rounds of 1 minute brisk / 2 minutes normal.'],
        },
      },
      3: {
        scriptureReference: 'Galatians 5:13',
        activity: {
          title: 'Restoration and knot practice',
          missionType: 'restoration',
          definitionId: 'chapter-1-restoration',
        },
      },
      4: {
        scriptureReference: 'John 13:12–17',
        activity: { title: 'Forge B', missionType: 'strength', definitionId: 'chapter-1-forge-b' },
      },
      5: {
        scriptureReference: 'Romans 12:9–13',
        activity: { title: '25–30-minute easy walk', missionType: 'conditioning' },
        readingMinutes: 10,
      },
      6: {
        scriptureReference: 'Ecclesiastes 4:9–12',
        activity: {
          title: '45-minute continuous walk',
          missionType: 'conditioning',
          estimatedMinutes: 45,
        },
        optionalFamilyQuest: '30–45-minute outdoor walk with daughter and full attention.',
      },
      7: {
        scriptureReference: 'Psalm 112',
        activity: { title: 'Rest and worship', missionType: 'reflection' },
        reflectionPrompt: 'Does my family experience my strength primarily as service or control?',
      },
    },
    leadershipMission: 'Complete one meaningful household act before being asked.',
    fieldcraft: 'Learn and practice square knot, bowline, and two half hitches.',
  },
  {
    name: 'Stand at the Gate',
    days: {
      1: {
        scriptureReference: 'Hebrews 12:1–3',
        activity: {
          title: 'Forge A at reduced effort',
          missionType: 'strength',
          definitionId: 'chapter-1-forge-a',
          details: ['Deload slightly. Do not chase progression.'],
        },
      },
      2: {
        scriptureReference: 'Proverbs 24:5',
        activity: {
          title: '30-minute easy walk',
          missionType: 'conditioning',
          estimatedMinutes: 30,
        },
      },
      3: {
        scriptureReference: 'Psalm 18:1–6, 29–36',
        activity: {
          title: 'Restoration',
          missionType: 'restoration',
          definitionId: 'chapter-1-restoration',
        },
      },
      4: {
        scriptureReference: 'Micah 6:8',
        activity: {
          title: 'Forge B at reduced volume',
          missionType: 'strength',
          definitionId: 'chapter-1-forge-b',
          details: ['About 25% less volume.'],
        },
      },
      5: {
        scriptureReference: 'Isaiah 40:28–31',
        activity: { title: 'Easy mobility or rest', missionType: 'restoration' },
      },
      6: {
        scriptureReference: '2 Timothy 4:7',
        activity: {
          title: 'Gate Trial',
          missionType: 'trial',
          plannedTrialId: 'gate-trial',
          details: ['Record the trial through its dedicated flow when Green and ready.'],
        },
      },
      7: {
        scriptureReference: 'Psalm 23',
        activity: { title: 'Rest and worship', missionType: 'reflection' },
      },
    },
    leadershipMission: 'Plan one simple family activity and handle logistics.',
  },
];

export function getChapterOneDailyContent(week: number, day: Weekday): ChapterOneDayContent {
  const content = chapterOneDailySeed[week - 1]?.days[day];
  if (!content) throw new RangeError(`No Chapter I content for week ${week}, day ${day}.`);
  return content;
}

export function getChapterOneWeekContent(week: number): ChapterOneWeekContent {
  const content = chapterOneDailySeed[week - 1];
  if (!content) throw new RangeError(`No Chapter I content for week ${week}.`);
  return content;
}

export function chapterOneContentId(week: number, day: Weekday, kind: string): string {
  return `chapter-1-content-v1-week-${week}-day-${day}-${kind}`;
}
