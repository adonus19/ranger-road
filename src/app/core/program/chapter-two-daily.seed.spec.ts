import { describe, expect, it } from 'vitest';
import { resolveCampaignPosition } from './campaign-position';
import {
  getActivityChoices,
  getDayMissions,
  getDayOrders,
  getWorkoutChoices,
} from './chapter-orders';
import { chapterTwoDailySeed, chapterTwoTrialAttempt } from './chapter-two-daily.seed';
import { chapterTwoProgram } from './chapter-two.program';

/** Monday through Sunday of Weeks 5–8, transcribed from 02_THE_ROAD.md. */
const datedOrders = [
  [
    ['Psalm 46:1–11', 'Forge A'],
    ['Mark 1:35–39', '30-minute continuous walk'],
    ['Psalm 62:1–8', 'Restoration'],
    ['Luke 10:38–42', 'Forge B'],
    ['Isaiah 30:15', 'Walk with brisk intervals'],
    ['Psalm 131', '45-minute continuous walk'],
    ['Matthew 6:25–34', 'Rest and worship'],
  ],
  [
    ['James 1:19–20', 'Forge A'],
    ['Proverbs 18:2, 13', '35-minute continuous walk'],
    ['Proverbs 20:5', 'Restoration'],
    ['Luke 8:4–15', 'Forge B'],
    ['Ecclesiastes 5:1–2', 'Walk with brisk intervals'],
    ['1 Samuel 3:1–10', '50–55-minute walk'],
    ['Psalm 25:4–5', 'Rest and worship'],
  ],
  [
    ['Deuteronomy 6:4–9', 'Forge A'],
    ['Psalm 127', '35-minute walk'],
    ['Ephesians 5:15–21', 'Restoration'],
    ['Colossians 3:12–17', 'Forge B'],
    ['Proverbs 17:22', 'Walk with brisk intervals'],
    ['Mark 10:13–16', '60-minute continuous walk'],
    ['Psalm 128', 'Rest and worship'],
  ],
  [
    ['Micah 6:8', 'Forge A'],
    ['Galatians 5:22–26', '30-minute easy walk'],
    ['Psalm 119:105', 'Restoration'],
    ['Proverbs 3:5–8', 'Forge B at reduced volume'],
    ['Hebrews 10:23–25', 'Easy recovery'],
    ['Psalm 121', '30-minute easy walk'],
    ['Isaiah 40:28–31', 'Rest and worship'],
  ],
] as const;

