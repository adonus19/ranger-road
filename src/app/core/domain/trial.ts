import type {
  DeepReadonly,
  IsoTimestamp,
  LocalDate,
  ReadinessCheck,
  TrialCircuitMovement,
  TrialCircuitRoundResult,
  TrialDefinition,
  TrialPhaseResult,
  TrialResult,
} from './models';
import { classifyReadiness } from './readiness';
import { gateTrialDefinition, GATE_TRIAL_CONTENT_VERSION } from '../program/chapter-one-trial.seed';
import { isLocalDate } from '../program/campaign';

/** Fields new Gate Trial history always has; older v1 rows remain readable as TrialResult. */
export type SavedGateTrialResult = TrialResult & {
  definitionSnapshot: DeepReadonly<TrialDefinition>;
  readinessId: string;
  recordedAt: IsoTimestamp;
};

export interface GateTrialResultInput {
  id: string;
  date: LocalDate;
  recordedAt: IsoTimestamp;
  readiness: ReadinessCheck;
  distanceMiles: number;
  walkDurationMinutes: number;
  walkRpe: number;
  walkAverageHeartRate?: number;
  kneeResponse: string;
  backResponse: string;
  recoveryAfterFiveMinutes: string;
  circuitDurationMinutes: number;
  circuitRounds: TrialCircuitRoundResult[];
  restAfterWalkMinutes: number;
  mindReflection: { body: string; character: string; family: string };
  psalmAndPrayerCompleted: boolean;
  prayerMinutes: number;
  faithReflection: string;
  rangersOath: string;
  /** Only provide this after the 60–120 minute recovery assessment. */
  postMissionFunction?: string;
  photoAsset?: string;
}

/**
 * A completed Gate Trial snapshots the detailed Chapter I prescription.
 */
export function createGateTrialResult(input: GateTrialResultInput): SavedGateTrialResult {
  if (!input.readiness || input.readiness.date !== input.date) {
    throw new Error('Check readiness on the trial date before completing the Gate Trial.');
  }
  if (classifyReadiness(input.readiness) !== input.readiness.status) {
    throw new Error('The readiness status does not match the recorded answers.');
  }
  if (input.readiness.status !== 'green') {
    throw new Error('The full Gate Trial waits for a Green readiness day.');
  }
  if (
    !Number.isFinite(Date.parse(input.readiness.checkedAt)) ||
    !Number.isFinite(Date.parse(input.recordedAt)) ||
    Date.parse(input.readiness.checkedAt) > Date.parse(input.recordedAt)
  ) {
    throw new Error('Check readiness before recording the Gate Trial.');
  }
  if (!input.psalmAndPrayerCompleted) {
    throw new Error('Complete the Psalm 121 and prayer phase before saving the Gate Trial.');
  }

  const result: TrialResult = {
    id: input.id,
    trialId: gateTrialDefinition.id,
    date: input.date,
    recordedAt: input.recordedAt,
    readinessId: input.readiness.id,
    definitionSnapshot: structuredClone(gateTrialDefinition),
    phaseResults: [
      {
        phaseId: 'brisk-walk',
        metrics: {
          distanceMiles: input.distanceMiles,
          durationMinutes: input.walkDurationMinutes,
          rpe: input.walkRpe,
          ...(input.walkAverageHeartRate !== undefined
            ? { averageHeartRate: input.walkAverageHeartRate }
            : {}),
        },
        responses: {
          knee: input.kneeResponse,
          back: input.backResponse,
          recoveryAfterFiveMinutes: input.recoveryAfterFiveMinutes,
        },
      },
      {
        phaseId: 'controlled-circuit',
        metrics: {
          roundsCompleted: input.circuitRounds.length,
          durationMinutes: input.circuitDurationMinutes,
          restAfterWalkMinutes: input.restAfterWalkMinutes,
        },
        circuitRounds: structuredClone(input.circuitRounds),
      },
      { phaseId: 'mind-reflection', responses: { ...input.mindReflection } },
      {
        phaseId: 'psalm-and-prayer',
        metrics: {
          confirmed: true,
          prayerMinutes: input.prayerMinutes,
        },
        responses: { identity: input.faithReflection },
      },
      { phaseId: 'rangers-oath', notes: input.rangersOath },
    ],
    reflection: [
      `Body: ${input.mindReflection.body}`,
      `Character: ${input.mindReflection.character}`,
      `Family: ${input.mindReflection.family}`,
    ].join('\n'),
    ...(input.postMissionFunction !== undefined
      ? { postMissionFunction: input.postMissionFunction }
      : {}),
    ...(input.photoAsset ? { photoAsset: input.photoAsset } : {}),
  };
  return validateCompletedGateTrialResult(result);
}

