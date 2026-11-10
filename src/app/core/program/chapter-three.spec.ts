import { describe, expect, it } from 'vitest';
import { getDaysUntil } from './campaign';
import { getNextAttempt, isTrialAvailable, resolveCampaignPosition } from './campaign-position';
import {
  getActivityChoices,
  getDayContent,
  getDayMissions,
  getDayOrders,
  getHearthMission,
  getHearthMissionParts,
  getWorkoutChoices,
} from './chapter-orders';
import { chapterThreeDailySeed } from './chapter-three-daily.seed';
import { withMakeup } from './makeup-schedule';
import { chapterThreeProgram } from './chapter-three.program';
import {
  chapterThreeForgeA,
  chapterThreeForgeB,
  chapterThreeRestoration,
} from './chapter-three-workouts';
import { chapterTwoRestoration } from './chapter-two-workouts';
import { getTrialScripture } from './field-manual';

// Day 1 Mon Oct 5; Gate Trial passed Mon Nov 2; Three-Mile Trial passed Mon Nov 30, so Chapter
// III begins Tue Dec 1 and Week 9 counts from that Monday. Week 12 is Dec 21–27.
const start = '2026-10-05';
const passes = [
  { trialId: 'gate-trial', date: '2026-11-02' },
  { trialId: 'three-mile-trial', date: '2026-11-30' },
];
const at = (date: string, trials = passes) => resolveCampaignPosition(start, date, trials)!.chapter;

/** Monday through Sunday of Weeks 9–12, transcribed from 03_THE_HIGH_COUNTRY.md. */
const datedOrders = [
  [
    ['Romans 5:1–5', 'Forge A'],
    ['James 1:2–4', 'Climb conditioning'],
    ['Hebrews 10:35–39', 'Restoration'],
    ['Galatians 6:7–10', 'Forge B'],
    ['Psalm 37:3–7', '25–30-minute easy road walk'],
    ['Hebrews 12:1–3', '60-minute mixed-surface walk'],
    ['Psalm 27', 'Rest and worship'],
  ],
  [
    ['Joshua 1:6–9', 'Forge A'],
    ['Psalm 56:1–4', 'Climb conditioning'],
    ['2 Timothy 1:6–7', 'Restoration'],
    ['Psalm 27:1–5', 'Forge B'],
    ['John 16:33', '25–30-minute easy road walk'],
    ['Isaiah 41:8–10', '60–70-minute walk'],
    ['Psalm 112', 'Rest and worship'],
  ],
  [
    ['Philippians 2:1–8', 'Forge A'],
    ['Proverbs 11:2', 'Climb conditioning'],
    ['James 4:6–10', 'Restoration'],
    ['Micah 6:8', 'Forge B'],
    ['Romans 12:3–10', '25–30-minute easy road walk'],
    ['1 Peter 5:5–7', '60–90-minute local trail rehearsal'],
    ['Psalm 25', 'Rest and worship'],
  ],
  [
    ['Psalm 121', 'Forge A at reduced volume'],
    ['Isaiah 40:28–31', 'Reduced climb conditioning'],
    ['Psalm 18:29–36', 'Restoration'],
    ['Habakkuk 3:17–19', 'Forge B at reduced volume'],
    ['Hebrews 12:1–3', '20-minute easy walk'],
    ['Psalm 24', 'Easy walk'],
    ['Psalm 46', 'Rest and worship'],
  ],
] as const;

