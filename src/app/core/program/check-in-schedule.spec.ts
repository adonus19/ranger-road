import { describe, expect, it } from 'vitest';
import type { SavedMeasurement } from '../domain/measurement';
import { checkInSaveError, getCheckInStatus, getCheckInWindow, testsHeldFor } from './check-in-schedule';

const start = '2026-09-14';

function entry(kind: SavedMeasurement['kind'], date: string, extra: Partial<SavedMeasurement> = {}): SavedMeasurement {
  return { id: `${kind}-${date}`, kind, date, recordedAt: `${date}T12:00:00.000Z`, ...extra };
}

describe('getCheckInWindow', () => {
  it('opens on Day 1 and every 28 days after, and not before Day 1', () => {
    expect(getCheckInWindow(start, '2026-09-13')).toBeNull();
    expect(getCheckInWindow(start, '2026-09-14')).toEqual({
      index: 0,
      openDay: 1,
      start: '2026-09-14',
      end: '2026-10-11',
    });
    expect(getCheckInWindow(start, '2026-10-11')?.index).toBe(0);
    expect(getCheckInWindow(start, '2026-10-12')).toEqual({
      index: 1,
      openDay: 29,
      start: '2026-10-12',
      end: '2026-11-08',
    });
  });

  it('keeps the Day 1 cadence when a midweek start has a Chapter I lead-in', () => {
    expect(getCheckInWindow('2026-09-10', '2026-10-08')).toMatchObject({
      index: 1,
      openDay: 29,
      start: '2026-10-08',
    });
  });
});

describe('getCheckInStatus', () => {
  const window = getCheckInWindow(start, '2026-10-15')!;

  it('is due until a check-in is saved in the current window', () => {
    expect(getCheckInStatus([entry('check-in', '2026-09-14')], window)).toBe('due');
    expect(getCheckInStatus([entry('body', '2026-10-13', { weight: 220 })], window)).toBe('due');
    expect(getCheckInStatus([entry('check-in', '2026-10-13')], window)).toBe('done');
  });

  it('asks for the tests a Red day held until they are added', () => {
    const held = entry('check-in', '2026-10-12', { testsHeld: true });
    expect(getCheckInStatus([held], window)).toBe('tests');
    expect(
      getCheckInStatus([held, entry('tests', '2026-10-14', { recordedAt: '2026-10-14T12:00:00.000Z' })], window),
    ).toBe('done');
  });

  it('holds the tests only on a Red readiness day', () => {
    expect(testsHeldFor('red')).toBe(true);
    expect(testsHeldFor('yellow')).toBe(false);
    expect(testsHeldFor(undefined)).toBe(false);
  });
});

describe('checkInSaveError', () => {
  const held = entry('check-in', '2026-10-12', { testsHeld: true });

  it('allows one check-in per window, starting on Day 1', () => {
    expect(checkInSaveError(start, '2026-09-13', 'check-in', [], undefined)).toContain('Day 1');
    expect(checkInSaveError(start, '2026-10-12', 'check-in', [], undefined)).toBeNull();
    expect(checkInSaveError(start, '2026-10-13', 'check-in', [held], undefined)).toContain('already saved');
    expect(checkInSaveError(start, '2026-10-12', 'check-in', [], undefined, true)).toContain('Check readiness');
    expect(checkInSaveError(start, '2026-10-12', 'check-in', [], 'yellow', true)).toBeNull();
    expect(checkInSaveError(start, '2026-10-12', 'check-in', [], 'red', true)).toContain('Red');
  });

  it('allows held tests only on another non-Red day in the same window', () => {
    expect(checkInSaveError(start, '2026-10-13', 'tests', [], undefined)).toContain('Save this window');
    expect(checkInSaveError(start, '2026-10-12', 'tests', [held], 'green')).toContain('another day');
    expect(checkInSaveError(start, '2026-10-13', 'tests', [held], undefined)).toContain('Check readiness');
    expect(checkInSaveError(start, '2026-10-13', 'tests', [held], 'red')).toContain('Red');
    expect(checkInSaveError(start, '2026-10-13', 'tests', [held], 'green')).toBeNull();
    expect(checkInSaveError(start, '2026-10-14', 'tests', [held, entry('tests', '2026-10-13')], 'green')).toContain('no held tests');
    expect(checkInSaveError(start, '2026-11-09', 'tests', [held], 'green')).toContain('Save this window');
  });
});