/** Revalidate a record at the storage boundary; this does not trust a TypeScript cast. */
export function validateCompletedGateTrialResult(result: TrialResult): SavedGateTrialResult {
  const id = result.id?.trim();
  if (!id) {
    throw new Error('A Gate Trial result needs an identifier.');
  }
  if (result.trialId !== gateTrialDefinition.id) {
    throw new Error('This result must refer to the Gate Trial.');
  }
  if (!isLocalDate(result.date)) {
    throw new RangeError('Enter a valid Gate Trial date.');
  }
  if (!result.recordedAt || !Number.isFinite(Date.parse(result.recordedAt))) {
    throw new RangeError('A Gate Trial result needs the time it was recorded.');
  }
  const readinessId = result.readinessId?.trim();
  if (!readinessId) {
    throw new Error('A completed Gate Trial needs its readiness check.');
  }

  const snapshot = result.definitionSnapshot;
  if (
    !snapshot ||
    snapshot.id !== gateTrialDefinition.id ||
    snapshot.chapterId !== gateTrialDefinition.chapterId ||
    snapshot.contentVersion !== GATE_TRIAL_CONTENT_VERSION ||
    !hasExactPhaseIds(snapshot.phases) ||
    !matchesCurrentCircuit(snapshot)
  ) {
    throw new Error('A completed Gate Trial needs its matching definition snapshot.');
  }
  if (!Array.isArray(result.phaseResults) || !hasExactPhaseIds(result.phaseResults)) {
    throw new Error('Complete all five Gate Trial phases.');
  }

  const phases = new Map(result.phaseResults.map((phase) => [phase.phaseId, phase]));
  const walk = phases.get('brisk-walk')!;
  const circuit = phases.get('controlled-circuit')!;
  const mind = phases.get('mind-reflection')!;
  const psalmAndPrayer = phases.get('psalm-and-prayer')!;
  const oath = phases.get('rangers-oath')!;
  const distance = walk.metrics?.['distanceMiles'];
  const duration = walk.metrics?.['durationMinutes'];
  const rounds = circuit.metrics?.['roundsCompleted'];
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 2) {
    throw new RangeError('The Gate Trial walk is 2 miles.');
  }
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('Record the walk duration in minutes.');
  }
  const walkRpe = walk.metrics?.['rpe'];
  if (typeof walkRpe !== 'number' || !Number.isFinite(walkRpe) || walkRpe < 1 || walkRpe > 10) {
    throw new RangeError('Record walk RPE from 1 to 10.');
  }
  const heartRate = walk.metrics?.['averageHeartRate'];
  if (
    heartRate !== undefined &&
    (typeof heartRate !== 'number' || !Number.isFinite(heartRate) || heartRate <= 0)
  ) {
    throw new RangeError('Average heart rate must be positive.');
  }
  requiredResponse(walk, 'knee', 'Record the knee response.');
  requiredResponse(walk, 'back', 'Record the back response.');
  requiredResponse(walk, 'recoveryAfterFiveMinutes', 'Record recovery after 5 minutes.');
  if (rounds !== 3) {
    throw new RangeError('The Gate Trial circuit is 3 rounds.');
  }
  const circuitDuration = circuit.metrics?.['durationMinutes'];
  if (
    typeof circuitDuration !== 'number' ||
    !Number.isFinite(circuitDuration) ||
    circuitDuration <= 0
  ) {
    throw new RangeError('Record the circuit completion time.');
  }
  const rest = circuit.metrics?.['restAfterWalkMinutes'];
  if (typeof rest !== 'number' || !Number.isFinite(rest) || rest < 5) {
    throw new RangeError('Rest at least 5 minutes after the walk before the circuit.');
  }
  validateCircuitRounds(circuit.circuitRounds);
  requiredResponse(mind, 'body', 'Record what you learned about your body.');
  requiredResponse(mind, 'character', 'Record what you learned about your character.');
  requiredResponse(mind, 'family', 'Record what you learned about your family.');
  if (psalmAndPrayer.metrics?.['confirmed'] !== true) {
    throw new Error('Confirm the Psalm 121 and prayer phase before saving the Gate Trial.');
  }
  const prayerMinutes = psalmAndPrayer.metrics?.['prayerMinutes'];
  if (typeof prayerMinutes !== 'number' || !Number.isFinite(prayerMinutes) || prayerMinutes < 10) {
    throw new RangeError('Spend at least 10 quiet minutes in prayer.');
  }
  requiredResponse(psalmAndPrayer, 'identity', 'Record the husband and father reflection.');
  const reflection = result.reflection?.trim();
  const rangersOath = oath.notes?.trim();
  if (!reflection || !rangersOath) {
    throw new Error("Record the mind reflection and Ranger's Oath.");
  }
  const postMissionFunction = result.postMissionFunction?.trim();
  if (result.postMissionFunction !== undefined && !postMissionFunction) {
    throw new Error('A post-mission function response cannot be blank.');
  }
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
    ...(postMissionFunction ? { postMissionFunction } : {}),
    ...(result.photoAsset ? { photoAsset: result.photoAsset.trim() } : {}),
  };
}

