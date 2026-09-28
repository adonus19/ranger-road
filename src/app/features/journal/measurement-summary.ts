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
const SQUAT_PHRASES = {
  'above-parallel': 'Squat above parallel',
  parallel: 'Squat to parallel',
  'below-parallel': 'Squat below parallel',
} as const;

/**
 * The saved entry as short lines, so none ends on a separator: body, blood pressure,
 * push-ups with toe reach, squat depth, the pull-up band (free text, so on its own),
 * then energy and capability.
 */
export function measurementLines(entry: SavedMeasurement): string[] {
  const counts = [
    entry.pushups !== undefined ? `${entry.pushups} push-ups` : '',
    entry.toeReach !== undefined ? `Toe reach ${AMOUNT.format(entry.toeReach)} in` : '',
  ].filter(Boolean);
  const feel = [
    entry.energy !== undefined ? `Energy ${entry.energy}` : '',
    entry.capabilityRating !== undefined ? `Capability ${entry.capabilityRating}` : '',
  ].filter(Boolean);
  return [
    bodyParts(entry),
    entry.bloodPressure
      ? [`Blood pressure ${entry.bloodPressure.systolic}/${entry.bloodPressure.diastolic}`]
      : [],
    counts,
    entry.squatDepth ? [SQUAT_PHRASES[entry.squatDepth]] : [],
    entry.pullupAssistance ? [`Pull-up: ${entry.pullupAssistance}`] : [],
    feel,
  ]
    .filter((parts) => parts.length)
    .map((parts) => parts.join(' · '));
}
