import { describe, expect, it } from 'vitest';
import type { ReadinessFactors } from './readiness';
import { classifyReadiness } from './readiness';

const ready: ReadinessFactors = {
  sleepHours: 7,
  poorSleep: false,
  energy: 3,
  backPain: 0,
  shoulderPain: 2,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
};

describe('classifyReadiness', () => {
  it('uses the reported sleep quality rather than an invented hour cutoff', () => {
    expect(classifyReadiness({ ...ready, sleepHours: 5, poorSleep: false })).toBe('green');
    expect(classifyReadiness({ ...ready, sleepHours: 8, poorSleep: true })).toBe('yellow');
  });

  it.each([
    { energy: 2 },
    { backPain: 3 },
    { shoulderPain: 4 },
    { neckPain: 3 },
  ])('marks documented reduced-session conditions yellow: %j', (change) => {
    expect(classifyReadiness({ ...ready, ...change })).toBe('yellow');
  });

  it.each([
    { energy: 1 },
    { backPain: 5 },
    { shoulderPain: 10 },
    { neckPain: 7 },
  ])('marks documented severe ratings red: %j', (change) => {
    expect(classifyReadiness({ ...ready, poorSleep: true, ...change })).toBe('red');
  });

  it.each([
    'significantSymptomIncrease',
    'newNeurologicalOrRadiatingSymptoms',
    'illness',
    'otherConcerningSymptoms',
  ] as const)('gives %s priority over a yellow condition', (flag) => {
    expect(
      classifyReadiness({
        ...ready,
        energy: 2,
        redFlags: { ...ready.redFlags, [flag]: true },
      }),
    ).toBe('red');
  });

  it('rejects out-of-range values instead of treating them as ready', () => {
    expect(() => classifyReadiness({ ...ready, energy: 0 })).toThrow(RangeError);
    expect(() => classifyReadiness({ ...ready, energy: 2.5 })).toThrow(RangeError);
    expect(() => classifyReadiness({ ...ready, backPain: 11 })).toThrow(RangeError);
    expect(() => classifyReadiness({ ...ready, sleepHours: Number.NaN })).toThrow(RangeError);
  });
});
