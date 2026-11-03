import type {
  CompletedSet,
  ExercisePrescription,
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
import { shoulderSwapFor, swappedPrescription } from '../program/readiness-swaps';
import { classifyReadiness } from './readiness';

export interface WorkoutStart {
  date: LocalDate;
  definition: WorkoutDefinition;
  /** A manually reduced session, including the documented Week 4 deload. */
  reduced?: boolean;
  /** Source-backed, date-specific instructions shown before the first set. */
  sessionInstructions?: string[];
  /** The remembered order, as indices into the definition's exercises. */
  exerciseOrder?: number[];
  /** A custom Forge built from the library: kept in history, never fed to progression. */
  kind?: 'custom';
}

/** The custom Forge's workout ID; its prescription lives only in each session's snapshot. */
export const CUSTOM_FORGE_ID = 'custom-forge';

/** A custom Forge session (older rows may carry only the ID). Never an exposure. */
export function isCustomSession(
  session: Pick<WorkoutSession, 'kind' | 'workoutDefinitionId'>,
): boolean {
  return session.kind === 'custom' || session.workoutDefinitionId === CUSTOM_FORGE_ID;
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
  if ((input.kind === 'custom') !== (input.definition.id === CUSTOM_FORGE_ID)) {
    throw new Error('A custom Forge needs its own definition.');
  }
  if (input.sessionInstructions?.some((instruction) => !instruction.trim())) {
    throw new Error('Session instructions cannot be blank.');
  }

  const snapshot = structuredClone(input.definition);
  if (input.exerciseOrder) assertExerciseOrder(input.exerciseOrder, snapshot.exercises.length);
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
    currentExerciseIndex: input.exerciseOrder?.[0] ?? 0,
    currentSetIndex: 0,
    definitionSnapshot: snapshot,
    exerciseResults: snapshot.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Array.from({ length: exercise.sets ?? 1 }, () => ({})),
      painEvents: [],
    })),
    sessionInstructions: input.sessionInstructions ? [...input.sessionInstructions] : undefined,
    exerciseOrder: input.exerciseOrder ? [...input.exerciseOrder] : undefined,
    ...(input.kind === 'custom' ? { kind: 'custom' as const } : {}),
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
      ...(original.swappedFrom ? { swappedFrom: original.swappedFrom } : {}),
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
  if (edited.exerciseOrder) assertExerciseOrder(edited.exerciseOrder, prescriptions.length);
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
    // Only a custom Forge's warm-up can be skipped, and only before it is done.
    ...(stored.kind === 'custom' &&
    (stored.warmupSkipped || (edited.warmupSkipped && !stored.warmupComplete))
      ? { warmupSkipped: true }
      : {}),
    finishComplete: stored.finishComplete || edited.finishComplete,
    optionalFinishComplete: stored.optionalFinishComplete || edited.optionalFinishComplete,
    currentExerciseIndex: edited.currentExerciseIndex,
    currentSetIndex: edited.currentSetIndex,
    restStartedAt: edited.restStartedAt,
    exerciseOrder: edited.exerciseOrder ? [...edited.exerciseOrder] : undefined,
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

/**
 * A calm readiness swap on one exercise: the person did not start it yet, today's shoulder pain
 * is high enough, and the program names this swap. The draft then holds the exercise actually
 * done, the session reads as reduced, and the written exercise is kept in `swappedFrom`.
 */
