// @ts-ignore The test runner has Node's built-in fs module; app code does not use it.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getChapterSessions,
  getChapterOneScriptureByWeek,
  getFieldManualIndex,
  getFieldManualWeek,
  getScriptureByWeek,
  getTrialScripture,
  joinWords,
  scriptureDayId,
} from './field-manual';
import { chapterPrograms } from './program-catalog';
import {
  getFieldCard,
  getLeadershipLessonForWeek,
  getWeeklyFieldcraft,
  listFieldCards,
  listLeadershipLessons,
  listLeadershipPrinciples,
  listReadingPlan,
} from './field-manual.seed';

// Day 1 is Monday, Oct 5, 2026: Week 2 begins Oct 12 and the first Gate Trial attempt is Nov 2.
const startDate = '2026-10-05';

const summary = (today: string, extra: Record<string, string> = {}) =>
  getFieldManualWeek({ startDate, today, ...extra }).rows.map((row) => [row.title, row.line]);

describe('Field Manual content', () => {
  it('has a lesson for each week of Chapters I to III built on the documented principles', () => {
    const principles = new Set(listLeadershipPrinciples().map((principle) => principle.id));
    expect(principles.size).toBe(12);
    expect(listLeadershipLessons().map((lesson) => lesson.week)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    for (const lesson of listLeadershipLessons()) {
      expect(lesson.principleIds.every((id) => principles.has(id))).toBe(true);
      expect(lesson.paragraphs.length).toBeGreaterThan(1);
    }
  });

  it('keeps one book per chapter, starting with the Chapter I book', () => {
    const plan = listReadingPlan();
    expect(plan.map((entry) => entry.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(plan[0].title).toBe('Habits of the Household');
  });

  it('points each week’s fieldcraft at existing cards', () => {
    expect(getWeeklyFieldcraft(2)?.cardIds).toEqual(['tool-inspection']);
    expect(getWeeklyFieldcraft(3)?.cardIds).toEqual(['square-knot', 'bowline', 'two-half-hitches']);
    for (const week of [2, 3]) {
      for (const id of getWeeklyFieldcraft(week)!.cardIds) expect(getFieldCard(id)).toBeDefined();
    }
    expect(getWeeklyFieldcraft(1)).toBeUndefined();
  });

  it('ships an optimized 2×2 step image for every card that has one', () => {
    for (const id of ['square-knot', 'bowline', 'two-half-hitches']) {
      expect(getFieldCard(id)?.sequence, id).toMatchObject({
        src: `images/field-manual/${id}/sequence.webp`,
      });
    }
    for (const card of listFieldCards()) {
      if (!card.sequence) continue;
      expect(card.sequence.alt.length, card.id).toBeGreaterThan(20);
      // One panel per written step, two panels to a 768px row.
      const rows = ((card.sequence.height ?? 1548) - 12) / 768;
      expect(rows * 2, card.id).toBe(card.steps?.length);
      const path = `public/${card.sequence.src}`;
      const data = readFileSync(path);
      expect(data.toString('ascii', 0, 4), path).toBe('RIFF');
      expect(data.toString('ascii', 8, 12), path).toBe('WEBP');
      expect(statSync(path).size, path).toBeGreaterThan(5_000);
    }
  });
});

describe('Chapter III Field Manual content', () => {
  it('names a specific chapter of Just Do Something in each Wednesday reading pointer', () => {
    const chapters: Record<number, [string, string]> = {
      9: ['chapter 4', 'Our Magic 8-Ball God'],
      10: ['chapter 5', 'A Better Way'],
      11: ['chapter 8', 'The Way of Wisdom'],
      12: ['chapter 10', 'The End of the Matter'],
    };
    for (const [week, [number, title]] of Object.entries(chapters)) {
      const pointer = getLeadershipLessonForWeek(Number(week))!.fromReading;
      expect(pointer, `week ${week}`).toContain(number);
      expect(pointer, `week ${week}`).toContain(title);
    }
  });

  it('writes the Calm Decisions lessons on the week’s own Scripture, with no Bible text', () => {
    const lessons = listLeadershipLessons().filter((lesson) => lesson.week >= 9);
    expect(lessons.map((lesson) => lesson.title)).toEqual([
      'Stop before you quit',
      'Choose, then go',
      'Say the plan out loud',
      'Look again',
    ]);
    expect(lessons.map((lesson) => lesson.scripture.map((item) => item.reference))).toEqual([
      ['Romans 5:1–5', 'James 1:2–4'],
      ['Joshua 1:6–9', '2 Timothy 1:6–7'],
      ['Philippians 2:1–8', '1 Peter 5:5–7'],
      ['Psalm 121', 'Isaiah 40:28–31'],
    ]);
    expect(lessons[3].paragraphs.join(' ')).toContain('If Christmas falls this week');
  });

  it('has a written Navigation II card for Weeks 9–12 with no pictures', () => {
    const card = getFieldCard('navigation-two')!;
    expect(card).toMatchObject({ week: 9, lastWeek: 12, skill: 'navigation' });
    expect(card.sequence).toBeUndefined();
    expect(card.sections!.map((section) => section.heading)).toEqual([
      'Contour lines',
      'Elevation gain',
      'Ridges, valleys and saddles',
      'Switchbacks',
      'Trail intersections',
      'Hiking-time estimates',
      'Turnaround criteria',
      'Weather awareness',
      'Map north and compass north',
      'Field mission (Week 11 Saturday)',
      'Daughter quest (Week 11 Saturday)',
    ]);
    const turnaround = card.sections!.find((s) => s.heading === 'Turnaround criteria')!;
    expect(turnaround.items.join(' ')).toContain('pain reaches 4 or more');
    for (const week of [9, 10, 11, 12]) {
      expect(getWeeklyFieldcraft(week)?.cardIds).toEqual(['navigation-two']);
    }
  });

  const passes = [
    { trialId: 'gate-trial', date: '2026-11-02' },
    { trialId: 'three-mile-trial', date: '2026-11-30' },
  ];

  it('lists Week 9 Wednesday’s lesson, card, reading, Scripture and sessions', () => {
    const week = getFieldManualWeek({ startDate, today: '2026-12-02', completedTrials: passes });
    expect(week.heading).toBe('Week 9 · Perseverance');
    expect(week.rows.map((row) => [row.kind, row.title, row.line])).toEqual([
      ['lesson', 'Stop before you quit', 'Leadership lesson · Read Tuesday, 3 minutes'],
      ['fieldcraft', 'Navigation II', 'Field card · learn it this month'],
      ['reading', 'Just Do Something', 'Reading · Wednesday, 10 minutes'],
      ['scripture', 'Hebrews 10:35–39', 'Scripture today · four more this week'],
      [
        'exercises',
        'Forge B, Climb conditioning and Restoration',
        expect.stringContaining('movements this week'),
      ],
    ]);
    expect(week.entryIds).toContain('card-navigation-two');
    expect(week.entryIds).toContain('lesson-stop-before-you-quit');
    expect(week.entryIds).toContain('exercise-slow-step-down');
    expect(week.entryIds).toContain('exercise-goblet-squat');
  });

  it('points Week 11 Saturday’s field mission at the card', () => {
    const week = getFieldManualWeek({ startDate, today: '2026-12-19', completedTrials: passes });
    expect(week.heading).toBe('Week 11 · Humility');
    expect(week.rows.find((row) => row.kind === 'fieldcraft')?.line).toBe(
      'Field card · Saturday’s field mission',
    );
  });

  it('lists the climb, the slow step-down finisher, the box-squat cue and the half-kneeling press', () => {
    const three = chapterPrograms[2];
    const sessions = getChapterSessions(three);
    const climb = sessions.find((session) => session.id === 'chapter-3-climb')!;
    expect(climb).toMatchObject({ title: 'Climb conditioning', when: 'Tuesday' });
    expect(climb.movements.map((movement) => movement.exerciseId)).toEqual([
      'step-up',
      'slow-step-down',
    ]);
    expect(climb.movements[1].dose).toBe('2 sets × 6 reps per leg');
    const forgeA = sessions.find((session) => session.id === 'chapter-3-forge-a')!;
    expect(forgeA.movements[0]).toMatchObject({
      exerciseId: 'box-squat',
      note: 'Slow 3-second lowering, light touch.',
    });
    const forgeB = sessions.find((session) => session.id === 'chapter-3-forge-b')!;
    const press = forgeB.movements.findIndex(
      (movement) => movement.exerciseId === 'one-arm-db-overhead-press',
    );
    expect(forgeB.movements[press + 1]).toMatchObject({
      exerciseId: 'half-kneeling-one-arm-db-press',
      note: expect.stringContaining('instead'),
    });
    expect(forgeA.movements.some((movement) => movement.exerciseId === 'calf-raise')).toBe(true);
    // Chapter I and II pages keep their approved text.
    expect(
      getChapterSessions(chapterPrograms[1]).every((session) =>
        session.movements.every((movement) => !('note' in movement)),
      ),
    ).toBe(true);
  });

  it('finds Chapter III content in the Index', () => {
    const index = getFieldManualIndex();
    const by = (name: string) => index.find((entry) => entry.name === name);
    expect(by('Navigation II')).toMatchObject({
      kind: 'card',
      detail: 'Field card · Weeks 9–12',
    });
    expect(by('Stop before you quit')?.detail).toBe('Leadership lesson · Week 9');
    expect(by('Decisive')?.detail).toBe('Book · suggested in Week 9');
    expect(by('Crucial Conversations')).toBeDefined();
    expect(by('The Freedom of Self-Forgetfulness')).toBeDefined();
    expect(by('Just Do Something')?.detail).toBe('Book · Chapter III');
    expect(by('Hebrews 10:35–39')?.detail).toBe('Scripture · Week 9 Wednesday');
    expect(by('Slow Step-Down')?.kind).toBe('exercise');
    expect(by('Isaiah 9:2–7')).toMatchObject({
      kind: 'scripture',
      detail: 'Scripture · Advent 1 · Hope',
      fragment: 'seasonal-advent-1',
    });
    expect(by('Luke 2:1–20')?.detail).toBe('Scripture · Christmas Eve');
    // A family question is searchable through its reading.
    expect(by('John 1:1–14')?.keywords).toContain('light came into the world');
    expect(by('Isaiah 40:1–11')?.detail).toBe('Scripture · Advent 2 · Peace');
  });
});

describe('This week', () => {
  it('lists Week 2’s lesson, field card, reading, Scripture and exercises', () => {
    const week = getFieldManualWeek({ startDate, today: '2026-10-12' });
    expect(week.stage).toBe('week');
    expect(week.heading).toBe('Week 2 · Keep Your Word');
    expect(week.subline).toBe('Chapter I · The Muster');
    expect(week.rows.map((row) => [row.title, row.line])).toEqual([
      ['Keep small promises', 'Leadership lesson · Read Monday, 3 minutes'],
      ['Tool inspection', 'Field card · Wednesday or Saturday'],
      ['Habits of the Household', 'Reading · Wednesday and Friday, 10 minutes'],
      ['Matthew 5:33–37', 'Scripture today · six more this week'],
      ['Forge and Restoration', 'Exercise guides · 18 movements this week'],
    ]);
    expect(week.rows[1].link).toEqual(['/field-manual/cards', 'tool-inspection']);
    expect(week.rows[1].skill).toBe('tool');
    expect(week.rows[3].fragment).toBe('week-2-day-1');
  });

  it('counts the Scripture left in the week and names the last day', () => {
    expect(summary('2026-10-15')[3]).toEqual([
      'James 5:12',
      'Scripture today · three more this week',
    ]);
    expect(summary('2026-10-18')[3]).toEqual([
      'Psalm 90:12–17',
      'Scripture today · the last of this week',
    ]);
  });

  it('sends Week 3 to the knot practice page and drops rows a week does not have', () => {
    const three = getFieldManualWeek({ startDate, today: '2026-10-21' });
    expect(three.rows[1]).toMatchObject({
      title: 'Knot practice',
      line: 'Field cards · Wednesday · three knots',
      link: ['/field-manual/practice', '3'],
      skill: 'knot',
    });
    // The Index shows each card's own skill, so knots get a rope rather than the hatchet.
    const cards = getFieldManualIndex().filter((entry) => entry.kind === 'card');
    expect(cards.map((entry) => [entry.name, entry.skill])).toEqual([
      ['Bowline', 'knot'],
      ['Navigation I', 'navigation'],
      ['Navigation II', 'navigation'],
      ['Square knot', 'knot'],
      ['Tool inspection', 'tool'],
      ['Two half hitches', 'knot'],
    ]);
    expect(three.rows[2].line).toBe('Reading · Friday, 10 minutes');

    const four = getFieldManualWeek({ startDate, today: '2026-10-26' });
    expect(four.rows.map((row) => row.kind)).toEqual(['lesson', 'scripture', 'exercises']);
    expect(four.rows[0].title).toBe(getLeadershipLessonForWeek(4)!.title);
  });

  it('shows Week 1 as the week ahead before Day 1 or without a campaign', () => {
    const ahead = getFieldManualWeek({ startDate, today: '2026-09-29' });
    expect(ahead.stage).toBe('ahead');
    expect(ahead.heading).toBe('Week ahead · The Call');
    expect(ahead.rows.map((row) => [row.title, row.line])).toEqual([
      ['Lead yourself first', 'Leadership lesson · Read Monday, 3 minutes'],
      ['Habits of the Household', 'Reading · Wednesday, Friday and Saturday, 10 minutes'],
      ['Proverbs 4:20–27', 'Scripture on Day 1 · six more that week'],
      ['Forge and Restoration', 'Exercise guides · 18 movements that week'],
    ]);
    expect(getFieldManualWeek({ today: '2026-09-29' }).heading).toBe('Week ahead · The Call');
    expect(getFieldManualWeek({ startDate: '2026-10-08', today: '2026-10-07' }).heading).toBe(
      'Week ahead · The Call',
    );
  });

  it('uses Week 1’s days for a midweek lead-in', () => {
    // Day 1 on Thursday, Oct 8: the lead-in runs Thursday through Sunday.
    const week = getFieldManualWeek({ startDate: '2026-10-08', today: '2026-10-09' });
    expect(week.heading).toBe('Lead-in · The Call');
    expect(week.rows.map((row) => [row.title, row.line])).toEqual([
      ['Lead yourself first', 'Leadership lesson · Read on Day 1, 3 minutes'],
      ['Habits of the Household', 'Reading · Friday and Saturday, 10 minutes'],
      ['Proverbs 16:32', 'Scripture today · two more this week'],
      ['Forge B and Restoration', 'Exercise guides · 13 movements this week'],
    ]);
  });

  it('shows the Gate Trial circuit beside Week 4’s repeated days, and Chapter II’s start after a pass', () => {
    const trial = getFieldManualWeek({ startDate, today: '2026-11-02' });
    expect(trial.stage).toBe('trial');
    expect(trial.heading).toBe('The Gate Trial');
    expect(trial.rows.map((row) => [row.title, row.line])).toEqual([
      ['Carry the details', 'Leadership lesson · Week 4, 3 minutes'],
      ['Hebrews 12:1–3', 'Scripture today · six more this week'],
      ['Forge, Gate Circuit and Restoration', 'Exercise guides · 18 movements this week'],
    ]);
    expect(trial.rows[1].fragment).toBe('week-4-day-1');
    expect(trial.sessions.find((session) => session.id === 'gate-circuit')?.days).toBe(
      'the day you take the trial',
    );

    const gatePass = [{ trialId: 'gate-trial', date: '2026-11-05' }];
    const passed = getFieldManualWeek({
      startDate,
      today: '2026-11-06',
      completedTrials: gatePass,
    });
    expect(passed.heading).toBe('Gate Trial passed');
    expect(passed.subline).toBe('Chapter I · The Muster · Chapter II begins Mon, Nov 9');
    // Monday repeated Week 4's Forge A; Thursday's pass took that day's Forge B.
    expect(passed.sessions.map((session) => session.id)).toEqual([
      'chapter-1-forge-a',
      'chapter-1-restoration',
    ]);
    expect(passed.rows.at(-1)?.title).toBe('Forge A and Restoration');
  });
});

describe('This week in Chapter II', () => {
  // Gate Trial passed Thursday, Nov 5: Chapter II's Week 5 begins Monday, Nov 9.
  const gatePass = [{ trialId: 'gate-trial', date: '2026-11-05' }];
  const week = (today: string, trials = gatePass) =>
    getFieldManualWeek({ startDate, today, completedTrials: trials });

  it('lists Week 5’s lesson, Navigation I, the chapter’s book, Scripture and sessions', () => {
    const five = week('2026-11-09');
    expect(five.stage).toBe('week');
    expect(five.chapter).toBe(2);
    expect(five.heading).toBe('Week 5 · Be Still');
    expect(five.subline).toBe('Chapter II · The Road');
    expect(five.rows.map((row) => [row.title, row.line])).toEqual([
      ['Stop hurrying', 'Leadership lesson · Read Monday, 3 minutes'],
      ['Navigation I', 'Field card · learn it this month'],
      ['The Ruthless Elimination of Hurry', 'Reading · Wednesday, 10 minutes'],
      ['Psalm 46:1–11', 'Scripture today · six more this week'],
      ['Forge and Restoration', 'Exercise guides · 29 movements this week'],
    ]);
    expect(five.rows[1]).toMatchObject({
      link: ['/field-manual/cards', 'navigation-one'],
      skill: 'navigation',
    });
    expect(five.rows[3].fragment).toBe('week-5-day-1');
    expect(five.sessions.map((session) => session.id)).toEqual([
      'chapter-2-forge-a',
      'chapter-2-forge-b',
      'chapter-2-restoration',
    ]);
  });

  it('points Week 6 at Saturday’s field mission', () => {
    expect(week('2026-11-16').rows[1].line).toBe('Field card · Saturday’s field mission');
  });

  it('reads the lesson on Chapter II’s first day when it begins on a Tuesday', () => {
    const tuesday = week('2026-11-03', [{ trialId: 'gate-trial', date: '2026-11-02' }]);
    expect(tuesday.heading).toBe('Week 5 · Be Still');
    expect(tuesday.rows[0].line).toBe('Leadership lesson · Read Tuesday, 3 minutes');
    expect(tuesday.rows.find((row) => row.kind === 'scripture')?.line).toBe(
      'Scripture today · five more this week',
    );
  });

  it('shows the Three-Mile Trial after Week 8, then Chapter III after a pass', () => {
    const trial = week('2026-12-07');
    expect(trial.stage).toBe('trial');
    expect(trial.heading).toBe('The Three-Mile Trial');
    // Monday after Week 8 repeats Week 8's Monday until the day the trial is taken.
    expect(trial.rows.find((row) => row.kind === 'scripture')).toMatchObject({
      title: 'Micah 6:8',
      fragment: 'week-8-day-1',
    });
    expect(trial.rows.some((row) => row.kind === 'fieldcraft')).toBe(false);
    expect(trial.sessions.map((session) => session.id)).not.toContain('gate-circuit');

    const trials = [...gatePass, { trialId: 'three-mile-trial', date: '2026-12-07' }];
    expect(week('2026-12-07', trials).heading).toBe('Three-Mile Trial passed');
    expect(week('2026-12-07', trials).subline).toBe(
      'Chapter II · The Road · Chapter III begins Tue, Dec 8',
    );
    const third = week('2026-12-08', trials);
    expect(third.stage).toBe('week');
    expect(third.heading).toBe('Week 9 · Perseverance');

    // The last chapter in the app shows as complete once its trial is passed.
    const all = [...trials, { trialId: 'high-country-trial', date: '2027-01-06' }];
    const complete = week('2027-01-11', all);
    expect(complete.stage).toBe('complete');
    expect(complete.heading).toBe('Chapter III complete');
    expect(complete.rows).toEqual([]);
  });
});

describe('This week entries', () => {
  it('marks this week’s entries for the Index filter', () => {
    const week = getFieldManualWeek({ startDate, today: '2026-10-12' });
    const index = new Set(getFieldManualIndex().map((entry) => entry.id));
    expect(week.entryIds).toContain('lesson-keep-small-promises');
    expect(week.entryIds).toContain('card-tool-inspection');
    expect(week.entryIds).toContain('scripture-matthew-5-33-37');
    expect(week.entryIds.every((id) => index.has(id))).toBe(true);
  });
});

describe('Index and Scripture', () => {
  it('lists every entry once, A to Z, filing articles and book numbers behind the name', () => {
    const index = getFieldManualIndex();
    expect(new Set(index.map((entry) => entry.id)).size).toBe(index.length);
    expect(index.filter((entry) => entry.kind === 'exercise')).toHaveLength(76);
    expect(index.filter((entry) => entry.kind === 'book')).toHaveLength(17);
    expect(index.find((entry) => entry.name === 'The Motive')?.letter).toBe('M');
    expect(index.find((entry) => entry.name === '1 Corinthians 9:24–27')?.letter).toBe('C');
    const keys = index.map((entry) => entry.sortKey);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b, 'en')));
    expect(index.find((entry) => entry.name === '2 Timothy 4:7')?.detail).toBe(
      'Scripture · Week 4 Saturday and Gate Trial attempts',
    );
  });

  it('reads Chapter I’s Scripture by week from the daily orders', () => {
    const weeks = getChapterOneScriptureByWeek();
    expect(weeks.map((week) => week.days.length)).toEqual([7, 7, 7, 7]);
    expect(weeks[1].days[0]).toMatchObject({ day: 'Monday', reference: 'Matthew 5:33–37' });
    expect(weeks[0].days[6].reflectionPrompt).toBe(
      'Where am I allowing comfort to make decisions for me?',
    );
    expect(scriptureDayId(1, 6)).not.toBe(scriptureDayId(4, 6));
    expect(getFieldManualIndex().find((entry) => entry.name === 'Psalm 121')?.fragment).toBe(
      'gate-trial-spirit',
    );
  });

  it('joins lists the way the rows read them', () => {
    expect(joinWords(['Wednesday'])).toBe('Wednesday');
    expect(joinWords(['Wednesday', 'Friday'])).toBe('Wednesday and Friday');
    expect(joinWords(['Wednesday', 'Friday', 'Saturday'])).toBe('Wednesday, Friday and Saturday');
  });
});

