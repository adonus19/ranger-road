import { describe, expect, it } from 'vitest';
import {
  buildIntervalSegments,
  describeIntervalPlan,
  intervalProgress,
  isValidIntervalPlan,
} from './interval-plan';

describe('interval plans', () => {
  const weekFive = {
    warmupMinutes: 5,
    rounds: 6,
    briskSeconds: 60,
    easySeconds: 120,
    cooldownMinutes: 7,
  };

  it('builds warm-up, alternating rounds, and cooldown into 30 minutes for Week 5', () => {
    const segments = buildIntervalSegments(weekFive);
    expect(segments).toHaveLength(14);
    expect(segments[0]).toEqual({ phase: 'warmup', seconds: 300, startsAt: 0 });
    expect(segments[1]).toEqual({ phase: 'brisk', round: 1, seconds: 60, startsAt: 300 });
    expect(segments[2]).toEqual({ phase: 'easy', round: 1, seconds: 120, startsAt: 360 });
    expect(segments.at(-1)).toMatchObject({ phase: 'cooldown', startsAt: 1380 });
    const last = segments.at(-1)!;
    expect(last.startsAt + last.seconds).toBe(30 * 60);
  });

  it('has no warm-up or cooldown when the pack gives none', () => {
    const segments = buildIntervalSegments({ rounds: 5, briskSeconds: 60, easySeconds: 120 });
    expect(segments.map((segment) => segment.phase)).toEqual([
      'brisk',
      'easy',
      'brisk',
      'easy',
      'brisk',
      'easy',
      'brisk',
      'easy',
      'brisk',
      'easy',
    ]);
  });

  it('finds the current segment and counts down to the next switch', () => {
    const segments = buildIntervalSegments(weekFive);
    expect(intervalProgress(segments, 0)).toMatchObject({ index: 0, remainingSeconds: 300 });
    expect(intervalProgress(segments, 299.2)).toMatchObject({ index: 0, remainingSeconds: 1 });
    expect(intervalProgress(segments, 300)).toMatchObject({ index: 1, remainingSeconds: 60 });
    expect(intervalProgress(segments, 361)).toMatchObject({ index: 2, remainingSeconds: 119 });
    const end = intervalProgress(segments, 1800);
    expect(end).toMatchObject({ done: true, segment: null, totalSeconds: 1800 });
  });

  it('describes plans in the pack’s own words', () => {
    expect(describeIntervalPlan(weekFive)).toBe(
      '5 minutes easy, then 6 rounds of 1 minute brisk / 2 minutes easy',
    );
    expect(describeIntervalPlan({ rounds: 6, briskSeconds: 90, easySeconds: 120 })).toBe(
      '6 rounds of 90 seconds brisk / 2 minutes easy',
    );
    expect(describeIntervalPlan({ rounds: 1, briskSeconds: 60, easySeconds: 60 })).toBe(
      '1 round of 1 minute brisk / 1 minute easy',
    );
  });

  it('accepts only whole numbers within sensible limits', () => {
    const ok = { rounds: 5, briskSeconds: 60, easySeconds: 120 };
    expect(isValidIntervalPlan(ok)).toBe(true);
    expect(isValidIntervalPlan({ ...ok, rounds: 0 })).toBe(false);
    expect(isValidIntervalPlan({ ...ok, rounds: 21 })).toBe(false);
    expect(isValidIntervalPlan({ ...ok, briskSeconds: 5 })).toBe(false);
    expect(isValidIntervalPlan({ ...ok, easySeconds: 601 })).toBe(false);
    expect(isValidIntervalPlan({ ...ok, easySeconds: 12.5 })).toBe(false);
    expect(isValidIntervalPlan({ ...ok, rounds: Number.NaN })).toBe(false);
  });
});