describe('Chapter II daily content', () => {
  it('carries all 28 documented Scripture references and main orders', () => {
    expect(chapterTwoDailySeed).toHaveLength(4);
    expect(chapterTwoDailySeed.map((week) => week.name)).toEqual([
      'Be Still',
      'Listen',
      'Be Present at Home',
      'Walk Faithfully',
    ]);
    for (const [weekIndex, days] of datedOrders.entries()) {
      for (const [dayIndex, [scriptureReference, title]] of days.entries()) {
        expect(
          chapterTwoDailySeed[weekIndex].days[(dayIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7],
        ).toMatchObject({ scriptureReference, activity: { title } });
      }
    }
  });

  it('writes each Friday interval walk as plain steps', () => {
    const friday = (week: number) => chapterTwoDailySeed[week].days[5].activity;
    expect(friday(0)).toMatchObject({ estimatedMinutes: 30 });
    expect(friday(0).details).toEqual([
      '5 minutes easy, then 6 rounds of 1 minute brisk / 2 minutes easy, then an easy remainder.',
    ]);
    expect(friday(1).details).toEqual([
      '5 minutes easy, then 6 rounds of 90 seconds brisk / 2 minutes easy, then an easy cooldown.',
    ]);
    expect(friday(2).details).toEqual([
      '5 minutes easy, then 6 rounds of 2 minutes brisk / 2 minutes easy, then an easy cooldown.',
    ]);
    // Only Week 5's walk states a length; the others do not get one invented.
    expect(friday(1)).not.toHaveProperty('estimatedMinutes');
  });

  it('offers each Friday walk as an optional timer plan that matches its written steps', () => {
    const plans = [0, 1, 2].map((week) => chapterTwoDailySeed[week].days[5].activity.intervals);
    expect(plans).toEqual([
      { warmupMinutes: 5, rounds: 6, briskSeconds: 60, easySeconds: 120, cooldownMinutes: 7 },
      { warmupMinutes: 5, rounds: 6, briskSeconds: 90, easySeconds: 120 },
      { warmupMinutes: 5, rounds: 6, briskSeconds: 120, easySeconds: 120 },
    ]);
    expect(chapterTwoDailySeed[3].days[5].activity.intervals).toBeUndefined();
    // The mission carries the plan; a Red day's restoration alternative never does.
    const friday = resolveCampaignPosition('2026-10-05', '2026-11-06', [
      { trialId: 'gate-trial', date: '2026-11-02' },
    ])!.chapter;
    expect(getDayMissions(friday)[1].intervals?.briskSeconds).toBe(60);
  });

  it('keeps the weekly missions, reflections, reading, and Week 8 trial preparation', () => {
    expect(chapterTwoDailySeed[0].days[3].readingMinutes).toBe(10);
    expect(chapterTwoDailySeed[0].days[7].reflectionPrompt).toBe(
      'What am I constantly hurrying toward?',
    );
    expect(chapterTwoDailySeed[1].leadershipMission).toContain('listening, thinking together');
    expect(chapterTwoDailySeed[2].hearthMission).toBe('One full hour at home with phone put away.');
    expect(chapterTwoDailySeed[3].days[1].activity.details).toEqual([
      'No aggressive progression: the written sets and reps, with no load increases.',
    ]);
    expect(chapterTwoDailySeed[3].days[4].activity.details).toEqual(['About 25% less volume.']);
    expect(chapterTwoDailySeed[3].days[6].activity).toMatchObject({
      missionType: 'conditioning',
      estimatedMinutes: 30,
    });
    expect(chapterTwoDailySeed[3].days[6].activity.trialPreparation).toBe(
      'Then prepare for Monday’s Three-Mile Trial: choose the 3-mile route, set out the 30-lb suitcase carry weight, and find three flights of stairs.',
    );
    expect(chapterTwoDailySeed[3].days[7].reflectionPrompt).toBe(
      'Where has consistent small effort begun changing me?',
    );
  });

  it('gives each attempt day the Three-Mile Trial and Psalm 121', () => {
    expect(chapterTwoTrialAttempt).toMatchObject({
      scriptureReference: 'Psalm 121',
      activity: {
        title: 'Three-Mile Trial',
        missionType: 'trial',
        plannedTrialId: 'three-mile-trial',
      },
    });
    expect(chapterTwoProgram.trial.id).toBe(chapterTwoProgram.chapter.trialId);
  });
});

describe('Chapter II dated missions', () => {
  // The Gate Trial passed on Monday Nov 2, so Chapter II's Week 5 began that Monday.
  const gate = [{ trialId: 'gate-trial', date: '2026-11-02' }];
  const on = (date: string) => resolveCampaignPosition('2026-10-05', date, gate)!.chapter;

  it('begins on Tuesday with Week 5 and uses chapter and week in mission IDs', () => {
    const tuesday = getDayMissions(on('2026-11-03'));
    expect(tuesday.map((mission) => mission.id)).toEqual([
      'chapter-2-week-5-day-2-morning-watch',
      'chapter-2-week-5-day-2-weekly',
      'chapter-2-week-5-day-2-evening-watch',
    ]);
    expect(tuesday[1]).toMatchObject({
      chapterId: 'chapter-2',
      week: 5,
      day: 2,
      title: '30-minute continuous walk',
      estimatedMinutes: 30,
    });
    expect(tuesday[0].scriptureReference).toBe('Mark 1:35–39');
  });

  it('opens Chapter II’s Forge sessions, with restoration as needed', () => {
    expect(getWorkoutChoices(on('2026-11-05'))).toEqual([
      'chapter-2-forge-b',
      'chapter-2-restoration',
    ]);
    expect(getWorkoutChoices(on('2026-11-03'))).toEqual(['chapter-2-restoration']);
    expect(getActivityChoices(on('2026-11-04')).map((choice) => choice.contentReferences)).toEqual([
      ['chapter-2-restoration'],
    ]);
    const wednesday = getDayMissions(on('2026-11-04'))[1];
    expect(wednesday).toMatchObject({ readingMinutes: 10 });
    expect(wednesday).not.toHaveProperty('readingBookTitle');
  });

  it('shows the documented orders on Yellow and Red', () => {
    const friday = on('2026-11-06');
    expect(getDayOrders(friday, 'green')[1]).toMatchObject({
      title: 'Walk with brisk intervals',
      guidance: expect.stringContaining('6 rounds of 1 minute brisk / 2 minutes easy'),
    });
    expect(getDayOrders(friday, 'yellow')[1].guidance).toBe(
      'Reduce volume about 25%; do not increase load.',
    );
    expect(getDayOrders(friday, 'red')[1].title).toBe(
      'Restoration or easy movement, if appropriate',
    );
  });

  it('prepares for the Three-Mile Trial on Week 8 Saturday, then holds attempts on Monday and Thursday', () => {
    // A Gate Trial pass on Nov 2 makes Week 5 begin that Monday, so Week 8 is Nov 23–29.
    const saturday = getDayMissions(on('2026-11-28'));
    expect(saturday[0].scriptureReference).toBe('Psalm 121');
    expect(saturday[1]).toMatchObject({ week: 8, day: 6, title: '30-minute easy walk' });
    expect(saturday[1].trialPreparation).toContain('choose the 3-mile route');
    expect(saturday[1].plannedTrialId).toBeUndefined();

    const monday = getDayMissions(on('2026-11-30'));
    expect(monday[1]).toMatchObject({
      id: 'chapter-2-three-mile-trial-attempt-day-1-weekly',
      title: 'Three-Mile Trial',
      missionType: 'trial',
      plannedTrialId: 'three-mile-trial',
    });
    expect(getDayOrders(on('2026-11-30'), 'yellow')[1].title).toBe(
      'Three-Mile Trial waits for Green',
    );
    // Between attempts, Week 8's easy days repeat with their own IDs.
    expect(getDayMissions(on('2026-12-01'))[1]).toMatchObject({
      id: 'chapter-2-week-8-day-2-weekly',
      title: '30-minute easy walk',
    });
    expect(getDayMissions(on('2026-12-03'))[1].title).toBe('Three-Mile Trial');
  });
});
