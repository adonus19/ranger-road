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
  it('has a lesson for each week of Chapters I and II built on the documented principles', () => {
    const principles = new Set(listLeadershipPrinciples().map((principle) => principle.id));
    expect(principles.size).toBe(12);
    expect(listLeadershipLessons().map((lesson) => lesson.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
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

  it('shows the Gate Trial circuit on attempt weeks and Chapter II’s start after a pass', () => {
    const trial = getFieldManualWeek({ startDate, today: '2026-11-02' });
    expect(trial.stage).toBe('trial');
    expect(trial.heading).toBe('The Gate Trial');
    expect(trial.rows.map((row) => [row.title, row.line])).toEqual([
      ['Carry the details', 'Leadership lesson · Week 4, 3 minutes'],
      ['2 Timothy 4:7', 'Scripture today · six more this week'],
      ['Gate Circuit and Restoration', 'Exercise guides · 13 movements this week'],
    ]);
    expect(trial.rows[1].fragment).toBe('gate-trial-attempts');

    const gatePass = [{ trialId: 'gate-trial', date: '2026-11-05' }];
    const passed = getFieldManualWeek({
      startDate,
      today: '2026-11-06',
      completedTrials: gatePass,
    });
    expect(passed.heading).toBe('Gate Trial passed');
    expect(passed.subline).toBe('Chapter I · The Muster · Chapter II begins Mon, Nov 9');
    expect(passed.sessions.map((session) => session.id)).toEqual(['chapter-1-restoration']);
    expect(passed.rows.at(-1)?.title).toBe('Restoration');
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
      ['Forge and Restoration', 'Exercise guides · 22 movements this week'],
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

  it('shows the Three-Mile Trial after Week 8, then Chapter II complete after a pass', () => {
    const trial = week('2026-12-07');
    expect(trial.stage).toBe('trial');
    expect(trial.heading).toBe('The Three-Mile Trial');
    expect(trial.rows.find((row) => row.kind === 'scripture')).toMatchObject({
      title: 'Psalm 121',
      fragment: 'three-mile-trial-attempts',
    });
    expect(trial.rows.some((row) => row.kind === 'fieldcraft')).toBe(false);
    expect(trial.sessions.map((session) => session.id)).not.toContain('gate-circuit');

    const trials = [...gatePass, { trialId: 'three-mile-trial', date: '2026-12-07' }];
    expect(week('2026-12-07', trials).heading).toBe('Three-Mile Trial passed');
    expect(week('2026-12-07', trials).subline).toBe(
      'Chapter II · The Road · Chapter III begins Tue, Dec 8',
    );
    const complete = week('2026-12-08', trials);
    expect(complete.stage).toBe('complete');
    expect(complete.heading).toBe('Chapter II complete');
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
    expect(index.filter((entry) => entry.kind === 'exercise')).toHaveLength(25);
    expect(index.filter((entry) => entry.kind === 'book')).toHaveLength(14);
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
        label: 'Each attempt day and the prayer',
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
