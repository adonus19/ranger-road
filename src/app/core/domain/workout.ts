import type {
  CompletedSet,
  ExerciseResult,
  IsoTimestamp,
  LocalDate,
  PainEvent,
  ReadinessCheck,
  ReadinessStatus,
  WorkoutDefinition,
  WorkoutDraft,
  WorkoutSession,
} from './models';
import { classifyReadiness } from './readiness';

export interface WorkoutStart {
  date: LocalDate;
  definition: WorkoutDefinition;
  /** A manually reduced session, including the documented Week 4 deload. */
  reduced?: boolean;
  /** Source-backed, date-specific instructions shown before the first set. */
  sessionInstructions?: string[];
}

export type WorkoutPainInput = Pick<
  PainEvent,
  'bodyArea' | 'severity' | 'exerciseId' | 'actionTaken'
> & {
  exerciseId: string;
};

export type RecordedWorkoutPainEvent = PainEvent & {
  id: string;
  exerciseId: string;
  workoutSessionId: string;
};

export interface PreviousWorkoutLoad {
  load: number;
  date: LocalDate;
  sessionId: string;
  reduced: boolean;
  painTriggered: boolean;
}

/** This is the only Chapter I restoration definition in the current source pack. */
function isRestorationWorkout(definitionId: string): boolean {
  return definitionId === 'chapter-1-restoration';
}

function hasSevereWorkoutPain(results: ExerciseResult[]): boolean {
  return results.some((result) => result.painEvents.some((event) => event.severity >= 5));
}

/** A stored status cannot make a check safer than its actual answers. */
export function effectiveReadinessStatus(check: ReadinessCheck): ReadinessStatus {
  const derived = classifyReadiness(check);
  if (derived === 'red' || check.status === 'red') return 'red';
  if (derived === 'yellow' || check.status === 'yellow') return 'yellow';
  return 'green';
}

export function latestWorkoutReadiness(
  checks: ReadinessCheck[],
  date: LocalDate,
): ReadinessCheck | undefined {
  return checks
    .filter((check) => check.date === date)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt) || a.id.localeCompare(b.id))
    .at(-1);
}

export function createWorkoutDraft(
  input: WorkoutStart,
  readiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `workout-${crypto.randomUUID()}`,
): WorkoutDraft {
  assertLocalDate(input.date);
  assertTimestamp(now, 'Start time');
  if (!readiness || readiness.date !== input.date) {
    throw new Error('Check readiness today before starting a strength session.');
  }
  const status = effectiveReadinessStatus(readiness);
  if (status === 'red' && !isRestorationWorkout(input.definition.id)) {
    throw new Error(
      'Red readiness means no strength session today. Choose restoration if appropriate.',
    );
  }
  if (
    !input.definition.id.trim() ||
    !input.definition.title.trim() ||
    !input.definition.exercises.length
  ) {
    throw new Error('This workout needs a named prescription before it can start.');
  }
  const ids = input.definition.exercises.map((exercise) => exercise.exerciseId);
  if (ids.some((exerciseId) => !exerciseId.trim()) || new Set(ids).size !== ids.length) {
    throw new Error('The workout prescription needs distinct named exercises.');
  }
  if (input.sessionInstructions?.some((instruction) => !instruction.trim())) {
    throw new Error('Session instructions cannot be blank.');
  }

  const snapshot = structuredClone(input.definition);
  return {
    id,
    date: input.date,
    workoutDefinitionId: snapshot.id,
    readinessId: readiness.id,
    startedAt: now,
    updatedAt: now,
    reduced: Boolean(input.reduced) || status !== 'green',
    warmupComplete: !snapshot.warmup?.length,
    finishComplete: !snapshot.finish?.length,
    optionalFinishComplete: false,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    definitionSnapshot: snapshot,
    exerciseResults: snapshot.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Array.from({ length: exercise.sets ?? 1 }, () => ({})),
      painEvents: [],
    })),
    sessionInstructions: input.sessionInstructions ? [...input.sessionInstructions] : undefined,
  };
}