describe('Chapter III dated orders', () => {
  it('carries all 28 documented Scripture references and main orders', () => {
    expect(chapterThreeDailySeed.map((week) => week.name)).toEqual([
      'Perseverance',
      'Courage',
      'Humility',
      'The Climb',
    ]);
    for (const [weekIndex, days] of datedOrders.entries()) {
      for (const [dayIndex, [scriptureReference, title]] of days.entries()) {
        expect(
          chapterThreeDailySeed[weekIndex].days[(dayIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7],
        ).toMatchObject({ scriptureReference, activity: { title } });
      }
    }
  });

  it('follows the Three-Mile Trial pass with Week 9, under chapter-3 mission IDs', () => {
    expect(at('2026-11-30').program.chapter.id).toBe('chapter-2');
    const tuesday = at('2026-12-01');
    expect(tuesday).toMatchObject({ week: 9, weekday: 2, attemptDay: false });
    expect(tuesday.program.chapter.id).toBe('chapter-3');
    expect(getDayMissions(tuesday).map((mission) => mission.id)).toEqual([
      'chapter-3-week-9-day-2-morning-watch',
      'chapter-3-week-9-day-2-weekly',
      'chapter-3-week-9-day-2-evening-watch',
    ]);
    expect(getDayMissions(at('2026-12-07'))[1]).toMatchObject({
      id: 'chapter-3-week-10-day-1-weekly',
      contentReferences: ['chapter-3-forge-a'],
    });
  });

  it('writes the Tuesday climb as steps with an optional timer and the step-down finisher', () => {
    const climb = getDayMissions(at('2026-12-01'))[1];
    expect(climb.activityDetails).toEqual([
      'Bodyweight step-ups on the Forge box or on stairs.',
      '5 minutes easy walking, then 6 rounds of 1 minute step-ups / 2 minutes easy walking.',
      'Then 5 minutes easy walking, and the finisher: slow step-downs, 2 × 6 per leg.',
    ]);
    expect(climb.intervals).toEqual({
      warmupMinutes: 5,
      rounds: 6,
      briskSeconds: 60,
      easySeconds: 120,
      cooldownMinutes: 5,
      workLabel: 'Step-ups',
      finisher: 'Finish with the slow step-downs, 2 × 6 per leg.',
    });
    expect(climb.exerciseGuideIds).toEqual(['step-up', 'slow-step-down']);
    const plans = [9, 10, 11, 12].map((week) => {
      const plan = chapterThreeDailySeed[week - 9].days[2].activity.intervals!;
      return [plan.rounds, plan.briskSeconds, plan.easySeconds];
    });
    expect(plans).toEqual([
      [6, 60, 120],
      [7, 90, 120],
      [6, 120, 120],
      [4, 90, 120],
    ]);
    // Week 12 keeps the finisher.
    expect(chapterThreeDailySeed[3].days[2].activity.details?.at(-1)).toContain('step-downs');
  });

  it('shows Restoration in place of the climb on a Red day', () => {
    const order = getDayOrders(at('2026-12-01'), 'red').find((item) => item.kind === 'weekly');
    expect(order).toMatchObject({ title: 'Restoration in place of the climb' });
    expect(getWorkoutChoices(at('2026-12-01'))).toEqual(['chapter-3-restoration']);
  });

  it('gives Week 9 Wednesday an extra round of ankle rock, with 10 minutes of reading every Wednesday', () => {
    const wednesday = getDayMissions(at('2026-12-02'))[1];
    expect(wednesday.activityDetails).toEqual([
      'Restoration II as written, plus one extra round of ankle rock.',
    ]);
    const plan = chapterThreeProgram.workoutPlan;
    expect(plan('chapter-3-restoration', 9, 3).note).toBe(
      'Add one extra round of ankle rock today.',
    );
    expect(plan('chapter-3-restoration', 9, 2).note).toBeUndefined();
    expect(plan('chapter-3-restoration', 10, 3).note).toBeUndefined();
    expect(chapterThreeDailySeed.map((week) => week.days[3].readingMinutes)).toEqual([
      10, 10, 10, 10,
    ]);
  });

  it('puts the Navigation II field mission and daughter quest on Week 11’s rehearsal', () => {
    const saturday = getDayMissions(at('2026-12-19'))[1];
    expect(saturday.activityDetails).toEqual([
      'Navigation II field mission: before the rehearsal, study the trail map and predict the elevation gain and where the turnaround point would be; check afterward.',
    ]);
    expect(saturday.optionalFamilyQuest).toContain('help navigate a marked trail');
  });

  it('keeps the field mission with Week 11’s Saturday when a missed Forge B moves onto it', () => {
    // Thursday Dec 17's Forge B was not saved, so it leads Saturday Dec 19.
    const resolve = (date: string) => at(date);
    const saturday = withMakeup(at('2026-12-19'), '2026-12-19', '2026-12-19', resolve, {
      records: [],
      sessions: [],
      redDates: new Set(),
    });
    const [forge] = getActivityChoices(saturday);
    expect(forge.title).toBe('Forge B');
    expect(forge.activityDetails).toContain(
      'Navigation II field mission: before the rehearsal, study the trail map and predict the elevation gain and where the turnaround point would be; check afterward.',
    );
    expect(forge.optionalFamilyQuest).toContain('help navigate a marked trail');
  });

  it('offers Week 12 Friday as an easy walk or Restoration, and Saturday as trial preparation', () => {
    const friday = getActivityChoices(at('2026-12-25'));
    expect(friday.map((choice) => [choice.id, choice.title])).toEqual([
      ['chapter-3-week-12-day-5-weekly', '20-minute easy walk'],
      ['chapter-3-week-12-day-5-weekly-restoration', 'Restoration'],
    ]);
    expect(friday[1].contentReferences).toEqual(['chapter-3-restoration']);
    expect(getDayMissions(at('2026-12-26'))[1].trialPreparation).toBe(
      'Then prepare for the High Country Trial: choose the trail, check the forecast, and pack.',
    );
    expect(getDayMissions(at('2026-12-27'))[2].reflectionPrompt).toBe(
      'What am I climbing toward that is actually worth reaching?',
    );
  });
});

describe('Chapter III Forges', () => {
  const dose = (workout: typeof chapterThreeForgeA) =>
    workout.exercises.map((item) => [
      item.exerciseId,
      item.sets,
      item.reps ?? `${item.durationSeconds} sec`,
      item.perSide ?? false,
    ]);

  it('match the pack, with the box squat cue and the heavier overhead carry', () => {
    expect(dose(chapterThreeForgeA)).toEqual([
      ['box-squat', 3, 6, false],
      ['bench-press', 3, 6, false],
      ['assisted-pull-up', 3, '6–8', false],
      ['step-up', 3, 8, true],
      ['seated-two-db-overhead-press', 3, 8, false],
      ['suitcase-carry', 2, '45 sec', true],
      ['two-hand-overhead-carry', 2, '30–45 sec', false],
      ['side-plank', 2, '30–40 sec', true],
      ['hammer-curl', 2, 10, false],
      ['calf-raise', 2, 12, false],
    ]);
    expect(chapterThreeForgeA.exercises[0].notes).toBe('Slow 3-second lowering, light touch.');
    expect(dose(chapterThreeForgeB)).toEqual([
      ['goblet-squat', 3, 8, false],
      ['supported-reverse-lunge', 3, 6, true],
      ['one-arm-db-row', 3, 10, true],
      ['push-up', 3, '8–12', false],
      ['one-arm-db-overhead-press', 3, 8, true],
      ['farmer-carry', 2, '60 sec', false],
      ['two-hand-overhead-carry', 2, '30–45 sec', false],
      ['pallof-press', 2, 8, true],
      ['preacher-curl', 2, '10–12', true],
      ['glute-bridge', 3, 12, false],
      ['chin-up', 2, '5–8', false],
    ]);
    expect(chapterThreeForgeB.exercises[4].stanceChoice).toBe('half-kneeling-one-arm-db-press');
    // The press comes before the carries, and the overhead carry is the last carry.
    for (const workout of [chapterThreeForgeA, chapterThreeForgeB]) {
      const ids = workout.exercises.map((item) => item.exerciseId);
      const press = ids.findIndex((id) => id.includes('press') && !id.includes('pallof'));
      const carries = ids.flatMap((id, index) => (id.endsWith('carry') ? [index] : []));
      expect(press).toBeLessThan(carries[0]);
      expect(ids[carries.at(-1)!]).toBe('two-hand-overhead-carry');
    }
  });

  it('reuses Restoration II as written under its own ID', () => {
    expect(chapterThreeRestoration.id).toBe('chapter-3-restoration');
    expect(chapterThreeRestoration.exercises).toEqual(chapterTwoRestoration.exercises);
    expect(chapterThreeRestoration.finish).toEqual(chapterTwoRestoration.finish);
  });

  it('reduces both Week 12 Forges about 25%, as a guide, with no load increases', () => {
    const a = chapterThreeProgram.workoutPlan('chapter-3-forge-a', 12);
    const b = chapterThreeProgram.workoutPlan('chapter-3-forge-b', 12);
    expect(a).toMatchObject({
      reduced: true,
      volumeGuide: { plannedSets: 25, aroundCompletedSets: 19, aroundSkippedSets: 6 },
    });
    expect(b).toMatchObject({
      reduced: true,
      volumeGuide: { plannedSets: 28, aroundCompletedSets: 21, aroundSkippedSets: 7 },
    });
    expect(a.note).toContain('No load increases.');
    expect(chapterThreeProgram.workoutPlan('chapter-3-forge-a', 11)).toEqual({ reduced: false });
    expect(chapterThreeProgram.workoutPlan('chapter-3-restoration', 12)).toEqual({
      reduced: false,
    });
  });
});

describe('After Week 12', () => {
  it('repeats Week 12 every day, Forges included, with no Monday or Thursday attempt days', () => {
    for (const [date, title] of [
      ['2026-12-28', 'Forge A at reduced volume'],
      ['2026-12-29', 'Reduced climb conditioning'],
      ['2026-12-31', 'Forge B at reduced volume'],
      ['2027-01-02', 'Easy walk'],
    ] as const) {
      const day = at(date);
      expect(day).toMatchObject({ afterLastWeek: true, attemptDay: false, contentWeek: 12 });
      expect(getDayContent(day).activity.title).toBe(title);
      expect(isTrialAvailable(day)).toBe(true);
    }
    expect(getDayMissions(at('2026-12-28'))[1].id).toBe('chapter-3-week-12-day-1-weekly');
    expect(
      chapterThreeProgram.workoutPlan('chapter-3-forge-b', at('2026-12-31').contentWeek),
    ).toMatchObject({ reduced: true });
  });

  it('opens the trial any day from the Monday after Week 12 until it is passed', () => {
    expect(isTrialAvailable(at('2026-12-27'))).toBe(false);
    expect(getNextAttempt(at('2026-12-20'), '2026-12-20')).toBe('2026-12-28');
    expect(getNextAttempt(at('2026-12-30'), '2026-12-30')).toBe('2026-12-30');
    expect(getDaysUntil(getNextAttempt(at('2026-12-30'), '2026-12-30'), '2026-12-30')).toBe(0);

    // A Wednesday pass: the next chapter would begin the following Monday.
    const passed = [...passes, { trialId: 'high-country-trial', date: '2026-12-30' }];
    expect(isTrialAvailable(at('2026-12-31', passed))).toBe(false);
    expect(at('2026-12-31', passed).nextStart).toBe('2027-01-04');
  });

  it('names no attempt-day Scripture for the any-day trial', () => {
    expect(chapterThreeProgram.trialAttempt).toBeUndefined();
    expect(getTrialScripture(chapterThreeProgram)).toEqual([]);
  });
});

describe('Chapter III Hearth missions', () => {
  it('gives Week 9 four parts, with a one-line summary for Today’s Mission', () => {
    const week9 = at('2026-12-02');
    expect(getHearthMission(week9)).toBe(
      'Ask what feels stuck and carry one piece, finish a tedious task each day, tell your daughter about nearly quitting, and pray at a meal for something you are waiting for.',
    );
    expect(getHearthMissionParts(week9).map((part) => part.text)).toEqual([
      'Ask your spouse what feels stuck in your life together. Listen to the whole answer, then pick up one piece of it and carry it.',
      'Finish one tedious recurring household task every day this week.',
      'Tell your daughter about a time you nearly quit something, and what kept you going.',
      'At a meal each day, pray together as a family for one thing you’re still waiting for.',
    ]);
  });

  it('gives Week 10 one conversation and Week 11 the family outing, in a single part each', () => {
    expect(getHearthMission(at('2026-12-08'))).toBe(
      'Have one needed conversation you have been avoiding. Be clear, calm, and non-confrontational.',
    );
    expect(getHearthMission(at('2026-12-15'))).toBe(
      'Plan a family outing: destination, timing, weather, transportation, food and snacks, and needed gear. The outing is the trial hike if the family comes, otherwise Saturday’s trail rehearsal.',
    );
    expect(getHearthMissionParts(at('2026-12-08'))).toEqual([]);
    expect(getHearthMissionParts(at('2026-12-15'))).toEqual([]);
  });

  it('gives Week 12 parts a to c; part d is the Keep row and part e the seasonal layer', () => {
    const week12 = at('2026-12-22');
    expect(getHearthMissionParts(week12).map((part) => part.text)).toEqual([
      'Tell your spouse the plan: where you’re going, your turnaround point, and when you’ll be back.',
      'Invite the family along. If your daughter comes, give her one job.',
      'At a meal, pray together as a family for the climb and the weather.',
    ]);
    expect(getHearthMission(week12)).toBe(
      'Tell your spouse the plan, invite the family, and pray together for the climb and the weather.',
    );
    expect(
      getHearthMissionParts(week12)
        .map((part) => part.text)
        .join(' '),
    ).not.toMatch(/Christmas|high-point/);
  });

  it('keeps repeating Week 12’s mission on the days after it, while the trial waits', () => {
    expect(getHearthMissionParts(at('2027-01-13')).length).toBe(3);
  });
});
