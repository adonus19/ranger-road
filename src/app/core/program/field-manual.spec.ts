// @ts-ignore The test runner has Node's built-in fs module; app code does not use it.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getChapterOneScriptureByWeek,
  getFieldManualIndex,
  getFieldManualWeek,
  joinWords,
  scriptureDayId,
} from './field-manual';
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
  it('has a lesson for each Chapter I week built on the documented principles', () => {
    const principles = new Set(listLeadershipPrinciples().map((principle) => principle.id));
    expect(principles.size).toBe(12);
    expect(listLeadershipLessons().map((lesson) => lesson.week)).toEqual([1, 2, 3, 4]);
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
    expect(getFieldCard('square-knot')?.sequence).toMatchObject({
      src: 'images/field-manual/square-knot/sequence.webp',
    });
    for (const card of listFieldCards()) {
      if (!card.sequence) continue;
      expect(card.sequence.alt.length, card.id).toBeGreaterThan(20);
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

    const passed = getFieldManualWeek({
      startDate,
      today: '2026-11-06',
      trialPassedOn: '2026-11-05',
      chapterTwoStart: '2026-11-09',
    });
    expect(passed.heading).toBe('Gate Trial passed');
    expect(passed.subline).toBe('Chapter I · The Muster · Chapter II begins Mon, Nov 9');
    expect(passed.sessions.map((session) => session.id)).toEqual(['chapter-1-restoration']);
    expect(passed.rows.at(-1)?.title).toBe('Restoration');

    const complete = getFieldManualWeek({
      startDate,
      today: '2026-11-09',
      trialPassedOn: '2026-11-05',
      chapterTwoStart: '2026-11-09',
    });
    expect(complete.stage).toBe('complete');
    expect(complete.rows).toEqual([]);
  });

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
    expect(index.filter((entry) => entry.kind === 'exercise')).toHaveLength(18);
    expect(index.filter((entry) => entry.kind === 'book')).toHaveLength(11);
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
