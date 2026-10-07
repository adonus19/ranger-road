import { describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/models';
import { resolveCampaignPosition } from './campaign-position';
import { getActivityChoices, getDayOrders, getWorkoutChoices } from './chapter-orders';
import { withMakeup, type MakeupHistory } from './makeup-schedule';

// Chapter I with a Monday Day 1: Week 1 is Oct 5–11, Week 3 Oct 19–25, Week 4 (deload) Oct 26.
const start = '2026-10-05';
const resolve = (date: LocalDate) => resolveCampaignPosition(start, date, [])?.chapter ?? null;
const mainId = (date: LocalDate) => getActivityChoices(resolve(date)!)[0].id;

function history(
  records: [LocalDate, LocalDate][] = [],
  options: { sessions?: [LocalDate, string][]; red?: LocalDate[] } = {},
): MakeupHistory {
  return {
    records: records.map(([date, source]) => ({ date, definitionId: mainId(source) })),
    sessions: (options.sessions ?? []).map(([date, workoutDefinitionId]) => ({
      date,
      workoutDefinitionId,
    })),
    redDates: new Set(options.red ?? []),
  };
}

function day(date: LocalDate, today: LocalDate, saved: MakeupHistory = history()) {
  return withMakeup(resolve(date)!, date, today, resolve, saved);
}

const titles = (date: LocalDate, today: LocalDate, saved?: MakeupHistory) =>
  getActivityChoices(day(date, today, saved)).map((choice) => choice.title);

describe('Missed Forge make-ups', () => {
  it('moves a missed Forge A to Tuesday the next morning, keeping its mission ID', () => {
    const tuesday = day('2026-10-06', '2026-10-06');
    const choices = getActivityChoices(tuesday);
    expect(choices[0]).toMatchObject({ id: mainId('2026-10-05'), title: 'Forge A' });
    expect(choices[1].title).toContain('(optional)');
    expect(getWorkoutChoices(tuesday)).toContain('chapter-1-forge-a');
    const main = getDayOrders(tuesday).find((order) => order.kind === 'weekly');
    expect(main?.title).toBe('Forge A');
    expect(main?.guidance).toContain('Forge A, moved from Monday.');
    expect(main?.guidance).toContain('optional');
  });

  it('shows nothing moved on Monday itself, or once Forge A is recorded', () => {
    expect(day('2026-10-05', '2026-10-05').makeup).toBeUndefined();
    expect(
      day('2026-10-06', '2026-10-06', history([['2026-10-05', '2026-10-05']])).makeup,
    ).toBeUndefined();
    // A Forge session saved before one-step recording also counts.
    const session = history([], { sessions: [['2026-10-05', 'chapter-1-forge-a']] });
    expect(day('2026-10-06', '2026-10-06', session).makeup).toBeUndefined();
  });

  it('pushes Forge B to Friday when Forge A lands on Wednesday, and moves restoration to Thursday', () => {
    const today = '2026-10-07';
    expect(titles(today, today)[0]).toBe('Forge A');
    const thursday = day('2026-10-08', today);
    expect(thursday.makeup?.primary.weekday).toBe(3);
    expect(getDayOrders(thursday).find((o) => o.kind === 'weekly')?.guidance).toContain(
      'moved from Wednesday',
    );
    const friday = titles('2026-10-09', today);
    expect(friday[0]).toBe('Forge B');
    expect(friday.slice(1).every((title) => title.endsWith('(optional)'))).toBe(true);
  });

  it('drops Forge A after three missed days and keeps Forge B on Thursday', () => {
    expect(day('2026-10-08', '2026-10-08').makeup).toBeUndefined();
    expect(titles('2026-10-08', '2026-10-08')[0]).toBe('Forge B');
  });

  it('moves a missed Forge B to Friday, then Saturday', () => {
    const done = history([['2026-10-05', '2026-10-05']]);
    expect(titles('2026-10-09', '2026-10-09', done)[0]).toBe('Forge B');
    expect(titles('2026-10-10', '2026-10-10', done)[0]).toBe('Forge B');
  });

  it('treats a Red day as moved, not done, even with restoration recorded', () => {
    const red = history([['2026-10-05', '2026-10-05']], { red: ['2026-10-05'] });
    expect(titles('2026-10-06', '2026-10-06', red)[0]).toBe('Forge A');
  });

  it('opens a three-Forge week after Forge B is missed Thursday through Saturday', () => {
    const done = history([['2026-10-05', '2026-10-05']]);
    const today = '2026-10-12';
    const monday = day(today, today, done);
    expect(getActivityChoices(monday)[0].id).toBe(mainId('2026-10-08'));
    expect(getDayOrders(monday).find((o) => o.kind === 'weekly')?.guidance).toContain(
      'three-Forge week',
    );
    expect(titles('2026-10-14', today, done)[0]).toBe('Forge A');
    expect(day('2026-10-15', today, done).makeup?.primary.weekday).toBe(3);
    expect(titles('2026-10-16', today, done)[0]).toBe('Forge B');
    // Friday's walk joins Tuesday's, and the longer one is kept.
    expect(titles('2026-10-13', today, done)[0]).toMatch(/walk/i);
  });

  it('does not read last week’s Forge B, done on Monday, as this week’s', () => {
    const done = history([['2026-10-05', '2026-10-05']], {
      sessions: [['2026-10-12', 'chapter-1-forge-b']],
    });
    expect(titles('2026-10-16', '2026-10-16', done)[0]).toBe('Forge B');
  });

  it('never moves anything into or inside a deload week', () => {
    const weekThree = history([['2026-10-19', '2026-10-19']]);
    expect(day('2026-10-26', '2026-10-26', weekThree).makeup).toBeUndefined();
    expect(day('2026-10-27', '2026-10-27').makeup).toBeUndefined();
  });
});
