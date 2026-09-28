import type {
  DeepReadonly,
  IsoTimestamp,
  LocalDate,
  PainEvent,
  ReadinessCheck,
  TrialAttempt,
  TrialCircuitRoundResult,
  TrialDefinition,
  TrialDraft,
  TrialPhaseResult,
} from './models';
import { classifyReadiness } from './readiness';
import { validateCompletedGateTrialResult, type SavedGateTrialResult } from './trial';
import { gateTrialDefinition } from '../program/chapter-one-trial.seed';
import { isLocalDate } from '../program/campaign';

export type TrialPainAction = 'continue' | 'reduce' | 'substitute' | 'end-exercise';

export interface TrialPainInput {
  phaseId: 'brisk-walk' | 'controlled-circuit';
  bodyArea: string;
  severity: number;
  actionTaken: TrialPainAction;
  exerciseId?: string;
}

export type RecordedTrialPainEvent = PainEvent & {
  id: string;
  trialAttemptId: string;
  trialPhaseId: TrialPainInput['phaseId'];
  actionTaken: TrialPainAction;
};

/** A trial's original content and the five ordered slots travel with the draft. */
export function createGateTrialDraft(
  date: LocalDate,
  readiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `trial-${crypto.randomUUID()}`,
): TrialDraft {
  if (!isLocalDate(date)) throw new RangeError('Enter a valid Gate Trial date.');
  assertTimestamp(now, 'Trial start time');
  assertGreenReadiness(readiness, date, now);
  if (!id.trim()) throw new Error('A trial draft needs an identifier.');
  return {
    id,
    trialId: gateTrialDefinition.id,
    date,
    readinessId: readiness!.id,
    startedAt: now,
    updatedAt: now,
    revision: 1,
    currentPhaseIndex: 0,
    definitionSnapshot: structuredClone(gateTrialDefinition),
    phaseResults: gateTrialDefinition.phases.map((phase) => ({ phaseId: phase.id })),
    painEvents: [],
  };
}

/**
 * Draft edits are allowed after readiness changes so observations already made are
 * never lost. A physical phase cannot advance until the latest check is Green.
 */
export function updateGateTrialDraft(
  stored: TrialDraft,
  edited: TrialDraft,
  latestReadiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): TrialDraft {
  assertTimestamp(now, 'Trial save time');
  if (Date.parse(now) < Date.parse(stored.updatedAt)) {
    throw new Error('Trial save time cannot move backward.');
  }
  if (
    stored.id !== edited.id ||
    stored.trialId !== edited.trialId ||
    stored.date !== edited.date ||
    stored.startedAt !== edited.startedAt ||
    stored.readinessId !== edited.readinessId ||
    stored.revision !== edited.revision ||
    JSON.stringify(stored.definitionSnapshot) !== JSON.stringify(edited.definitionSnapshot)
  ) {
    throw new Error('The trial changed. Reload it before saving.');
  }
  if (
    !Number.isInteger(edited.currentPhaseIndex) ||
    edited.currentPhaseIndex < 0 ||
    edited.currentPhaseIndex >= gateTrialDefinition.phases.length ||
    edited.currentPhaseIndex > stored.currentPhaseIndex + 1
  ) {
    throw new RangeError('Move through the Gate Trial one phase at a time.');
  }
  const phaseResults = normalizePartialPhases(edited.phaseResults, stored.definitionSnapshot);
  if (edited.photoAsset !== undefined && !edited.photoAsset.trim()) {
    throw new Error('An attached trial photo needs an asset reference.');
  }
  if (edited.currentPhaseIndex > stored.currentPhaseIndex) {
    const previous = phaseResults[stored.currentPhaseIndex];
    if (!gateTrialPhaseComplete(previous, stored.currentPhaseIndex)) {
      throw new Error('Finish this Gate Trial phase before moving on.');
    }
    if (stored.currentPhaseIndex < 2) {
      assertGreenReadiness(latestReadiness, stored.date, now);
      assertNoUnsafeTrialPain(stored.painEvents);
    }
  }
  return {
    ...structuredClone(stored),
    updatedAt: now,
    revision: stored.revision + 1,
    currentPhaseIndex: edited.currentPhaseIndex,
    phaseResults,
    photoAsset: edited.photoAsset?.trim(),
    /** A stale form cannot remove pain already saved in the historical store. */
    painEvents: structuredClone(stored.painEvents),
  };
}

