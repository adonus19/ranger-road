import type {
  DeepReadonly,
  SavedExerciseOrder,
  WorkoutDefinition,
  WorkoutDraft,
} from '../../../core/domain/models';

/** A place in the session: indices into the draft's exercises and that exercise's sets. */
export interface SessionPosition {
  exercise: number;
  set: number;
}

type NavigableDraft = Pick<WorkoutDraft, 'exerciseResults' | 'exerciseOrder'>;

function firstUnmarked(draft: NavigableDraft, exercise: number, from = 0): number {
  const sets = draft.exerciseResults[exercise]?.sets ?? [];
  const after = sets.findIndex((set, index) => index >= from && set.completed === undefined);
  return after !== -1 ? after : sets.findIndex((set) => set.completed === undefined);
}

/** Where the session ends up when every set is marked: the finish screen. */
export function finishedPosition(draft: NavigableDraft): SessionPosition {
  return { exercise: draft.exerciseResults.length, set: 0 };
}

/** Exercise indices in the order the person works them; the written order when none is chosen. */
export function displayOrder(
  draft: NavigableDraft,
  order: readonly number[] | undefined = draft.exerciseOrder,
): number[] {
  return order ? [...order] : draft.exerciseResults.map((_, index) => index);
}

/**
 * Where to stand after the order changes. Before any set is marked, the person moves to the new
 * first exercise; once work has started, they stay where they are.
 */
export function positionAfterReorder(
  draft: NavigableDraft & Pick<WorkoutDraft, 'currentExerciseIndex' | 'currentSetIndex'>,
  order: readonly number[] | undefined,
): SessionPosition {
  const started = draft.exerciseResults.some((result) =>
    result.sets.some((set) => set.completed !== undefined),
  );
  if (started) return { exercise: draft.currentExerciseIndex, set: draft.currentSetIndex };
  // Not displayOrder: an undefined order here means the written order, not the draft's own.
  return { exercise: order?.[0] ?? 0, set: 0 };
}

/** Tapping an exercise opens its first unmarked set, or its last set when all are marked. */
export function openSetFor(draft: NavigableDraft, exercise: number): SessionPosition {
  const sets = draft.exerciseResults[exercise]?.sets ?? [];
  const set = firstUnmarked(draft, exercise);
  return { exercise, set: set !== -1 ? set : Math.max(0, sets.length - 1) };
}

/**
 * Where to go after a set is marked. The person stays on the exercise until all its sets are
 * marked, then moves to the next exercise in their order that has unmarked sets, wrapping to the
 * top. With nothing left, the session is finished.
 */
export function nextAfterMark(
  draft: NavigableDraft,
  from: SessionPosition,
  order?: readonly number[],
): SessionPosition {
  const sameExercise = firstUnmarked(draft, from.exercise, from.set + 1);
  if (sameExercise !== -1) return { exercise: from.exercise, set: sameExercise };

  const sequence = displayOrder(draft, order);
  const start = sequence.indexOf(from.exercise);
  for (let step = 1; step <= sequence.length; step++) {
    const exercise = sequence[(start + step + sequence.length) % sequence.length];
    if (exercise === from.exercise) continue;
    const set = firstUnmarked(draft, exercise);
    if (set !== -1) return { exercise, set };
  }
  return finishedPosition(draft);
}

export interface AppliedOrder {
  /** Indices into the workout's exercises; missing means the written order. */
  order?: number[];
  /** A saved order no longer fits this workout, so it was set aside. */
  changed: boolean;
}

/**
 * Turns a remembered order of exercise IDs into indices for this workout. It applies only when
 * its IDs are exactly the workout's exercise IDs; otherwise the written order is used.
 */
export function applySavedOrder(
  definition: DeepReadonly<Pick<WorkoutDefinition, 'exercises'>>,
  saved: Pick<SavedExerciseOrder, 'exerciseIds'> | undefined,
): AppliedOrder {
  if (!saved) return { changed: false };
  const unused = definition.exercises.map((exercise) => exercise.exerciseId as string | undefined);
  const order: number[] = [];
  for (const id of saved.exerciseIds) {
    const index = unused.indexOf(id);
    if (index === -1) return { changed: true };
    unused[index] = undefined;
    order.push(index);
  }
  if (order.length !== definition.exercises.length) return { changed: true };
  return { order, changed: false };
}
