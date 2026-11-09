import type {
  LocalDate,
  TrialCircuitPrescription,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
} from './models';
import type { SavedTrialResult } from './trial';
import { isLocalDate } from '../program/campaign';
import {
  HIGH_COUNTRY_TRIAL_CONTENT_VERSION,
  highCountryTrialDefinition,
} from '../program/chapter-three-trial.seed';

/**
 * The trial's pieces on separate days (03_THE_HIGH_COUNTRY.md): the hike holds the pre-start
 * plan, the hike, the location estimate and the high point; the circuit follows on a later
 * Green day. On the trail the turnaround is at pain 4 or more (decided 2026-11-09), so pain at
 * 3 does not stop the hike; the circuit keeps the usual limit of 3.
 */
export const HIGH_COUNTRY_PIECES = [
  { id: 'hike', title: 'The hike', firstPhase: 0, lastPhase: 3, painLimit: 4 },
  { id: 'circuit', title: 'The circuit', firstPhase: 4, lastPhase: 4, painLimit: 3 },
] as const;

/** The winter stand-in is one continuous walk of 1.5–2 hours, never on a treadmill. */
export const STAND_IN_MINUTES = 90;
export const STAND_IN_TERRAIN = ['outdoor', 'indoor-track'] as const;

export const PLAN_FIELDS = [
  'direction',
  'junctions',
  'expectedDistance',
  'expectedElevation',
  'turnaroundPoint',
  'turnaroundTime',
] as const;

/** How many checkpoint estimates the stand-in can hold; the real hike needs one. */
export const MAX_LOCATION_ESTIMATES = 6;

/**
 * Whether one phase holds everything "as written". Pain and readiness are checked separately
 * by the draft rules.
 */
