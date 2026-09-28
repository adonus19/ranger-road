import type {
  LocalDate,
  MeasurementEntry,
  MeasurementKind,
  ReadinessCheck,
  ReadinessSummary,
  SquatDepth,
} from './models';

export type SavedMeasurement = MeasurementEntry & { id: string };

const KINDS: readonly MeasurementKind[] = ['check-in', 'body', 'tests'];
export const SQUAT_DEPTHS: readonly SquatDepth[] = ['above-parallel', 'parallel', 'below-parallel'];

const BODY_FIELDS = ['weight', 'waist'] as const;
const CHECK_IN_ONLY_FIELDS = ['restingHeartRate', 'bloodPressure', 'energy', 'capabilityRating'] as const;
const TEST_FIELDS = ['pushups', 'pullupAssistance', 'squatDepth', 'toeReach'] as const;

/** Records what was measured as entered; it never sets or implies a target. */
export function createMeasurementEntry(input: SavedMeasurement): SavedMeasurement {
  const id = input.id.trim();
  if (!id) {
    throw new Error('A measurement needs an identifier.');
  }
  if (!KINDS.includes(input.kind)) {
    throw new RangeError('Unknown measurement kind.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || new Date(`${input.date}T00:00:00.000Z`).toISOString().slice(0, 10) !== input.date) {
    throw new RangeError('Enter a valid measurement date.');
  }
  if (!input.recordedAt || !Number.isFinite(Date.parse(input.recordedAt))) {
    throw new RangeError('A measurement needs the time it was recorded.');
  }

  requireOptionalRange(input.weight, 0, 1000, 'Weight', { exclusiveMin: true });
  requireOptionalRange(input.waist, 0, 100, 'Waist', { exclusiveMin: true });
  requireOptionalRange(input.restingHeartRate, 20, 250, 'Resting heart rate', { whole: true });
  if (input.bloodPressure) {
    const { systolic, diastolic } = input.bloodPressure;
    requireOptionalRange(systolic, 50, 300, 'Systolic pressure', { whole: true });
    requireOptionalRange(diastolic, 20, 200, 'Diastolic pressure', { whole: true });
    if (systolic <= diastolic) {
      throw new RangeError('The first blood pressure number is the higher one.');
    }
  }
  requireOptionalRange(input.pushups, 0, 500, 'Push-ups', { whole: true });
  const pullupAssistance = input.pullupAssistance?.trim();
  if (input.pullupAssistance !== undefined && (!pullupAssistance || pullupAssistance.length > 60)) {
    throw new RangeError('Describe the pull-up band in 60 characters or fewer.');
  }
  if (input.squatDepth !== undefined && !SQUAT_DEPTHS.includes(input.squatDepth)) {
    throw new RangeError('Choose a squat depth.');
  }
  requireOptionalRange(input.toeReach, 0, 60, 'Toe reach');
  requireOptionalRange(input.energy, 1, 5, 'Energy', { whole: true });
  requireOptionalRange(input.capabilityRating, 1, 5, 'Capability', { whole: true });

  const has = (field: keyof MeasurementEntry) => input[field] !== undefined;
  if (input.kind === 'check-in') {
    if (!has('weight') || !has('waist') || !has('restingHeartRate')) {
      throw new Error('A check-in needs weight, waist, and resting heart rate.');
    }
    if (input.testsHeld && TEST_FIELDS.some(has)) {
      throw new Error('Tests held for a Red day cannot also be recorded.');
    }
  } else {
    const allowed: readonly (keyof MeasurementEntry)[] =
      input.kind === 'body' ? BODY_FIELDS : TEST_FIELDS;
    if (!allowed.some(has)) {
      throw new Error(
        input.kind === 'body' ? 'Enter a weight or a waist measurement.' : 'Enter at least one test.',
      );
    }
    const extra = [...BODY_FIELDS, ...CHECK_IN_ONLY_FIELDS, ...TEST_FIELDS]
      .filter((field) => !allowed.includes(field))
      .some(has);
    if (extra || input.testsHeld || input.readinessSummary) {
      throw new Error(`A ${input.kind} entry holds only its own measurements.`);
    }
  }

  const { bloodPressure, readinessSummary } = input;
  return {
    id,
    kind: input.kind,
    date: input.date,
    recordedAt: input.recordedAt,
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
    ...(input.waist !== undefined ? { waist: input.waist } : {}),
    ...(input.restingHeartRate !== undefined ? { restingHeartRate: input.restingHeartRate } : {}),
    ...(bloodPressure ? { bloodPressure: { ...bloodPressure } } : {}),
    ...(input.pushups !== undefined ? { pushups: input.pushups } : {}),
    ...(pullupAssistance ? { pullupAssistance } : {}),
    ...(input.squatDepth !== undefined ? { squatDepth: input.squatDepth } : {}),
    ...(input.toeReach !== undefined ? { toeReach: input.toeReach } : {}),
    ...(input.energy !== undefined ? { energy: input.energy } : {}),
    ...(input.capabilityRating !== undefined ? { capabilityRating: input.capabilityRating } : {}),
    ...(input.testsHeld ? { testsHeld: true } : {}),
    ...(readinessSummary ? { readinessSummary: { ...readinessSummary } } : {}),
  };
}

/**
 * Averages sleep and pain over the readiness checks dated from `from` to `to`.
 * A day checked more than once counts its latest check, so a re-check never weighs double.
 */
export function summarizeReadiness(
  checks: readonly ReadinessCheck[],
  from: LocalDate,
  to: LocalDate,
): ReadinessSummary {
  const latestByDate = new Map<LocalDate, ReadinessCheck>();
  for (const check of checks) {
    if (check.date < from || check.date > to) {
      continue;
    }
    const kept = latestByDate.get(check.date);
    if (!kept || check.checkedAt > kept.checkedAt) {
      latestByDate.set(check.date, check);
    }
  }

  const days = [...latestByDate.values()];
  const summary: ReadinessSummary = { from, to, checks: days.length };
  if (!days.length) {
    return summary;
  }
  const average = (read: (check: ReadinessCheck) => number) =>
    Math.round((days.reduce((sum, check) => sum + read(check), 0) / days.length) * 100) / 100;
  return {
    ...summary,
    averageSleepHours: average((check) => check.sleepHours),
    averageBackPain: average((check) => check.backPain),
    averageShoulderPain: average((check) => check.shoulderPain),
    averageNeckPain: average((check) => check.neckPain),
  };
}

function requireOptionalRange(
  value: number | undefined,
  min: number,
  max: number,
  field: string,
  { whole = false, exclusiveMin = false } = {},
): void {
  if (value === undefined) {
    return;
  }
  const belowMin = exclusiveMin ? value <= min : value < min;
  if (!Number.isFinite(value) || belowMin || value > max || (whole && !Number.isInteger(value))) {
    throw new RangeError(`${field} is out of range.`);
  }
}
