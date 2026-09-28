import { describe, expect, it } from 'vitest';
import { describeRoadPain, describeRoadSession } from './road-session-summary';

const walk = {
  id: 'road-1',
  date: '2026-09-26',
  distance: 2,
  duration: 40,
  terrain: 'Trail',
  rpe: 5,
};

describe('road session summary', () => {
  it('reads back the walk in the units entered, without trailing zeros', () => {
    expect(describeRoadSession(walk)).toBe('2 mi · 40 min · Trail · Effort 5');
    expect(describeRoadSession({ ...walk, distance: 2.25 })).toBe(
      '2.25 mi · 40 min · Trail · Effort 5',
    );
  });

  it('names pain only when it was recorded, including a zero', () => {
    expect(describeRoadPain(walk)).toBeNull();
    expect(describeRoadPain({ ...walk, painBefore: 0 })).toBe('Pain 0 before');
    expect(describeRoadPain({ ...walk, painBefore: 2, painAfter: 3 })).toBe(
      'Pain 2 before, 3 after',
    );
  });
});
