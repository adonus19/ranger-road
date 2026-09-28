import { describe, expect, it } from 'vitest';
import { createRoadSession, type RoadSessionInput } from './road-session';

const valid: RoadSessionInput = {
  id: 'road-1',
  date: '2026-09-25',
  distance: 2,
  duration: 38,
  terrain: 'Paved path',
  rpe: 5,
};

describe('createRoadSession', () => {
  it('records the reported effort without adding load or changing the input', () => {
    const input: RoadSessionInput = {
      ...valid,
      terrain: '  Mixed trail  ',
      elevationGain: 120,
      ruckLoad: 0,
      avgHeartRate: 124,
      painBefore: 2,
      painAfter: 4,
    };
    const record = createRoadSession(input);

    expect(record).toEqual({ ...input, terrain: 'Mixed trail' });
    expect(input.terrain).toBe('  Mixed trail  ');
    expect(createRoadSession(valid)).not.toHaveProperty('ruckLoad');
  });

  it.each([
    ['missing ID', { id: ' ' }],
    ['invalid date', { date: '2026-02-30' }],
    ['zero distance', { distance: 0 }],
    ['negative distance', { distance: -1 }],
    ['nonfinite distance', { distance: Number.POSITIVE_INFINITY }],
    ['zero duration', { duration: 0 }],
    ['negative duration', { duration: -1 }],
    ['blank terrain', { terrain: '  ' }],
    ['zero RPE', { rpe: 0 }],
    ['RPE over 10', { rpe: 11 }],
    ['fractional RPE', { rpe: 2.5 }],
    ['negative elevation', { elevationGain: -1 }],
    ['negative ruck load', { ruckLoad: -1 }],
    ['zero heart rate', { avgHeartRate: 0 }],
    ['fractional heart rate', { avgHeartRate: 80.5 }],
    ['negative pain', { painBefore: -1 }],
    ['pain over 10', { painAfter: 11 }],
    ['fractional pain', { painAfter: 2.5 }],
  ])('rejects %s', (_label, change) => {
    expect(() => createRoadSession({ ...valid, ...change })).toThrow();
  });
});