/** Caller-owned set edits are checked, while identity, prescription, and pain history stay canonical. */
export function updateWorkoutDraft(
  stored: WorkoutDraft,
  edited: WorkoutDraft,
  readiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): WorkoutDraft {
  assertTimestamp(now, 'Save time');
  if (
    stored.id !== edited.id ||
    stored.date !== edited.date ||
    stored.workoutDefinitionId !== edited.workoutDefinitionId
  ) {
    throw new Error('The active workout changed. Reload it before saving.');
  }
  if (!readiness || readiness.date !== stored.date) {
    throw new Error('Check readiness today before continuing this session.');
  }
  const status = effectiveReadinessStatus(readiness);
  if (status === 'red' && !isRestorationWorkout(stored.workoutDefinitionId)) {
    throw new Error(
      'Red readiness means stop strength work. Record pain or end the session safely.',
    );
  }
  if (
    !isRestorationWorkout(stored.workoutDefinitionId) &&
    hasSevereWorkoutPain(stored.exerciseResults)
  ) {
    throw new Error('Pain at 5 or above means stop strength work. End this as a stopped session.');
  }

  const prescriptions = stored.definitionSnapshot.exercises;
  if (edited.exerciseResults.length !== prescriptions.length) {
    throw new Error('The saved set list does not match this workout.');
  }
  const results: ExerciseResult[] = edited.exerciseResults.map((result, index) => {
    const prescription = prescriptions[index];
    const original = stored.exerciseResults[index];
    if (
      result.exerciseId !== prescription.exerciseId ||
      original.exerciseId !== result.exerciseId ||
      result.sets.length !== (prescription.sets ?? 1)
    ) {
      throw new Error('The saved set list does not match this workout.');
    }
    if (result.substitutionId && !prescription.substitutionIds?.includes(result.substitutionId)) {
      throw new Error('That substitute is not part of the documented prescription.');
    }
    return {
      exerciseId: result.exerciseId,
      sets: result.sets.map(validateCompletedSet),
      painEvents: structuredClone(original.painEvents),
      substitutionId: result.substitutionId,
      modificationNotes: result.modificationNotes?.trim() || undefined,
    };
  });
  if (
    !Number.isInteger(edited.currentExerciseIndex) ||
    edited.currentExerciseIndex < 0 ||
    edited.currentExerciseIndex > prescriptions.length
  ) {
    throw new RangeError('The current exercise is outside this workout.');
  }
  const current = prescriptions[edited.currentExerciseIndex];
  const setLimit = current?.sets ?? 1;
  if (
    !Number.isInteger(edited.currentSetIndex) ||
    edited.currentSetIndex < 0 ||
    edited.currentSetIndex >= (current ? setLimit : 1)
  ) {
    throw new RangeError('The current set is outside this exercise.');
  }
  if (edited.restStartedAt) assertTimestamp(edited.restStartedAt, 'Rest start time');
  if (edited.sessionRpe !== undefined) assertRating(edited.sessionRpe, 1, 10, 'Session RPE');

  return {
    ...structuredClone(stored),
    updatedAt: now,
    readinessId: readiness.id,
    reduced:
      stored.reduced ||
      edited.reduced ||
      status !== 'green' ||
      results.some((result) => result.sets.some((set) => set.completed === false)),
    warmupComplete: stored.warmupComplete || edited.warmupComplete,
    finishComplete: stored.finishComplete || edited.finishComplete,
    optionalFinishComplete: stored.optionalFinishComplete || edited.optionalFinishComplete,
    currentExerciseIndex: edited.currentExerciseIndex,
    currentSetIndex: edited.currentSetIndex,
    restStartedAt: edited.restStartedAt,
    exerciseResults: results,
    sessionRpe: edited.sessionRpe,
    notes: edited.notes,
  };
}

export function createRecordedWorkoutPain(
  draft: WorkoutDraft,
  input: WorkoutPainInput,
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `pain-${crypto.randomUUID()}`,
): RecordedWorkoutPainEvent {
  assertTimestamp(now, 'Pain time');
  assertRating(input.severity, 0, 10, 'Pain severity');
  if (!input.bodyArea.trim() || !input.actionTaken.trim()) {
    throw new Error('Record the pain area and what you did.');
  }
  if (!draft.exerciseResults.some((result) => result.exerciseId === input.exerciseId)) {
    throw new Error('Choose an exercise in this session for the pain record.');
  }
  return {
    id,
    timestamp: now,
    bodyArea: input.bodyArea.trim(),
    severity: input.severity,
    exerciseId: input.exerciseId,
    actionTaken: input.actionTaken.trim(),
    workoutSessionId: draft.id,
  };
}

