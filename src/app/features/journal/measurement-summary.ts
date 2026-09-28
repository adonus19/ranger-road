import type { SavedMeasurement } from '../../core/domain/measurement';

const AMOUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** "221.6 lb", "41.5 in": whichever of the two an entry holds, in the units entered. */
export function weightAndWaist(entry: SavedMeasurement): string[] {
  return [
    entry.weight !== undefined ? `${AMOUNT.format(entry.weight)} lb` : '',
    entry.waist !== undefined ? `${AMOUNT.format(entry.waist)} in` : '',
  ].filter(Boolean);
}

/** Weight, waist, and "68 bpm" resting heart rate. */
export function bodyParts(entry: SavedMeasurement): string[] {
  return [
    ...weightAndWaist(entry),
    ...(entry.restingHeartRate !== undefined ? [`${entry.restingHeartRate} bpm`] : []),
  ];
}

/** "Squat to parallel", "Squat above parallel", "Squat below parallel". */
const SQUAT_VALUES = {
  'above-parallel': 'above parallel',
  parallel: 'to parallel',
  'below-parallel': 'below parallel',
} as const;

/** One measure: its value, with the name that reads before or after it. */
export interface MeasurementPart {
  before?: string;
  value: string;
  after?: string;
}

/**
 * The saved entry as short lines, so none ends on a separator: body, blood pressure,
 * push-ups with toe reach, squat depth, the pull-up band (free text, so on its own),
 * then energy and capability.
 */
export function measurementParts(entry: SavedMeasurement): MeasurementPart[][] {
  const counts: MeasurementPart[] = [
    ...(entry.pushups !== undefined ? [{ value: String(entry.pushups), after: 'push-ups' }] : []),
    ...(entry.toeReach !== undefined
      ? [{ before: 'Toe reach', value: `${AMOUNT.format(entry.toeReach)} in` }]
      : []),
  ];
  const feel: MeasurementPart[] = [
    ...(entry.energy !== undefined ? [{ before: 'Energy', value: String(entry.energy) }] : []),
    ...(entry.capabilityRating !== undefined
      ? [{ before: 'Capability', value: String(entry.capabilityRating) }]
      : []),
  ];
  const lines: MeasurementPart[][] = [
    bodyParts(entry).map((value) => ({ value })),
    entry.bloodPressure
      ? [{ before: 'Blood pressure', value: `${entry.bloodPressure.systolic}/${entry.bloodPressure.diastolic}` }]
      : [],
    counts,
    entry.squatDepth ? [{ before: 'Squat', value: SQUAT_VALUES[entry.squatDepth] }] : [],
    entry.pullupAssistance ? [{ before: 'Pull-up:', value: entry.pullupAssistance }] : [],
    feel,
  ];
  return lines.filter((parts) => parts.length);
}

/** The same lines as plain text, such as "14 push-ups · Toe reach 3 in". */
export function measurementLines(entry: SavedMeasurement): string[] {
  return measurementParts(entry).map((parts) =>
    parts.map((part) => [part.before, part.value, part.after].filter(Boolean).join(' ')).join(' · '),
  );
}