export function swapWorkoutExercise(
  stored: WorkoutDraft,
  index: number,
  toId: string,
  readiness: ReadinessCheck | undefined,
  now: IsoTimestamp = new Date().toISOString(),
): WorkoutDraft {
  assertTimestamp(now, 'Swap time');
  if (!readiness || readiness.date !== stored.date) {
    throw new Error('Check readiness today before continuing this session.');
  }
  const written = stored.definitionSnapshot.exercises[index];
  const result = stored.exerciseResults[index];
  if (!written || !result) throw new RangeError('That exercise is not in this session.');
  if (result.swappedFrom) throw new Error('This exercise was already swapped.');
  const swap = shoulderSwapFor(written.exerciseId, readiness.shoulderPain);
  if (!swap || swap.toId !== toId) {
    throw new Error('That swap is not offered at today’s readiness.');
  }
  if (stored.exerciseResults.some((item) => item.exerciseId === toId)) {
    throw new Error('That exercise is already in this session.');
  }
  if (result.sets.some((set) => set.completed !== undefined)) {
    throw new Error('Swap before the first set. Record a modification instead.');
  }
  const updated = structuredClone(stored);
  const snapshot = updated.definitionSnapshot as WorkoutDefinition;
  snapshot.exercises[index] = swappedPrescription(written, toId);
  updated.exerciseResults[index] = {
    exerciseId: toId,
    sets: Array.from({ length: snapshot.exercises[index].sets ?? 1 }, () => ({})),
    painEvents: structuredClone(result.painEvents),
    swappedFrom: written.exerciseId,
    modificationNotes: `Swapped from the written exercise for shoulder pain (${readiness.shoulderPain}).`,
  };
  updated.reduced = true;
  updated.updatedAt = now;
  return updated;
}

/**
 * "Take this step" before the track slot's first set: the session does the new step from now
 * on. The step's prescription comes from the slot as written (`stepPrescription`). A slot that
 * was swapped, has a marked set or a pain note keeps today's exercise; the step starts next time.
 */
export function stepUpWorkoutExercise(
  stored: WorkoutDraft,
  index: number,
  prescription: ExercisePrescription,
  now: IsoTimestamp = new Date().toISOString(),
): WorkoutDraft {
  assertTimestamp(now, 'Step time');
  const current = stored.definitionSnapshot.exercises[index];
  const result = stored.exerciseResults[index];
  if (!current || !result) throw new RangeError('That exercise is not in this session.');
  if (!current.trackId || current.trackId !== prescription.trackId) {
    throw new Error('That exercise is not a skill track slot.');
  }
  if (result.swappedFrom) throw new Error('This exercise was swapped today.');
  if (result.sets.some((set) => set.completed !== undefined) || result.painEvents.length) {
    throw new Error('The new step starts next time, since this one has begun.');
  }
  if (
    stored.exerciseResults.some(
      (item, other) => other !== index && item.exerciseId === prescription.exerciseId,
    )
  ) {
    throw new Error('That exercise is already in this session.');
  }
  if (!Number.isInteger(prescription.sets ?? 1) || (prescription.sets ?? 1) < 1) {
    throw new RangeError('The step needs at least one set.');
  }
  const updated = structuredClone(stored);
  const snapshot = updated.definitionSnapshot as WorkoutDefinition;
  snapshot.exercises[index] = structuredClone(prescription);
  updated.exerciseResults[index] = {
    exerciseId: prescription.exerciseId,
    sets: Array.from({ length: prescription.sets ?? 1 }, () => ({})),
    painEvents: [],
  };
  if (updated.currentExerciseIndex === index) updated.currentSetIndex = 0;
  updated.updatedAt = now;
  return updated;
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
    exerciseOrder: draft.exerciseOrder ? [...draft.exerciseOrder] : undefined,
    ...(draft.kind === 'custom' ? { kind: 'custom' as const } : {}),
    ...(draft.kind === 'custom' && draft.warmupSkipped ? { warmupSkipped: true } : {}),
  };
}

/** An order is a permutation of 0..count-1, so every exercise appears exactly once. */
export function isExerciseOrder(order: readonly number[], count: number): boolean {
  return (
    order.length === count &&
    new Set(order).size === count &&
    order.every((index) => Number.isInteger(index) && index >= 0 && index < count)
  );
}

function assertExerciseOrder(order: readonly number[], count: number): void {
  if (!isExerciseOrder(order, count)) {
    throw new RangeError('The exercise order must list every exercise once.');
  }
}

function validateCompletedSet(set: CompletedSet): CompletedSet {
  if (set.reps !== undefined) assertRating(set.reps, 0, Number.MAX_SAFE_INTEGER, 'Reps');
  if (set.duration !== undefined)
    assertFiniteRange(set.duration, 0, Number.MAX_SAFE_INTEGER, 'Duration');
  if (set.load !== undefined) assertFiniteRange(set.load, 0, Number.MAX_SAFE_INTEGER, 'Load');
  if (set.assistance !== undefined)
    assertFiniteRange(set.assistance, 0, Number.MAX_SAFE_INTEGER, 'Band assistance');
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
