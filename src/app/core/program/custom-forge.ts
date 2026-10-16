import type {
  DeepReadonly,
  ExercisePrescription,
  LocalDate,
  WorkoutDefinition,
  WorkoutSession,
} from '../domain/models';
import { CUSTOM_FORGE_ID, isCustomSession } from '../domain/workout';
import { addDays } from './calendar';
import type { ChapterProgram } from './chapter-program';
import { BUILDER_GROUPS, CUSTOM_FORGE_LIBRARY, type BuilderGroup } from './custom-forge-library';
import { listExerciseGuides } from './exercise-guides';
import { chapterPrograms, formatChapterNumeral } from './program-catalog';

export { CUSTOM_FORGE_ID } from '../domain/workout';

export const CUSTOM_FORGE_TITLE = 'Custom Forge';

/** The sets stepper's range in the builder. */
export const CUSTOM_SETS_MIN = 1;
export const CUSTOM_SETS_MAX = 6;

/** One exercise as the builder offers it, with the dose it starts from. */
export interface BuilderExercise {
  exerciseId: string;
  name: string;
  group: BuilderGroup;
  /** The default prescription, set count included. */
  dose: ExercisePrescription;
  /** "From Forge A", "From Chapter I Forge C", "Catalog default". */
  source: string;
}

export interface BuilderSection {
  group: BuilderGroup;
  title: string;
  exercises: BuilderExercise[];
}

/** A picked exercise: tap order is the array order. */
export interface CustomPick {
  exerciseId: string;
  sets: number;
}

/**
 * Where an exercise's builder dose comes from (RANGERS_ROAD_PROGRAM.md, The Optional Forge):
 * the current chapter's Forge A or B, then the latest dose written in a chapter up to this one,
 * then the catalog default. Warm-up doses are left out; they are one-set preparation, not work.
 */
function doseFor(
  exerciseId: string,
  program: ChapterProgram,
): { dose: ExercisePrescription; source: string } | undefined {
  const upToNow = chapterPrograms
    .filter((item) => item.chapter.number <= program.chapter.number)
    .sort((a, b) => b.chapter.number - a.chapter.number);
  for (const chapter of upToNow) {
    const current = chapter === program;
    // Forge A and B first, then the chapter's other sessions (Forge C, restoration).
    const workouts = [...chapter.workouts].sort(
      (a, b) => workoutRank(chapter, a.id) - workoutRank(chapter, b.id),
    );
    for (const workout of workouts) {
      const found = workout.exercises.find((exercise) => exercise.exerciseId === exerciseId);
      if (!found) continue;
      const where = current ? '' : `Chapter ${formatChapterNumeral(chapter.chapter.number)} `;
      return { dose: structuredClone(found), source: `From ${where}${workout.title}` };
    }
  }
  const catalog = CUSTOM_FORGE_LIBRARY[exerciseId]?.catalogDose;
  return catalog
    ? { dose: { exerciseId, ...structuredClone(catalog) }, source: 'Catalog default' }
    : undefined;
}

function workoutRank(program: ChapterProgram, workoutId: string): number {
  if (workoutId === program.restorationId) return 2;
  if (workoutId === program.optionalForgeId) return 1;
  return 0;
}

/**
 * The library grouped for the builder, in Field Manual order within each group. An exercise
 * that no chapter so far prescribes and the catalog gives no default is left out until one does,
 * so the builder never makes up a dose.
 */
export function builderLibrary(program: ChapterProgram): BuilderSection[] {
  const entries = listExerciseGuides().flatMap((guide): BuilderExercise[] => {
    const group = CUSTOM_FORGE_LIBRARY[guide.id]?.group;
    const found = group ? doseFor(guide.id, program) : undefined;
    if (!group || !found) return [];
    return [{ exerciseId: guide.id, name: guide.name, group, ...found }];
  });
  return BUILDER_GROUPS.map(({ id, title }) => ({
    group: id,
    title,
    exercises: entries.filter((entry) => entry.group === id),
  })).filter((section) => section.exercises.length);
}

/** The chapter's standard warm-up: the one its Forge A and B start with. */
export function standardWarmup(program: ChapterProgram): WorkoutDefinition['warmup'] {
  const forge = program.workouts.find(
    (workout) => workoutRank(program, workout.id) === 0 && workout.warmup?.length,
  );
  return forge?.warmup ? structuredClone(forge.warmup) : undefined;
}

/**
 * The custom session's definition, snapshotted when it starts so history keeps exactly what was
 * picked and in what order, whatever later happens to the library.
 */
