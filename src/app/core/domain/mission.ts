import type {
  IsoTimestamp,
  LocalDate,
  MissionDefinition,
  MissionInstance,
  ReadinessCheck,
} from './models';
import { classifyReadiness } from './readiness';

/** The choices offered when recording the outcome of a planned mission. */
export type MissionOutcome = 'full' | 'reduced' | 'restoration' | 'rest';

export interface MissionRecordInput {
  id: string;
  definition: MissionDefinition;
  date: LocalDate;
  outcome: MissionOutcome;
  recordedAt: IsoTimestamp;
  readiness?: ReadinessCheck | null;
  notes?: string;
  startedAt?: IsoTimestamp;
}

const PHYSICAL_MISSION_TYPES = new Set<MissionDefinition['missionType']>([
  'strength',
  'conditioning',
  'restoration',
  'trial',
]);

/** Exertional work needs a check; only explicitly nonexertional fieldcraft opts out. */
export function missionNeedsReadiness(definition: MissionDefinition): boolean {
  if (PHYSICAL_MISSION_TYPES.has(definition.missionType)) {
    return true;
  }
  if (definition.missionType === 'fieldcraft') {
    return definition.requiresReadiness !== false;
  }
  return definition.requiresReadiness === true;
}

/**
 * Available recording choices. Pass the mission date to exclude a check from a
 * different day. Rest remains available before a check or if its data is bad.
 */
export function allowedMissionOutcomes(
  definition: MissionDefinition,
  readiness: ReadinessCheck | null,
  date: LocalDate,
): readonly MissionOutcome[] {
  if (definition.plannedTrialId) {
    return [];
  }
  if (!missionNeedsReadiness(definition)) {
    return ['full', 'reduced', 'rest'];
  }

  if (!readiness || readiness.date !== date) {
    return ['rest'];
  }

  try {
    if (classifyReadiness(readiness) !== readiness.status) {
      return ['rest'];
    }
  } catch {
    return ['rest'];
  }

  if (readiness.status === 'red') {
    return ['restoration', 'rest'];
  }
  if (readiness.status === 'yellow') {
    return ['reduced', 'restoration', 'rest'];
  }
  return ['full', 'reduced', 'restoration', 'rest'];
}

/**
 * Produce one immutable historical outcome. A mission is saved once after the
 * user's choice, so recording completion never overwrites an earlier attempt.
 */
export function createMissionRecord(input: MissionRecordInput): MissionInstance {
  const { definition, date, outcome, readiness } = input;
  if (!input.id.trim() || !definition.id.trim()) {
    throw new Error('A mission record and definition need identifiers.');
  }
  if (definition.plannedTrialId) {
    throw new Error('Record the Gate Trial through its trial flow.');
  }

  if (outcome === 'rest' && !input.notes?.trim()) {
    throw new Error('Record a reason for rest.');
  }

  if (outcome === 'restoration' && !missionNeedsReadiness(definition)) {
    throw new Error('Restoration is an alternative to a physical training mission.');
  }

  if (outcome !== 'rest' && missionNeedsReadiness(definition)) {
    if (!readiness || readiness.date !== date) {
      throw new Error('Check readiness for this date before recording physical work.');
    }

    if (classifyReadiness(readiness) !== readiness.status) {
      throw new Error('The readiness status does not match the recorded answers.');
    }

    if (!allowedMissionOutcomes(definition, readiness, date).includes(outcome)) {
      if (readiness.status === 'red') {
        throw new Error('Red readiness allows only restoration or rest for this mission.');
      }
      if (readiness.status === 'yellow') {
        throw new Error('Yellow readiness requires a reduced or restoration mission.');
      }
      throw new Error('This outcome is unavailable for the mission.');
    }
  }

  return {
    id: input.id,
    definitionId: definition.id,
    date,
    status: outcome === 'restoration' ? 'restoration' : outcome === 'rest' ? 'rest' : 'completed',
    reduced: outcome === 'reduced' || outcome === 'restoration',
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(input.startedAt ? { startedAt: input.startedAt } : {}),
    completedAt: input.recordedAt,
    definitionSnapshot: structuredClone(definition),
  };
}
