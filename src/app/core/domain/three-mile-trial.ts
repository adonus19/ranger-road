import type { TrialPhaseResult, TrialResult } from './models';
import type { SavedTrialResult } from './trial';
import { isLocalDate } from '../program/campaign';
import {
  THREE_MILE_TRIAL_CONTENT_VERSION,
  threeMileTrialDefinition,
} from '../program/chapter-two-trial.seed';

/** Plain words for the carry's grip, core and posture, never a number. */
export const CARRY_DIFFICULTIES = ['easy', 'moderate', 'hard'] as const;
export type CarryDifficulty = (typeof CARRY_DIFFICULTIES)[number];

/** The pack's carry load: 30 lb, 60 seconds in each hand. */
export const THREE_MILE_CARRY_POUNDS = 30;
export const THREE_MILE_CARRY_SECONDS = 60;

/**
 * Whether one phase holds everything "as written" in 02_THE_ROAD.md. Pain and readiness are
 * checked separately by the draft rules.
 */
export function threeMilePhaseComplete(phase: TrialPhaseResult, index: number): boolean {
  try {
    if (phase.phaseId !== threeMileTrialDefinition.phases[index]?.id) return false;
    const metrics = phase.metrics ?? {};
    const responses = phase.responses ?? {};
    switch (index) {
      case 0:
        return (
          atLeast(metrics['distanceMiles'], 3) &&
          atLeast(metrics['durationMinutes'], Number.EPSILON) &&
          wholeInRange(metrics['rpe'], 1, 10) &&
          (metrics['averageHeartRate'] === undefined ||
            atLeast(metrics['averageHeartRate'], Number.EPSILON)) &&
          present(responses['knee']) &&
          present(responses['back']) &&
          present(responses['recoveryAfterFiveMinutes'])
        );
      case 1:
        return (
          atLeast(metrics['loadPounds'], THREE_MILE_CARRY_POUNDS) &&
          atLeast(metrics['rightSeconds'], THREE_MILE_CARRY_SECONDS) &&
          atLeast(metrics['leftSeconds'], THREE_MILE_CARRY_SECONDS) &&
          ['grip', 'core', 'posture'].every((key) =>
            (CARRY_DIFFICULTIES as readonly string[]).includes(responses[key] ?? ''),
          )
        );
      case 2:
        return metrics['flights'] === 3 && wholeInRange(metrics['breathlessness'], 1, 10);
      case 3:
        return present(responses['attentive']) && present(responses['behavior']);
      case 4:
        return metrics['confirmed'] === true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Revalidate a completed Three-Mile Trial at the storage boundary. */
export function validateCompletedThreeMileTrialResult(result: TrialResult): SavedTrialResult {
  const id = result.id?.trim();
  if (!id) throw new Error('A Three-Mile Trial result needs an identifier.');
  if (result.trialId !== threeMileTrialDefinition.id) {
    throw new Error('This result must refer to the Three-Mile Trial.');
  }
  if (!isLocalDate(result.date)) throw new RangeError('Enter a valid Three-Mile Trial date.');
  if (!result.recordedAt || !Number.isFinite(Date.parse(result.recordedAt))) {
    throw new RangeError('A Three-Mile Trial result needs the time it was recorded.');
  }
  const readinessId = result.readinessId?.trim();
  if (!readinessId) throw new Error('A completed Three-Mile Trial needs its readiness check.');
  const snapshot = result.definitionSnapshot;
  const expected = threeMileTrialDefinition.phases.map((phase) => phase.id);
  if (
    !snapshot ||
    snapshot.id !== threeMileTrialDefinition.id ||
    snapshot.chapterId !== threeMileTrialDefinition.chapterId ||
    snapshot.contentVersion !== THREE_MILE_TRIAL_CONTENT_VERSION ||
    snapshot.phases.length !== expected.length ||
    snapshot.phases.some((phase, index) => phase?.id !== expected[index])
  ) {
    throw new Error('A completed Three-Mile Trial needs its matching definition snapshot.');
  }
  if (
    !Array.isArray(result.phaseResults) ||
    result.phaseResults.length !== expected.length ||
    result.phaseResults.some((phase, index) => !threeMilePhaseComplete(phase, index))
  ) {
    throw new Error('Complete all five Three-Mile Trial parts as written.');
  }
  const reflection = result.reflection?.trim();
  if (!reflection) throw new Error('Record the leadership reflection.');
  if (result.photoAsset !== undefined && !result.photoAsset.trim()) {
    throw new Error('An attached photo needs an asset reference.');
  }
  return {
    id,
    trialId: result.trialId,
    date: result.date,
    recordedAt: result.recordedAt,
    readinessId,
    definitionSnapshot: structuredClone(snapshot),
    phaseResults: structuredClone(result.phaseResults),
    reflection,
    ...(result.photoAsset ? { photoAsset: result.photoAsset.trim() } : {}),
  };
}

/** The saved reflection line, kept with the result for later review. */
export function threeMileReflection(phases: readonly TrialPhaseResult[]): string {
  const answers = phases[3]?.responses ?? {};
  return [
    `Attentive: ${answers['attentive'] ?? ''}`,
    `Behavior to change: ${answers['behavior'] ?? ''}`,
  ].join('\n');
}

function present(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim());
}

function atLeast(value: unknown, minimum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum;
}

function wholeInRange(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}