export function buildCustomForge(
  program: ChapterProgram,
  picks: readonly CustomPick[],
): WorkoutDefinition {
  const library = new Map(
    builderLibrary(program).flatMap((section) =>
      section.exercises.map((exercise) => [exercise.exerciseId, exercise] as const),
    ),
  );
  if (!picks.length) throw new Error('Pick at least one exercise.');
  const exercises = picks.map((pick): ExercisePrescription => {
    const entry = library.get(pick.exerciseId);
    if (!entry) throw new Error('That exercise is not in the builder.');
    if (
      !Number.isInteger(pick.sets) ||
      pick.sets < CUSTOM_SETS_MIN ||
      pick.sets > CUSTOM_SETS_MAX
    ) {
      throw new RangeError(`Sets must be from ${CUSTOM_SETS_MIN} to ${CUSTOM_SETS_MAX}.`);
    }
    return { ...structuredClone(entry.dose), sets: pick.sets };
  });
  const warmup = standardWarmup(program);
  return {
    id: CUSTOM_FORGE_ID,
    title: CUSTOM_FORGE_TITLE,
    ...(warmup ? { warmup } : {}),
    exercises,
  };
}

/**
 * "Start from last time's list": the newest custom session's exercises in the order they were
 * worked, with their set counts. Exercises no longer in the builder are dropped from the list;
 * the saved session itself keeps them.
 */
export function lastCustomList(
  sessions: readonly WorkoutSession[],
  program: ChapterProgram,
): CustomPick[] {
  const newest = sessions
    .filter((session) => isCustomSession(session) && session.definitionSnapshot)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
        b.id.localeCompare(a.id),
    )[0];
  const exercises = newest?.definitionSnapshot?.exercises;
  if (!newest || !exercises) return [];
  const order = newest.exerciseOrder ?? exercises.map((_, index) => index);
  const available = new Set(
    builderLibrary(program).flatMap((section) => section.exercises.map((e) => e.exerciseId)),
  );
  return order.flatMap((index): CustomPick[] => {
    const exercise = exercises[index];
    if (!exercise || !available.has(exercise.exerciseId)) return [];
    const sets = Math.min(CUSTOM_SETS_MAX, Math.max(CUSTOM_SETS_MIN, exercise.sets ?? 1));
    return [{ exerciseId: exercise.exerciseId, sets }];
  });
}

/** A Forge saved today or yesterday, for the repeat note. */
export type RecentForge = Pick<
  WorkoutSession,
  'date' | 'workoutDefinitionId' | 'kind' | 'definitionSnapshot' | 'exerciseResults'
>;

/**
 * The quiet repeat note: which picks were in today's or yesterday's Forge A or B. It reads the
 * sessions actually saved (completed or stopped), never blocks anything, and is null when
 * nothing repeats. Restoration, Forge C and custom sessions are not main lifts.
 */
export function repeatNote(
  picks: readonly Pick<CustomPick, 'exerciseId'>[],
  sessions: readonly RecentForge[],
  today: LocalDate,
  nameOf: (exerciseId: string) => string,
): string | null {
  const yesterday = addDays(today, -1);
  const lines: string[] = [];
  for (const [date, when] of [
    [today, 'today’s'],
    [yesterday, 'yesterday’s'],
  ] as const) {
    for (const session of sessions) {
      if (session.date !== date || !isMainForge(session)) continue;
      const done = new Set(mainExerciseIds(session));
      const repeated = picks.filter((pick) => done.has(pick.exerciseId));
      if (!repeated.length) continue;
      const names = joinNames(repeated.map((pick) => nameOf(pick.exerciseId)));
      const title = session.definitionSnapshot?.title ?? 'Forge';
      lines.push(`${names} ${repeated.length === 1 ? 'was' : 'were'} in ${when} ${title}.`);
    }
  }
  return lines.length ? lines.join(' ') : null;
}

function isMainForge(session: RecentForge): boolean {
  if (isCustomSession(session)) return false;
  const program = chapterPrograms.find((item) =>
    item.workouts.some((workout) => workout.id === session.workoutDefinitionId),
  );
  return !!program && workoutRank(program, session.workoutDefinitionId) === 0;
}

function mainExerciseIds(session: RecentForge): string[] {
  const snapshot = session.definitionSnapshot as DeepReadonly<WorkoutDefinition> | undefined;
  return snapshot
    ? snapshot.exercises.map((exercise) => exercise.exerciseId)
    : session.exerciseResults.map((result) => result.exerciseId);
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** "3 × 6", "2 × 20–30 sec per side": the dose a builder row shows. */
export function doseLabel(dose: DeepReadonly<ExercisePrescription>, sets = dose.sets ?? 1): string {
  const amount =
    dose.reps !== undefined ? `${dose.reps}` : `${dose.durationSeconds ?? dose.duration ?? ''} sec`;
  return `${sets} × ${amount}${dose.perSide ? ' per side' : ''}`;
}

/** Where an optional Forge opens: the builder for the custom Forge, else the session itself. */
export function optionalForgeLink(workoutId: string): string[] {
  return workoutId === CUSTOM_FORGE_ID ? ['/forge/custom'] : ['/forge/session', workoutId];
}