export function createRecordedTrialPain(
  draft: TrialDraft,
  input: TrialPainInput,
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `pain-${crypto.randomUUID()}`,
): RecordedTrialPainEvent {
  assertTimestamp(now, 'Pain time');
  if (Date.parse(now) < Date.parse(draft.updatedAt)) {
    throw new Error('Pain time cannot precede the last saved entry.');
  }
  if (
    !['brisk-walk', 'controlled-circuit'].includes(input.phaseId) ||
    !draft.phaseResults.some((phase) => phase.phaseId === input.phaseId)
  ) {
    throw new Error('Choose a physical Gate Trial phase for this pain record.');
  }
  if (!Number.isInteger(input.severity) || input.severity < 0 || input.severity > 10) {
    throw new RangeError('Pain severity must be a whole number from 0 to 10.');
  }
  if (!input.bodyArea?.trim()) throw new Error('Record the pain area.');
  if (!['continue', 'reduce', 'substitute', 'end-exercise'].includes(input.actionTaken)) {
    throw new Error('Choose what you did in response to the pain.');
  }
  if (input.exerciseId) {
    const circuit = gateTrialDefinition.phases[1].circuit!;
    if (
      input.phaseId !== 'controlled-circuit' ||
      !circuit.movements.some((movement) => movement.exerciseId === input.exerciseId)
    ) {
      throw new Error('Choose a station in the Gate Circuit for this pain record.');
    }
  }
  if (!id.trim()) throw new Error('A pain record needs an identifier.');
  return {
    id,
    timestamp: now,
    bodyArea: input.bodyArea.trim(),
    severity: input.severity,
    actionTaken: input.actionTaken,
    ...(input.exerciseId ? { exerciseId: input.exerciseId } : {}),
    trialAttemptId: draft.id,
    trialPhaseId: input.phaseId,
  };
}

/** Completed trials use the existing strict, immutable five-phase validator. */
export function completeGateTrialDraft(
  draft: TrialDraft,
  latestReadiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): SavedGateTrialResult {
  assertTimestamp(now, 'Trial completion time');
  if (Date.parse(now) < Date.parse(draft.updatedAt)) {
    throw new Error('Trial completion time cannot precede the last saved entry.');
  }
  assertGreenReadiness(latestReadiness, draft.date, now);
  assertNoUnsafeTrialPain(draft.painEvents);
  if (draft.currentPhaseIndex !== gateTrialDefinition.phases.length - 1) {
    throw new Error('Complete the Gate Trial phases in order.');
  }
  const phases = normalizePartialPhases(draft.phaseResults, draft.definitionSnapshot);
  for (let index = 0; index < phases.length; index += 1) {
    if (!gateTrialPhaseComplete(phases[index], index)) {
      throw new Error(`Finish ${gateTrialDefinition.phases[index].title} before completing the Gate Trial.`);
    }
  }
  const mind = phases[2].responses!;
  return validateCompletedGateTrialResult({
    id: draft.id,
    trialId: draft.trialId,
    date: draft.date,
    readinessId: latestReadiness!.id,
    recordedAt: now,
    definitionSnapshot: structuredClone(draft.definitionSnapshot),
    phaseResults: phases,
    ...(draft.photoAsset ? { photoAsset: draft.photoAsset } : {}),
    reflection: [
      `Body: ${mind['body']}`,
      `Character: ${mind['character']}`,
      `Family: ${mind['family']}`,
    ].join('\n'),
  });
}

/** Stopping keeps every partial phase and linked pain event without marking a pass. */
export function stopGateTrialDraft(
  draft: TrialDraft,
  now: IsoTimestamp = new Date().toISOString(),
): TrialAttempt {
  assertTimestamp(now, 'Trial stop time');
  if (Date.parse(now) < Date.parse(draft.updatedAt)) {
    throw new Error('Trial stop time cannot precede its last saved entry.');
  }
  return {
    id: draft.id,
    trialId: draft.trialId,
    date: draft.date,
    readinessId: draft.readinessId,
    startedAt: draft.startedAt,
    revision: draft.revision,
    stoppedAt: now,
    currentPhaseIndex: draft.currentPhaseIndex,
    definitionSnapshot: structuredClone(draft.definitionSnapshot),
    phaseResults: structuredClone(draft.phaseResults),
    painEvents: structuredClone(draft.painEvents),
    ...(draft.photoAsset ? { photoAsset: draft.photoAsset } : {}),
    outcome: 'stopped',
  };
}