export function completeWorkoutDraft(
  draft: WorkoutDraft,
  readiness: ReadinessCheck | undefined,
  outcome: 'completed' | 'stopped' = 'completed',
  now: IsoTimestamp = new Date().toISOString(),
): WorkoutSession {
  assertTimestamp(now, 'End time');
  if (outcome === 'completed') {
    if (!readiness || readiness.date !== draft.date) {
      throw new Error('Check readiness today before finishing this session.');
    }
    const status = effectiveReadinessStatus(readiness);
    if (status === 'red' && !isRestorationWorkout(draft.workoutDefinitionId)) {
      throw new Error('Red readiness means stop strength work. End this as a stopped session.');
    }
    if (
      !isRestorationWorkout(draft.workoutDefinitionId) &&
      hasSevereWorkoutPain(draft.exerciseResults)
    ) {
      throw new Error(
        'Pain at 5 or above means stop strength work. End this as a stopped session.',
      );
    }
    if (readiness.id !== draft.readinessId) {
      throw new Error('Readiness changed. Review the session before finishing.');
    }
    if (status !== 'green' && !draft.reduced) {
      throw new Error('Yellow or Red readiness requires a reduced session.');
    }
    if (
      draft.exerciseResults.some((result) => result.sets.some((set) => set.completed === undefined))
    ) {
      throw new Error('Mark every prescribed set done or skipped before finishing.');
    }
    if (
      !draft.reduced &&
      draft.exerciseResults.some((result) => result.sets.some((set) => !set.completed))
    ) {
      throw new Error('Skipped sets must be recorded as a reduced session.');
    }
    if (draft.definitionSnapshot.finish?.length && !draft.finishComplete) {
      throw new Error('Complete the prescribed finish before finishing this session.');
    }
  }
  return {
    id: draft.id,
    date: draft.date,
    workoutDefinitionId: draft.workoutDefinitionId,
    readinessId: draft.readinessId,
    startedAt: draft.startedAt,
    completedAt: now,
    outcome,
    reduced: draft.reduced || outcome === 'stopped',
    warmupComplete: draft.warmupComplete,
    finishComplete: draft.finishComplete,
    optionalFinishComplete: draft.optionalFinishComplete,
    definitionSnapshot: structuredClone(draft.definitionSnapshot),
    exerciseResults: structuredClone(draft.exerciseResults),
    sessionRpe: draft.sessionRpe,
    notes: draft.notes,
    sessionInstructions: draft.sessionInstructions ? [...draft.sessionInstructions] : undefined,
  };
}

/** Display-only context. It never calculates or applies the next load. */
export function previousWorkoutLoad(
  sessions: WorkoutSession[],
  exerciseId: string,
): PreviousWorkoutLoad | undefined {
  const newest = [...sessions]
    .filter((session) => session.outcome !== 'stopped')
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
        b.id.localeCompare(a.id),
    );
  for (const session of newest) {
    const result = session.exerciseResults.find((item) => item.exerciseId === exerciseId);
    if (!result || result.substitutionId) continue;
    const set = [...result.sets]
      .reverse()
      .find(
        (item) =>
          item.completed !== false &&
          item.load !== undefined &&
          Number.isFinite(item.load) &&
          item.load >= 0,
      );
    if (set?.load !== undefined) {
      return {
        load: set.load,
        date: session.date,
        sessionId: session.id,
        reduced: Boolean(session.reduced),
        painTriggered: session.exerciseResults.some((item) => item.painEvents.length > 0),
      };
    }
  }
  return undefined;
}

function validateCompletedSet(set: CompletedSet): CompletedSet {
  if (set.reps !== undefined) assertRating(set.reps, 0, Number.MAX_SAFE_INTEGER, 'Reps');
  if (set.duration !== undefined)
    assertFiniteRange(set.duration, 0, Number.MAX_SAFE_INTEGER, 'Duration');
  if (set.load !== undefined) assertFiniteRange(set.load, 0, Number.MAX_SAFE_INTEGER, 'Load');
  if (set.rpe !== undefined) assertRating(set.rpe, 1, 10, 'Set RPE');
  if (set.completed !== undefined && typeof set.completed !== 'boolean') {
    throw new Error('Set completion must be yes or no.');
  }
  return structuredClone(set);
}

function assertRating(value: number, min: number, max: number, label: string): void {
  assertFiniteRange(value, min, max, label);
  if (!Number.isInteger(value)) throw new RangeError(`${label} must be a whole number.`);
}

function assertFiniteRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label} must be between ${min} and ${max}.`);
  }
}

function assertTimestamp(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`);
}

function assertLocalDate(date: LocalDate): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error('Workout date must be a real local calendar date.');
  }
}