describe('Chapter II reference pages', () => {
  const chapterTwo = chapterPrograms[1];

  it('reads Chapter II’s Scripture by week from its daily seed', () => {
    const weeks = getScriptureByWeek(chapterTwo);
    expect(weeks.map((week) => week.week)).toEqual([5, 6, 7, 8]);
    expect(weeks[1].days[0]).toMatchObject({ day: 'Monday', reference: 'James 1:19–20' });
    expect(weeks[3].days[6].reflectionPrompt).toBe(
      'Where has consistent small effort begun changing me?',
    );
  });

  it('gives each trial its own Scripture anchors', () => {
    expect(getTrialScripture(chapterPrograms[0]).map((row) => row.id)).toEqual([
      'gate-trial-attempts',
      'gate-trial-spirit',
    ]);
    expect(getTrialScripture(chapterTwo)).toEqual([
      {
        label: 'The day you take it, and the prayer',
        reference: 'Psalm 121',
        id: 'three-mile-trial-attempts',
      },
    ]);
  });

  it('lists the warm-up, both Forge days and Restoration with the days they fall on', () => {
    expect(getChapterSessions(chapterTwo).map((session) => [session.id, session.when])).toEqual([
      ['chapter-2-warm-up', 'Before Forge A and Forge B'],
      ['chapter-2-forge-a', 'Monday'],
      ['chapter-2-forge-b', 'Thursday'],
      ['chapter-2-restoration', 'Wednesday and Friday, or as needed'],
    ]);
    expect(getChapterSessions(chapterTwo)[1].movements[3]).toEqual({
      exerciseId: 'split-squat',
      dose: '3 sets × 6 reps per side',
    });
  });

  it('names each trial’s circuit by its trial: Gate Circuit stays, Chapter III gets its own', () => {
    const [one, , three] = chapterPrograms;
    expect(getChapterSessions(one).at(-1)).toMatchObject({
      id: 'gate-circuit',
      title: 'Gate Circuit',
      when: 'The Gate Trial, 3 controlled rounds',
    });
    expect(getChapterSessions(three).at(-1)).toMatchObject({
      id: 'high-country-trial-circuit',
      title: 'High Country Trial circuit',
      when: 'The High Country Trial, 2 rounds on a later Green day',
      movements: [
        { exerciseId: 'step-up', dose: expect.any(String) },
        { exerciseId: 'push-up', dose: expect.any(String) },
        { exerciseId: 'assisted-pull-up', dose: expect.any(String) },
        { exerciseId: 'farmer-carry', dose: expect.any(String) },
        { exerciseId: 'side-plank', dose: expect.any(String) },
      ],
    });
    expect(getChapterSessions(chapterTwo).some((session) => session.id.endsWith('circuit'))).toBe(
      false,
    );
  });

  it('indexes Chapter II’s Scripture alongside Chapter I’s', () => {
    const index = getFieldManualIndex();
    expect(index.find((entry) => entry.name === 'James 1:19–20')?.detail).toBe(
      'Scripture · Week 6 Monday',
    );
    expect(index.find((entry) => entry.name === 'Psalm 121')?.detail).toContain(
      'Three-Mile Trial attempts',
    );
    expect(index.find((entry) => entry.name === 'Navigation I')?.detail).toBe(
      'Field card · Weeks 5–8',
    );
  });
});
