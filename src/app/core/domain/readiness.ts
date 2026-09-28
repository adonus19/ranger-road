import type { ReadinessInput, ReadinessStatus } from './models';

export type ReadinessFactors = Omit<ReadinessInput, 'date'>;

/** The documented red rules take priority when more than one rule applies. */
export function classifyReadiness(input: ReadinessFactors): ReadinessStatus {
  requireRange(input.sleepHours, 0, 24, 'Sleep hours');
  requireRange(input.energy, 1, 5, 'Energy', true);
  requireRange(input.backPain, 0, 10, 'Back pain', true);
  requireRange(input.shoulderPain, 0, 10, 'Shoulder pain', true);
  requireRange(input.neckPain, 0, 10, 'Neck pain', true);

  const pain = Math.max(input.backPain, input.shoulderPain, input.neckPain);
  const flags = input.redFlags;
  if (
    input.energy === 1 ||
    pain >= 5 ||
    flags.significantSymptomIncrease ||
    flags.newNeurologicalOrRadiatingSymptoms ||
    flags.illness ||
    flags.otherConcerningSymptoms
  ) {
    return 'red';
  }

  if (input.poorSleep || input.energy === 2 || pain >= 3) {
    return 'yellow';
  }

  return 'green';
}

function requireRange(
  value: number,
  min: number,
  max: number,
  field: string,
  integer = false,
): void {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${field} must be between ${min} and ${max}.`);
  }
}
