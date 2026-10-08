import type {
  IsoTimestamp,
  PostMissionFunction,
  RecoveryCapacity,
  RecoveryEnergy,
  RecoveryIrritability,
  RecoverySoreness,
  TrialResult,
} from './models';

/** NUTRITION_AND_RECOVERY.md: assess post-mission function 60–120 minutes after a major effort. */
export const RECOVERY_OPENS_MINUTES = 60;
export const RECOVERY_SUGGESTED_UNTIL_MINUTES = 120;
/** Keep offers the check for this long after the trial; the trial page offers it after that too. */
export const RECOVERY_REMINDER_HOURS = 12;
export const RECOVERY_NOTE_MAX = 500;

export interface RecoveryAnswers {
  energy: RecoveryEnergy;
  soreness: RecoverySoreness;
  irritability: RecoveryIrritability;
  helpAtHome: RecoveryCapacity;
  familyLife: RecoveryCapacity;
}

export interface RecoveryArea {
  key: keyof RecoveryAnswers;
  label: string;
  choices: readonly { value: string; label: string }[];
}

const CAPACITY = [
  { value: 'not-really', label: 'Not really' },
  { value: 'partly', label: 'Partly' },
  { value: 'fully', label: 'Fully' },
] as const;

/** The five documented areas, each answered with one of three words, hardest first. */
export const RECOVERY_AREAS: readonly RecoveryArea[] = [
  {
    key: 'energy',
    label: 'Energy',
    choices: [
      { value: 'low', label: 'Low' },
      { value: 'steady', label: 'Steady' },
      { value: 'good', label: 'Good' },
    ],
  },
  {
    key: 'soreness',
    label: 'Soreness',
    choices: [
      { value: 'sore', label: 'Sore' },
      { value: 'a-little', label: 'A little' },
      { value: 'not-sore', label: 'Not sore' },
    ],
  },
  {
    key: 'irritability',
    label: 'Irritability',
    choices: [
      { value: 'irritable', label: 'Irritable' },
      { value: 'a-little', label: 'A little' },
      { value: 'calm', label: 'Calm' },
    ],
  },
  { key: 'helpAtHome', label: 'Helping at home', choices: CAPACITY },
  { key: 'familyLife', label: 'Family life', choices: CAPACITY },
];

export interface RecoveryInput extends RecoveryAnswers {
  id: string;
  trialResultId: string;
  note?: string;
}

/**
 * The marker set when the last physical part ends (the Gate circuit, the Three-Mile stair test)
 * is preferred; older results use their final save time.
 */
export function recoveryAnchorAt(result: Pick<TrialResult, 'recordedAt' | 'phaseResults'>): number | null {
  const marker = result.phaseResults
    .map((phase) => phase.metrics?.['effortEndedAt'])
    .find((value) => typeof value === 'string');
  const marked = typeof marker === 'string' ? Date.parse(marker) : Number.NaN;
  if (Number.isFinite(marked)) return marked;
  const saved = result.recordedAt ? Date.parse(result.recordedAt) : Number.NaN;
  return Number.isFinite(saved) ? saved : null;
}

/** The time the check opens, in milliseconds, or null when no usable time exists. */
export function recoveryOpensAt(result: Pick<TrialResult, 'recordedAt' | 'phaseResults'>): number | null {
  const anchor = recoveryAnchorAt(result);
  return anchor === null ? null : anchor + RECOVERY_OPENS_MINUTES * 60_000;
}

export function recoveryWord(area: keyof RecoveryAnswers, value: string): string {
  return RECOVERY_AREAS.find((item) => item.key === area)?.choices.find((choice) => choice.value === value)?.label ?? value;
}

/** Validates one recovery check against the completed result it follows. */
export function createPostMissionFunction(
  result: TrialResult,
  input: RecoveryInput,
  now: IsoTimestamp = new Date().toISOString(),
): PostMissionFunction {
  if (!input.id?.trim()) throw new Error('A recovery check needs an identifier.');
  if (input.trialResultId !== result.id) throw new Error('This recovery check belongs to a different trial.');
  if (result.postMissionFunction?.trim()) throw new Error('This trial already has a recovery check.');
  const effortEndedAt = recoveryAnchorAt(result);
  if (effortEndedAt === null) throw new Error('This trial has no usable time for its recovery check.');
  const opensAt = effortEndedAt + RECOVERY_OPENS_MINUTES * 60_000;
  if (!Number.isFinite(Date.parse(now))) throw new RangeError('Enter a valid recovery check time.');
  if (Date.parse(now) < opensAt) {
    throw new Error(`The recovery check opens ${RECOVERY_OPENS_MINUTES} minutes after the trial.`);
  }
  for (const area of RECOVERY_AREAS) {
    if (!area.choices.some((choice) => choice.value === input[area.key])) {
      throw new Error(`Choose a word for ${area.label.toLowerCase()}.`);
    }
  }
  const note = input.note?.trim();
  if (note && note.length > RECOVERY_NOTE_MAX) {
    throw new Error(`Keep the note under ${RECOVERY_NOTE_MAX} characters.`);
  }
  return {
    id: input.id,
    trialId: result.trialId,
    trialResultId: result.id,
    effortEndedAt: new Date(effortEndedAt).toISOString(),
    recordedAt: now,
    minutesAfter: Math.floor((Date.parse(now) - effortEndedAt) / 60_000),
    energy: input.energy,
    soreness: input.soreness,
    irritability: input.irritability,
    helpAtHome: input.helpAtHome,
    familyLife: input.familyLife,
    ...(note ? { note } : {}),
  };
}

/** The newest completed trial still waiting for its recovery check, within Keep's window. */
export function pendingRecovery(
  results: readonly TrialResult[],
  recoveries: readonly PostMissionFunction[],
  now: number,
  withinHours = RECOVERY_REMINDER_HOURS,
): TrialResult | undefined {
  const recorded = new Set(recoveries.map((entry) => entry.trialResultId));
  return results
    .filter((result) => {
      const opensAt = recoveryOpensAt(result);
      if (opensAt === null || recorded.has(result.id) || result.postMissionFunction) return false;
      const effortEndedAt = opensAt - RECOVERY_OPENS_MINUTES * 60_000;
      return now >= effortEndedAt && now - effortEndedAt < withinHours * 3_600_000;
    })
    .sort((a, b) => (recoveryAnchorAt(b) ?? 0) - (recoveryAnchorAt(a) ?? 0))[0];
}
