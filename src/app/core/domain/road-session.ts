import type { RoadSession } from './models';

export interface RoadSessionInput extends Omit<RoadSession, 'id'> {
  id: string;
}

/** A saved road session records the effort as reported; it never calculates a next target. */
export function createRoadSession(input: RoadSessionInput): RoadSession & { id: string } {
  const id = input.id.trim();
  if (!id) {
    throw new Error('A road session needs an identifier.');
  }

  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || !Number.isFinite(date.getTime())
    || date.toISOString().slice(0, 10) !== input.date) {
    throw new RangeError('Enter a valid session date.');
  }

  requirePositive(input.distance, 'Distance');
  requirePositive(input.duration, 'Duration');
  requireIntegerRange(input.rpe, 1, 10, 'Effort');

  const terrain = input.terrain.trim();
  if (!terrain) {
    throw new Error('Describe the terrain.');
  }

  requireOptionalNonnegative(input.elevationGain, 'Elevation gain');
  requireOptionalNonnegative(input.ruckLoad, 'Ruck load');
  if (input.avgHeartRate !== undefined) {
    requirePositive(input.avgHeartRate, 'Average heart rate');
    if (!Number.isInteger(input.avgHeartRate)) {
      throw new RangeError('Average heart rate must be a whole number.');
    }
  }
  if (input.painBefore !== undefined) {
    requireIntegerRange(input.painBefore, 0, 10, 'Pain before');
  }
  if (input.painAfter !== undefined) {
    requireIntegerRange(input.painAfter, 0, 10, 'Pain after');
  }

  return {
    id,
    date: input.date,
    distance: input.distance,
    duration: input.duration,
    terrain,
    rpe: input.rpe,
    ...(input.elevationGain !== undefined ? { elevationGain: input.elevationGain } : {}),
    ...(input.ruckLoad !== undefined ? { ruckLoad: input.ruckLoad } : {}),
    ...(input.avgHeartRate !== undefined ? { avgHeartRate: input.avgHeartRate } : {}),
    ...(input.painBefore !== undefined ? { painBefore: input.painBefore } : {}),
    ...(input.painAfter !== undefined ? { painAfter: input.painAfter } : {}),
  };
}

function requirePositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be greater than zero.`);
  }
}

function requireOptionalNonnegative(value: number | undefined, field: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError(`${field} cannot be negative.`);
  }
}

function requireIntegerRange(value: number, min: number, max: number, field: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${field} must be a whole number from ${min} to ${max}.`);
  }
}
