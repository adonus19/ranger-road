import { describe, expect, it } from 'vitest';
import { getSeasonalDays } from './seasonal-layer';

const keys = (date: string) => getSeasonalDays(date).map((day) => day.key);

describe('getSeasonalDays', () => {
  // Advent Sundays are the four Sundays before Christmas Day (FAITH_AND_LEADERSHIP.md).
  // Expected dates come from the published church calendars for each year.
  it.each([
    ['2026', ['2026-11-29', '2026-12-06', '2026-12-13', '2026-12-20']],
    ['2027', ['2027-11-28', '2027-12-05', '2027-12-12', '2027-12-19']],
    ['2028', ['2028-12-03', '2028-12-10', '2028-12-17', '2028-12-24']],
    ['2029', ['2029-12-02', '2029-12-09', '2029-12-16', '2029-12-23']],
    ['2030', ['2030-12-01', '2030-12-08', '2030-12-15', '2030-12-22']],
    // Christmas on a Sunday: Advent 4 is a full week before, never Christmas Day itself.
    ['2033', ['2033-11-27', '2033-12-04', '2033-12-11', '2033-12-18']],
  ])('puts Advent 1–4 on the right Sundays in %s', (_year, sundays) => {
    sundays.forEach((date, index) => {
      expect(keys(date)[0]).toBe(`advent-${index + 1}`);
    });
  });

  it('shows Christmas Eve and Christmas Day every year', () => {
    expect(keys('2026-12-24')).toEqual(['christmas-eve']);
    expect(keys('2026-12-25')).toEqual(['christmas-day']);
    expect(keys('2031-12-25')).toEqual(['christmas-day']);
  });

  it('shows both readings when Advent 4 falls on Christmas Eve', () => {
    expect(keys('2028-12-24')).toEqual(['advent-4', 'christmas-eve']);
  });

  it('shows nothing on an ordinary day', () => {
    for (const date of ['2026-11-10', '2026-11-22', '2026-12-23', '2026-12-26', '2027-06-06']) {
      expect(keys(date)).toEqual([]);
    }
  });

  it('carries the approved theme, reading and family question', () => {
    const [hope] = getSeasonalDays('2026-11-29');
    expect(hope).toMatchObject({
      title: 'Advent 1 · Hope',
      reference: 'Isaiah 9:2–7',
      question:
        'The child in this reading is given four names. Which one means the most to you right now, and why?',
    });
    const [eve] = getSeasonalDays('2026-12-24');
    expect(eve.reference).toBe('Luke 2:1–20');
    expect(eve.evening).toBe('One unhurried, phone-free family evening.');
    expect(getSeasonalDays('2026-12-25')[0].reference).toBe('John 1:1–14');
    expect(getSeasonalDays('2026-12-20')[0].reference).toBe('Matthew 1:18–25');
  });
});
