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
  TrialResult,
} from './models';
import { classifyReadiness } from './readiness';
import {
  threeMilePhaseComplete,
  threeMileReflection,
  validateCompletedThreeMileTrialResult,
} from './three-mile-trial';
import {
  validateCompletedGateTrialResult,
  type SavedGateTrialResult,
  type SavedTrialResult,
} from './trial';
import { gateTrialDefinition } from '../program/chapter-one-trial.seed';
import { threeMileTrialDefinition } from '../program/chapter-two-trial.seed';
import { isLocalDate } from '../program/campaign';

/** What differs between trials; drafts, pain, stopping and saving share everything else. */
export interface TrialRules {
  definition: TrialDefinition;
  name: string;
  /** Phases before this index are physical: they need Green readiness and allow pain notes. */
  physicalPhases: number;
  phaseComplete(phase: TrialPhaseResult, index: number): boolean;
  validate(result: TrialResult): SavedTrialResult;
  reflection(phases: readonly TrialPhaseResult[]): string;
}

const TRIAL_RULES: Record<string, TrialRules> = {
  [gateTrialDefinition.id]: {
    definition: gateTrialDefinition,
    name: 'Gate Trial',
    physicalPhases: 2,
    phaseComplete: (phase, index) => gateTrialPhaseComplete(phase, index),
    validate: (result) => validateCompletedGateTrialResult(result),
    reflection: (phases) => {
      const mind = phases[2]?.responses ?? {};
      return [
        `Body: ${mind['body']}`,
        `Character: ${mind['character']}`,
        `Family: ${mind['family']}`,
      ].join('\n');
    },
  },
  [threeMileTrialDefinition.id]: {
    definition: threeMileTrialDefinition,
    name: 'Three-Mile Trial',
    physicalPhases: 3,
    phaseComplete: threeMilePhaseComplete,
    validate: validateCompletedThreeMileTrialResult,
    reflection: threeMileReflection,
  },
};

export function trialRulesFor(trialId: string): TrialRules {
  const rules = TRIAL_RULES[trialId];
  if (!rules) throw new Error('This trial is not in the app yet.');
  return rules;
}

/** Revalidate any completed trial at the storage boundary. */
export function validateCompletedTrialResult(result: TrialResult): SavedTrialResult {
  return trialRulesFor(result.trialId).validate(result);
}

/** Whether one phase of any trial holds everything it needs. */
export function trialPhaseComplete(
  trialId: string,
  phase: TrialPhaseResult,
  index: number,
): boolean {
  return TRIAL_RULES[trialId]?.phaseComplete(phase, index) ?? false;
}

export type TrialPainAction = 'continue' | 'reduce' | 'substitute' | 'end-exercise';

export interface TrialPainInput {
  /** A physical phase of the trial, such as 'brisk-walk' or 'three-mile-walk'. */
  phaseId: string;
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
  return createTrialDraft(gateTrialDefinition.id, date, readiness, now, id);
}