function hasExactPhaseIds(
  phases: readonly { readonly id?: string; readonly phaseId?: string }[],
): boolean {
  if (!Array.isArray(phases) || phases.length !== gateTrialDefinition.phases.length) {
    return false;
  }
  return gateTrialDefinition.phases.every(
    (phase, index) => (phases[index]?.id ?? phases[index]?.phaseId) === phase.id,
  );
}

function requiredResponse(phase: TrialPhaseResult, key: string, message: string): string {
  const value = phase.responses?.[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

function matchesCurrentCircuit(snapshot: DeepReadonly<TrialDefinition>): boolean {
  const expected = gateTrialDefinition.phases.find(
    (phase) => phase.id === 'controlled-circuit',
  )?.circuit;
  const actual = snapshot.phases.find((phase) => phase?.id === 'controlled-circuit')?.circuit;
  if (
    !expected ||
    !actual ||
    actual.rounds !== expected.rounds ||
    !Array.isArray(actual.movements) ||
    actual.movements.length !== expected.movements.length
  )
    return false;
  return expected.movements.every((item, index) => {
    const candidate = actual.movements[index];
    return (
      candidate?.exerciseId === item.exerciseId &&
      candidate.reps === item.reps &&
      candidate.durationSeconds === item.durationSeconds &&
      candidate.perSide === item.perSide
    );
  });
}

function validateCircuitRounds(rounds: TrialCircuitRoundResult[] | undefined): void {
  const prescription = gateTrialDefinition.phases.find(
    (phase) => phase.id === 'controlled-circuit',
  )!.circuit!;
  if (!Array.isArray(rounds) || rounds.length !== prescription.rounds) {
    throw new RangeError('Record all 3 circuit rounds.');
  }
  const roundNumbers = new Set(rounds.map((round) => round?.round));
  if (
    roundNumbers.size !== prescription.rounds ||
    ![1, 2, 3].every((number) => roundNumbers.has(number))
  ) {
    throw new RangeError('Record circuit rounds 1, 2, and 3 once each.');
  }
  for (const round of rounds) {
    const actual = round.movements;
    if (
      !Array.isArray(actual) ||
      actual.length !== prescription.movements.length ||
      actual.some((movement) => !movement || typeof movement.exerciseId !== 'string') ||
      new Set(actual.map((movement) => movement.exerciseId)).size !== actual.length
    ) {
      throw new Error(`Round ${round.round} needs all six circuit stations.`);
    }
    for (const planned of prescription.movements) {
      const completed = actual.find((movement) => movement.exerciseId === planned.exerciseId);
      if (!completed || !meetsMovementPrescription(planned, completed)) {
        throw new Error(`Round ${round.round} is short on ${planned.exerciseId}.`);
      }
      if (
        completed.loadPounds !== undefined &&
        (!Number.isFinite(completed.loadPounds) || completed.loadPounds < 0)
      ) {
        throw new RangeError('Recorded circuit load must be zero or greater.');
      }
      if (completed.setup !== undefined && !completed.setup.trim()) {
        throw new Error('A recorded circuit setup cannot be blank.');
      }
    }
  }
}

function meetsMovementPrescription(
  planned: TrialCircuitMovement,
  actual: TrialCircuitRoundResult['movements'][number],
): boolean {
  if (planned.reps !== undefined) {
    if (planned.perSide) {
      return (
        Number.isInteger(actual.repsBySide?.left) &&
        Number.isInteger(actual.repsBySide?.right) &&
        (actual.repsBySide?.left ?? -1) >= planned.reps &&
        (actual.repsBySide?.right ?? -1) >= planned.reps
      );
    }
    return Number.isInteger(actual.reps) && actual.reps! >= planned.reps;
  }
  if (planned.durationSeconds !== undefined) {
    if (planned.perSide) {
      return (
        Number.isFinite(actual.durationSecondsBySide?.left) &&
        Number.isFinite(actual.durationSecondsBySide?.right) &&
        (actual.durationSecondsBySide?.left ?? -1) >= planned.durationSeconds &&
        (actual.durationSecondsBySide?.right ?? -1) >= planned.durationSeconds
      );
    }
    return (
      Number.isFinite(actual.durationSeconds) && actual.durationSeconds! >= planned.durationSeconds
    );
  }
  return false;
}