export function highCountryPhaseComplete(phase: TrialPhaseResult, index: number): boolean {
  try {
    if (phase.phaseId !== highCountryTrialDefinition.phases[index]?.id) return false;
    const metrics = phase.metrics ?? {};
    const responses = phase.responses ?? {};
    switch (index) {
      case 0:
        return PLAN_FIELDS.every((field) => present(responses[field]));
      case 1: {
        const standIn = metrics['standIn'] === true;
        return (
          atLeast(metrics['durationMinutes'], standIn ? STAND_IN_MINUTES : Number.EPSILON) &&
          atLeast(metrics['distanceMiles'], Number.EPSILON) &&
          wholeInRange(metrics['rpe'], 1, 10) &&
          (metrics['elevationGainFeet'] === undefined ||
            atLeast(metrics['elevationGainFeet'], 0)) &&
          present(responses['knee']) &&
          present(responses['back']) &&
          (!standIn || (STAND_IN_TERRAIN as readonly string[]).includes(responses['terrain'] ?? ''))
        );
      }
      case 2:
        return present(responses['estimate-1']);
      case 3:
        return metrics['quietMinutesDone'] === true && present(responses['reflection']);
      case 4:
        return circuitComplete(phase, highCountryTrialDefinition.phases[4].circuit!);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Every round and station as prescribed: reps or seconds at or above the written dose. */
export function circuitComplete(
  phase: TrialPhaseResult,
  prescription: TrialCircuitPrescription,
): boolean {
  const rounds = phase.circuitRounds;
  if (!rounds || rounds.length !== prescription.rounds) return false;
  return Array.from({ length: prescription.rounds }, (_, i) => i + 1).every((number) => {
    const round = rounds.find((item) => item.round === number);
    return (
      round?.movements.length === prescription.movements.length &&
      prescription.movements.every((planned) => {
        const actual = round.movements.find((item) => item.exerciseId === planned.exerciseId);
        if (!actual) return false;
        if (planned.reps !== undefined) {
          return planned.perSide
            ? whole(actual.repsBySide?.left, planned.reps) &&
                whole(actual.repsBySide?.right, planned.reps)
            : whole(actual.reps, planned.reps);
        }
        return planned.perSide
          ? atLeast(actual.durationSecondsBySide?.left, planned.durationSeconds!) &&
              atLeast(actual.durationSecondsBySide?.right, planned.durationSeconds!)
          : atLeast(actual.durationSeconds, planned.durationSeconds!);
      })
    );
  });
}

/** Revalidate a completed High Country Trial at the storage boundary. */
export function validateCompletedHighCountryTrialResult(result: TrialResult): SavedTrialResult {
  const id = result.id?.trim();
  if (!id) throw new Error('A High Country Trial result needs an identifier.');
  if (result.trialId !== highCountryTrialDefinition.id) {
    throw new Error('This result must refer to the High Country Trial.');
  }
  if (!isLocalDate(result.date)) throw new RangeError('Enter a valid High Country Trial date.');
  if (!result.recordedAt || !Number.isFinite(Date.parse(result.recordedAt))) {
    throw new RangeError('A High Country Trial result needs the time it was recorded.');
  }
  const readinessId = result.readinessId?.trim();
  if (!readinessId) throw new Error('A completed High Country Trial needs its readiness check.');
  const snapshot = result.definitionSnapshot;
  const expected = highCountryTrialDefinition.phases.map((phase) => phase.id);
  if (
    !snapshot ||
    snapshot.id !== highCountryTrialDefinition.id ||
    snapshot.contentVersion !== HIGH_COUNTRY_TRIAL_CONTENT_VERSION ||
    snapshot.phases.length !== expected.length ||
    snapshot.phases.some((phase, index) => phase?.id !== expected[index])
  ) {
    throw new Error('A completed High Country Trial needs its matching definition snapshot.');
  }
  if (
    !Array.isArray(result.phaseResults) ||
    result.phaseResults.length !== expected.length ||
    result.phaseResults.some((phase, index) => !highCountryPhaseComplete(phase, index))
  ) {
    throw new Error('Complete every High Country Trial part as written.');
  }
  const pieces = result.pieces;
  if (
    !pieces ||
    pieces.length !== HIGH_COUNTRY_PIECES.length ||
    pieces.some(
      (piece, index) =>
        piece.pieceId !== HIGH_COUNTRY_PIECES[index].id || !piece.completedAt || !piece.date,
    ) ||
    pieces[0].date >= pieces[1].date ||
    pieces.at(-1)!.date !== result.date
  ) {
    throw new Error('The hike and the circuit each need their own day, the circuit later.');
  }
  const reflection = result.reflection?.trim();
  if (!reflection) throw new Error('Record the high-point answer.');
  return {
    id,
    trialId: result.trialId,
    date: result.date,
    recordedAt: result.recordedAt,
    readinessId,
    definitionSnapshot: structuredClone(snapshot),
    phaseResults: structuredClone(result.phaseResults),
    pieces: structuredClone(pieces),
    reflection,
  };
}

/** The day the hike was finished, from the open draft or a saved pass; null before that. */
export function hikeFinishedOn(
  draft: Pick<TrialDraft, 'trialId' | 'pieces'> | null | undefined,
  results: readonly Pick<TrialResult, 'trialId' | 'pieces'>[],
): LocalDate | null {
  const hike = (record: { trialId: string; pieces?: TrialDraft['pieces'] }) =>
    record.trialId === highCountryTrialDefinition.id
      ? record.pieces?.find((piece) => piece.pieceId === 'hike' && piece.completedAt)?.date
      : undefined;
  return (draft ? hike(draft) : undefined) ?? results.map(hike).find(Boolean) ?? null;
}

/**
 * Week 12's Hearth part (d), "after the trial, tell your spouse your answer to the high-point
 * question": shown on Keep from the day the hike is finished until it is marked Done on an
 * earlier day (decided 2026-11-09). Done today stays shown so it can be undone.
 */
export function highPointTellStatus(
  hikeDate: LocalDate | null,
  today: LocalDate,
  doneDates: readonly LocalDate[],
): 'due' | 'done-today' | null {
  if (!hikeDate || today < hikeDate) return null;
  if (doneDates.includes(today)) return 'done-today';
  return doneDates.some((date) => date < today) ? null : 'due';
}

/** The saved reflection: the high-point answer. */
export function highCountryReflection(phases: readonly TrialPhaseResult[]): string {
  return phases[3]?.responses?.['reflection']?.trim() ?? '';
}

function present(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim());
}

function atLeast(value: unknown, minimum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum;
}

function whole(value: unknown, minimum: number): boolean {
  return Number.isInteger(value) && (value as number) >= minimum;
}

function wholeInRange(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}