export function createTrialDraft(
  trialId: string,
  date: LocalDate,
  readiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `trial-${crypto.randomUUID()}`,
): TrialDraft {
  const rules = trialRulesFor(trialId);
  const definition = rules.definition;
  if (!isLocalDate(date)) throw new RangeError(`Enter a valid ${rules.name} date.`);
  assertTimestamp(now, 'Trial start time');
  assertGreenReadiness(readiness, date, now, rules.name);
  if (!id.trim()) throw new Error('A trial draft needs an identifier.');
  return {
    id,
    trialId: definition.id,
    date,
    readinessId: readiness!.id,
    startedAt: now,
    updatedAt: now,
    revision: 1,
    currentPhaseIndex: 0,
    definitionSnapshot: structuredClone(definition),
    phaseResults: definition.phases.map((phase) => ({ phaseId: phase.id })),
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
  return updateTrialDraft(stored, edited, latestReadiness, now);
}

export function updateTrialDraft(
  stored: TrialDraft,
  edited: TrialDraft,
  latestReadiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): TrialDraft {
  const rules = trialRulesFor(stored.trialId);
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
    edited.currentPhaseIndex >= rules.definition.phases.length ||
    edited.currentPhaseIndex > stored.currentPhaseIndex + 1
  ) {
    throw new RangeError(`Move through the ${rules.name} one phase at a time.`);
  }
  const phaseResults = normalizePartialPhases(edited.phaseResults, stored.definitionSnapshot);
  if (edited.photoAsset !== undefined && !edited.photoAsset.trim()) {
    throw new Error('An attached trial photo needs an asset reference.');
  }
  if (edited.currentPhaseIndex > stored.currentPhaseIndex) {
    const previous = phaseResults[stored.currentPhaseIndex];
    if (!rules.phaseComplete(previous, stored.currentPhaseIndex)) {
      throw new Error(`Finish this ${rules.name} phase before moving on.`);
    }
    if (stored.currentPhaseIndex < rules.physicalPhases) {
      assertGreenReadiness(latestReadiness, stored.date, now, rules.name);
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
  const rules = trialRulesFor(draft.trialId);
  const physical = rules.definition.phases.slice(0, rules.physicalPhases).map((phase) => phase.id);
  if (
    !physical.includes(input.phaseId) ||
    !draft.phaseResults.some((phase) => phase.phaseId === input.phaseId)
  ) {
    throw new Error(`Choose a physical ${rules.name} phase for this pain record.`);
  }
  if (!Number.isInteger(input.severity) || input.severity < 0 || input.severity > 10) {
    throw new RangeError('Pain severity must be a whole number from 0 to 10.');
  }
  if (!input.bodyArea?.trim()) throw new Error('Record the pain area.');
  if (!['continue', 'reduce', 'substitute', 'end-exercise'].includes(input.actionTaken)) {
    throw new Error('Choose what you did in response to the pain.');
  }
  if (input.exerciseId) {
    const circuit = rules.definition.phases.find((phase) => phase.id === input.phaseId)?.circuit;
    if (!circuit?.movements.some((movement) => movement.exerciseId === input.exerciseId)) {
      throw new Error('Choose a station in the circuit for this pain record.');
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
  return completeTrialDraft(draft, latestReadiness, now);
}

export function completeTrialDraft(
  draft: TrialDraft,
  latestReadiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): SavedTrialResult {
  const rules = trialRulesFor(draft.trialId);
  assertTimestamp(now, 'Trial completion time');
  if (Date.parse(now) < Date.parse(draft.updatedAt)) {
    throw new Error('Trial completion time cannot precede the last saved entry.');
  }
  assertGreenReadiness(latestReadiness, draft.date, now, rules.name);
  assertNoUnsafeTrialPain(draft.painEvents);
  if (draft.currentPhaseIndex !== rules.definition.phases.length - 1) {
    throw new Error(`Complete the ${rules.name} phases in order.`);
  }
  const phases = normalizePartialPhases(draft.phaseResults, draft.definitionSnapshot);
  for (let index = 0; index < phases.length; index += 1) {
    if (!rules.phaseComplete(phases[index], index)) {
      throw new Error(
        `Finish ${rules.definition.phases[index].title} before completing the ${rules.name}.`,
      );
    }
  }
  return rules.validate({
    id: draft.id,
    trialId: draft.trialId,
    date: draft.date,
    readinessId: latestReadiness!.id,
    recordedAt: now,
    definitionSnapshot: structuredClone(draft.definitionSnapshot),
    phaseResults: phases,
    ...(draft.photoAsset ? { photoAsset: draft.photoAsset } : {}),
    reflection: rules.reflection(phases),
  });
}

/** Stopping keeps every partial phase and linked pain event without marking a pass. */
export function stopTrialDraft(
  draft: TrialDraft,
  now: IsoTimestamp = new Date().toISOString(),
): TrialAttempt {
  return stopGateTrialDraft(draft, now);
}

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
    const prescribed = snapshot.phases[index]?.circuit;
    const circuitRounds = phase.circuitRounds
      ? normalizePartialRounds(phase.circuitRounds, prescribed)
      : undefined;
    if (prescribed && circuitRounds) {
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

function normalizePartialRounds(
  rounds: TrialCircuitRoundResult[],
  prescription: DeepReadonly<TrialDefinition>['phases'][number]['circuit'],
): TrialCircuitRoundResult[] {
  if (!prescription || !Array.isArray(rounds) || rounds.length > prescription.rounds) {
    throw new Error('Only a circuit phase can record its rounds.');
  }
  const seenRounds = new Set<number>();
  return rounds.map((round) => {
    if (
      !Number.isInteger(round?.round) ||
      round.round < 1 ||
      round.round > prescription.rounds ||
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
  name = 'Gate Trial',
): void {
  if (!readiness || readiness.date !== date) {
    throw new Error(`Check readiness on the ${name} date before physical work.`);
  }
  if (readiness.status !== 'green' || classifyReadiness(readiness) !== 'green') {
    throw new Error(`The full ${name} waits for a Green readiness day.`);
  }
  if (
    !Number.isFinite(Date.parse(readiness.checkedAt)) ||
    Date.parse(readiness.checkedAt) > Date.parse(at)
  ) {
    throw new Error(`Check readiness before continuing the ${name}.`);
  }
}

function assertNoUnsafeTrialPain(events: PainEvent[]): void {
  if (events.some((event) => event.severity >= 3 || event.actionTaken !== 'continue')) {
    throw new Error(
      'This trial was reduced or pain rose. Stop it and try the full trial on a Green day.',
    );
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