/** Used by the phase player to decide whether its Continue action is available. */
export function gateTrialPhaseComplete(phase: TrialPhaseResult, index: number): boolean {
  try {
    if (phase.phaseId !== gateTrialDefinition.phases[index]?.id) return false;
    switch (index) {
      case 0:
        return (
          numericAtLeast(phase.metrics?.['distanceMiles'], 2) &&
          numericGreaterThanZero(phase.metrics?.['durationMinutes']) &&
          integerInRange(phase.metrics?.['rpe'], 1, 10) &&
          optionalPositive(phase.metrics?.['averageHeartRate']) &&
          present(phase.responses?.['knee']) &&
          present(phase.responses?.['back']) &&
          present(phase.responses?.['recoveryAfterFiveMinutes'])
        );
      case 1:
        return (
          numericAtLeast(phase.metrics?.['restAfterWalkMinutes'], 5) &&
          numericGreaterThanZero(phase.metrics?.['durationMinutes']) &&
          phase.metrics?.['roundsCompleted'] === 3 &&
          completeCircuit(phase.circuitRounds)
        );
      case 2:
        return (
          present(phase.responses?.['body']) &&
          present(phase.responses?.['character']) &&
          present(phase.responses?.['family'])
        );
      case 3:
        return (
          phase.metrics?.['confirmed'] === true &&
          numericAtLeast(phase.metrics?.['prayerMinutes'], 10) &&
          present(phase.responses?.['identity'])
        );
      case 4:
        return present(phase.notes);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function normalizePartialPhases(
  phases: TrialPhaseResult[],
  snapshot: DeepReadonly<TrialDefinition>,
): TrialPhaseResult[] {
  if (
    !Array.isArray(phases) ||
    phases.length !== snapshot.phases.length ||
    phases.some((phase, index) => phase?.phaseId !== snapshot.phases[index].id)
  ) {
    throw new Error('The trial phase list changed. Reload it before saving.');
  }
  return phases.map((phase, index) => {
    let metrics = phase.metrics ? { ...phase.metrics } : undefined;
    if (metrics) {
      for (const value of Object.values(metrics)) {
        if (
          (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') ||
          (typeof value === 'number' && !Number.isFinite(value))
        ) {
          throw new Error('Trial measurements need valid values.');
        }
      }
    }
    const responses = phase.responses ? { ...phase.responses } : undefined;
    if (responses && Object.values(responses).some((value) => typeof value !== 'string')) {
      throw new Error('Trial responses must be text.');
    }
    if (phase.notes !== undefined && typeof phase.notes !== 'string') {
      throw new Error('Trial notes must be text.');
    }
    const circuitRounds = phase.circuitRounds
      ? normalizePartialRounds(phase.circuitRounds, index)
      : undefined;
    if (index === 1 && circuitRounds) {
      (metrics ??= {})['roundsCompleted'] = circuitRounds.length;
    }
    return {
      phaseId: phase.phaseId,
      ...(phase.notes !== undefined ? { notes: phase.notes } : {}),
      ...(metrics ? { metrics } : {}),
      ...(responses ? { responses } : {}),
      ...(circuitRounds ? { circuitRounds } : {}),
    };
  });
}

function normalizePartialRounds(rounds: TrialCircuitRoundResult[], index: number): TrialCircuitRoundResult[] {
  if (index !== 1 || !Array.isArray(rounds) || rounds.length > 3) {
    throw new Error('Only the Gate Circuit can record up to three rounds.');
  }
  const prescription = gateTrialDefinition.phases[1].circuit!;
  const seenRounds = new Set<number>();
  return rounds.map((round) => {
    if (
      !Number.isInteger(round?.round) ||
      round.round < 1 ||
      round.round > 3 ||
      seenRounds.has(round.round) ||
      !Array.isArray(round.movements) ||
      round.movements.length > prescription.movements.length
    ) {
      throw new Error('Record each Gate Circuit round once.');
    }
    seenRounds.add(round.round);
    const seenMovements = new Set<string>();
    const movements = round.movements.map((movement) => {
      if (
        !movement ||
        !prescription.movements.some((item) => item.exerciseId === movement.exerciseId) ||
        seenMovements.has(movement.exerciseId)
      ) {
        throw new Error('A circuit round needs distinct prescribed stations.');
      }
      seenMovements.add(movement.exerciseId);
      for (const value of [movement.reps, movement.repsBySide?.left, movement.repsBySide?.right]) {
        if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
          throw new RangeError('Circuit repetitions must be whole numbers at or above zero.');
        }
      }
      for (const value of [
        movement.durationSeconds,
        movement.durationSecondsBySide?.left,
        movement.durationSecondsBySide?.right,
        movement.loadPounds,
      ]) {
        if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
          throw new RangeError('Circuit durations and loads must be zero or greater.');
        }
      }
      if (movement.setup !== undefined && typeof movement.setup !== 'string') {
        throw new Error('Circuit setup must be text.');
      }
      return structuredClone(movement);
    });
    return { round: round.round, movements };
  });
}

function completeCircuit(rounds: TrialCircuitRoundResult[] | undefined): boolean {
  const prescription = gateTrialDefinition.phases[1].circuit!;
  if (!rounds || rounds.length !== prescription.rounds) return false;
  if (new Set(rounds.map((round) => round.round)).size !== 3) return false;
  return [1, 2, 3].every((roundNumber) => {
    const round = rounds.find((item) => item.round === roundNumber);
    return (
      round?.movements.length === prescription.movements.length &&
      prescription.movements.every((planned) => {
        const actual = round.movements.find((item) => item.exerciseId === planned.exerciseId);
        if (!actual) return false;
        if (planned.reps !== undefined) {
          return planned.perSide
            ? integerAtLeast(actual.repsBySide?.left, planned.reps) &&
                integerAtLeast(actual.repsBySide?.right, planned.reps)
            : integerAtLeast(actual.reps, planned.reps);
        }
        return planned.perSide
          ? numericAtLeast(actual.durationSecondsBySide?.left, planned.durationSeconds!) &&
              numericAtLeast(actual.durationSecondsBySide?.right, planned.durationSeconds!)
          : numericAtLeast(actual.durationSeconds, planned.durationSeconds!);
      })
    );
  });
}

function assertGreenReadiness(
  readiness: ReadinessCheck | undefined,
  date: LocalDate,
  at: IsoTimestamp,
): void {
  if (!readiness || readiness.date !== date) {
    throw new Error('Check readiness on the Gate Trial date before physical work.');
  }
  if (readiness.status !== 'green' || classifyReadiness(readiness) !== 'green') {
    throw new Error('The full Gate Trial waits for a Green readiness day.');
  }
  if (
    !Number.isFinite(Date.parse(readiness.checkedAt)) ||
    Date.parse(readiness.checkedAt) > Date.parse(at)
  ) {
    throw new Error('Check readiness before continuing the Gate Trial.');
  }
}

function assertNoUnsafeTrialPain(events: PainEvent[]): void {
  if (events.some((event) => event.severity >= 3 || event.actionTaken !== 'continue')) {
    throw new Error('This trial was reduced or pain rose. Stop it and try the full trial on a Green day.');
  }
}

function assertTimestamp(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`);
}

function present(value: unknown): boolean {
  return typeof value === 'string' && Boolean(value.trim());
}

function numericAtLeast(value: unknown, minimum: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum;
}

function integerAtLeast(value: unknown, minimum: number): boolean {
  return Number.isInteger(value) && (value as number) >= minimum;
}

function numericGreaterThanZero(value: unknown): boolean {
  return numericAtLeast(value, Number.EPSILON);
}

function integerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return integerAtLeast(value, minimum) && (value as number) <= maximum;
}

function optionalPositive(value: unknown): boolean {
  return value === undefined || numericGreaterThanZero(value);
}
