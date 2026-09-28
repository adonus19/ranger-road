import { describe, expect, it } from 'vitest';
import {
  chapterOneWorkoutIsPlanned,
  chapterOneWorkoutsForDate,
} from './chapter-one-workout-access';

describe('Chapter I workout access', () => {
  const mondayStart = '2026-09-28';

  it('offers only the dated Forge session and as-needed restoration', () => {
    expect(chapterOneWorkoutsForDate(mondayStart, mondayStart)).toEqual([
      'chapter-1-forge-a',
      'chapter-1-restoration',
    ]);
    expect(chapterOneWorkoutsForDate(mondayStart, '2026-10-01')).toEqual([
      'chapter-1-forge-b',
      'chapter-1-restoration',
    ]);
    expect(chapterOneWorkoutIsPlanned(mondayStart, mondayStart, 'chapter-1-forge-a')).toBe(true);
    expect(chapterOneWorkoutIsPlanned(mondayStart, mondayStart, 'chapter-1-restoration')).toBe(
      false,
    );
  });

  it('uses Friday restoration as a dated choice and gives no workout before Day 1', () => {
    expect(chapterOneWorkoutIsPlanned(mondayStart, '2026-10-02', 'chapter-1-restoration')).toBe(
      true,
    );
    expect(chapterOneWorkoutsForDate(mondayStart, '2026-09-27')).toEqual([]);
  });
});
