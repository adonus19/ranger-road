import { describe, expect, it } from 'vitest';
import {
  chapterOneDailySeed,
  chapterOneGateTrialAttempt,
  getChapterOneDailyContent,
  getChapterOneDayContent,
} from './chapter-one-daily.seed';

/** Monday through Sunday, transcribed from 01_THE_MUSTER.md. */
const datedOrders = [
  [
    ['Proverbs 4:20–27', 'Forge A'],
    ['1 Corinthians 9:24–27', '25-minute walk'],
    ['James 1:19–25', 'Restoration'],
    ['Luke 16:10', 'Forge B'],
    ['Proverbs 16:32', '20–25-minute easy walk'],
    ['Joshua 1:6–9', '30-minute continuous walk'],
    ['Psalm 139:23–24', 'Rest and worship'],
  ],
  [
    ['Matthew 5:33–37', 'Forge A'],
    ['Colossians 3:17–24', '30-minute walk'],
    ['Proverbs 12:22', 'Restoration'],
    ['James 5:12', 'Forge B'],
    ['Psalm 15', '25-minute easy walk'],
    ['Matthew 25:14–30', '40-minute continuous walk'],
    ['Psalm 90:12–17', 'Rest and worship'],
  ],
  [
    ['Mark 10:42–45', 'Forge A'],
    ['Philippians 2:3–8', '30-minute walk with brisk intervals'],
    ['Galatians 5:13', 'Restoration and knot practice'],
    ['John 13:12–17', 'Forge B'],
    ['Romans 12:9–13', '25–30-minute easy walk'],
    ['Ecclesiastes 4:9–12', '45-minute continuous walk'],
    ['Psalm 112', 'Rest and worship'],
  ],
  [
    ['Hebrews 12:1–3', 'Forge A at reduced effort'],
    ['Proverbs 24:5', '30-minute easy walk'],
    ['Psalm 18:1–6, 29–36', 'Restoration'],
    ['Micah 6:8', 'Forge B at reduced volume'],
    ['Isaiah 40:28–31', 'Easy mobility or rest'],
    ['2 Timothy 4:7', '30-minute easy walk'],
    ['Psalm 23', 'Rest and worship'],
  ],
] as const;

describe('Chapter I daily content', () => {
  it('carries all 28 documented Scripture references and main orders', () => {
    expect(chapterOneDailySeed).toHaveLength(4);
    for (const [weekIndex, days] of datedOrders.entries()) {
      for (const [dayIndex, [scriptureReference, title]] of days.entries()) {
        expect(
          getChapterOneDailyContent(weekIndex + 1, (dayIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7),
        ).toMatchObject({ scriptureReference, activity: { title } });
      }
    }
  });

  it('keeps the distinct weekly work and Gate Trial plan', () => {
    expect(chapterOneDailySeed[0].hearthMission).toBe(chapterOneDailySeed[0].leadershipMission);
    expect(chapterOneDailySeed[0].reading).toContain('three 10-minute sessions');
    expect(chapterOneDailySeed[1].fieldcraft).toContain('Inspect axe/maul');
    expect(chapterOneDailySeed[2].fieldcraft).toContain(
      'square knot, bowline, and two half hitches',
    );
    expect(chapterOneDailySeed[2].days[6].optionalFamilyQuest).toContain('daughter');
    expect(chapterOneDailySeed[3].days[1].activity.details).toContain(
      'Deload slightly. Do not chase progression.',
    );
    expect(chapterOneDailySeed[3].days[4].activity.details).toContain('About 25% less volume.');
    expect(chapterOneDailySeed[3].days[6].activity).toMatchObject({
      missionType: 'conditioning',
      estimatedMinutes: 30,
    });
    expect(chapterOneDailySeed[3].days[6].activity.trialPreparation).toContain(
      'Monday’s Gate Trial',
    );
  });

  it('gives each attempt day after Week 4 the Gate Trial and its Scripture', () => {
    expect(chapterOneGateTrialAttempt).toMatchObject({
      scriptureReference: '2 Timothy 4:7',
      activity: { title: 'Gate Trial', missionType: 'trial', plannedTrialId: 'gate-trial' },
    });
    expect(getChapterOneDayContent(4, 1, true)).toBe(chapterOneGateTrialAttempt);
    expect(getChapterOneDayContent(4, 1)).toMatchObject({
      activity: { title: 'Forge A at reduced effort' },
    });
  });
});
