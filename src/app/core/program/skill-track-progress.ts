import type {
  DeepReadonly,
  ExercisePrescription,
  IsoTimestamp,
  LocalDate,
  ReadinessCheck,
  TrackStepChoice,
  WorkoutDefinition,
  WorkoutSession,
} from '../domain/models';
import { effectiveReadinessStatus, isCustomSession } from '../domain/workout';
import { CUSTOM_FORGE_LIBRARY } from './custom-forge-library';
import { parseRange, type CampaignDayInfo } from './progression';
import {
  SKILL_TRACKS,
  STEP_FINAL_EFFORT_CEILING,
  skillTrack,
  type SkillTrack,
  type TrackStep,
} from './skill-tracks';

/**
 * Skill-track progress (RANGERS_ROAD_PROGRAM.md, Skill Tracks). Whether a step is passed and
 * whether the next one is available are worked out from saved sessions and the campaign
 * position each time; only the person's "Take this step" choices are stored. Nothing here
 * moves a track on its own.
 */

/** The first session that met a step's criteria, and the chapter it was in. */
export interface StepPass {
  exerciseId: string;
  sessionId: string;
  date: LocalDate;
  chapter?: number;
}

export interface TrackStatus {
  track: SkillTrack;
  currentIndex: number;
  current: TrackStep;
  /** Every step passed so far, in track order. */
  passes: StepPass[];
  next?: TrackStep;
  /** The current step is passed and the next step's earliest chapter has come. */
  nextAvailable: boolean;
  /** The step before the current one, when there is one to go back to. */
  previous?: TrackStep;
}

export interface TrackContext {
  sessions: readonly WorkoutSession[];
  readinessById: ReadonlyMap<string, ReadinessCheck>;
  dayOf(date: LocalDate): CampaignDayInfo | null;
}

function newestChoiceFirst(a: TrackStepChoice, b: TrackStepChoice): number {
  return b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id);
}

/** The person's current step: the newest choice for the track, else the first step. */
export function currentStepIndex(track: SkillTrack, choices: readonly TrackStepChoice[]): number {
  const newest = choices
    .filter((choice) => choice.trackId === track.id)
    .sort(newestChoiceFirst)
    .find((choice) => track.steps.some((step) => step.exerciseId === choice.exerciseId));
  return newest ? track.steps.findIndex((step) => step.exerciseId === newest.exerciseId) : 0;
}

/**
 * Whether one saved session shows a step's criteria. Only a completed Forge A, B or C counts:
 * never a custom Forge or a stopped session, never a Yellow day, and never the exercise when it
 * carries a pain note, a readiness swap, a substitute or a written modification. The final
 * set's effort must be recorded and 7 or less.
 */
export function sessionMeetsStep(
  session: DeepReadonly<WorkoutSession>,
  step: TrackStep,
  readinessById: ReadonlyMap<string, ReadinessCheck>,
): boolean {
  const criteria = step.criteria;
  if (!criteria || isCustomSession(session) || session.outcome === 'stopped') return false;
  const check = readinessById.get(session.readinessId);
  if (check && effectiveReadinessStatus(check) !== 'green') return false;
  const result = session.exerciseResults.find((item) => item.exerciseId === step.exerciseId);
  if (
    !result ||
    result.swappedFrom ||
    result.substitutionId ||
    result.modificationNotes ||
    result.painEvents.length
  ) {
    return false;
  }
  const done = result.sets.filter((set) => set.completed === true);
  const effort = done.at(-1)?.rpe;
  if (effort === undefined || !Number.isFinite(effort) || effort > STEP_FINAL_EFFORT_CEILING) {
    return false;
  }

  let reps: number | undefined;
  if (criteria.reps === 'top-of-range') {
    const written = session.definitionSnapshot?.exercises.find(
      (item) => item.exerciseId === step.exerciseId,
    );
    reps = parseRange(written?.reps)?.high;
    if (reps === undefined) return false;
  } else {
    reps = criteria.reps;
  }
  const meeting = done.filter(
    (set) =>
      (reps === undefined || (set.reps ?? -1) >= reps) &&
      (criteria.seconds === undefined || (set.duration ?? -1) >= criteria.seconds) &&
      (criteria.maxAssistance === undefined ||
        (set.assistance !== undefined &&
          Number.isFinite(set.assistance) &&
          set.assistance <= criteria.maxAssistance)),
  );
  if (meeting.length < criteria.sets) return false;
  if (criteria.totalReps !== undefined) {
    const total = done.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    if (total < criteria.totalReps) return false;
  }
  return true;
}

function oldestFirst(a: DeepReadonly<WorkoutSession>, b: DeepReadonly<WorkoutSession>): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.completedAt ?? '').localeCompare(b.completedAt ?? '') ||
    a.id.localeCompare(b.id)
  );
}

/** The first pass of each step that has one, in track order. */
export function stepPasses(track: SkillTrack, context: TrackContext): StepPass[] {
  const sessions = [...context.sessions].sort(oldestFirst);
  return track.steps.flatMap((step): StepPass[] => {
    const first = sessions.find((session) =>
      sessionMeetsStep(session, step, context.readinessById),
    );
    if (!first) return [];
    const chapter = context.dayOf(first.date)?.chapter;
    return [
      {
        exerciseId: step.exerciseId,
        sessionId: first.id,
        date: first.date,
        ...(chapter !== undefined ? { chapter } : {}),
      },
    ];
  });
}

/** Where a track stands today. `chapter` is today's chapter number. */
export function trackStatus(
  track: SkillTrack,
  choices: readonly TrackStepChoice[],
  context: TrackContext,
  chapter: number,
): TrackStatus {
  const currentIndex = currentStepIndex(track, choices);
  const current = track.steps[currentIndex];
  const next = track.steps[currentIndex + 1];
  const passes = stepPasses(track, context);
  const currentPassed = passes.some((pass) => pass.exerciseId === current.exerciseId);
  return {
    track,
    currentIndex,
    current,
    passes,
    ...(next ? { next } : {}),
    ...(currentIndex > 0 ? { previous: track.steps[currentIndex - 1] } : {}),
    nextAvailable: !!next && currentPassed && chapter >= next.earliestChapter,
  };
}

/** The current step's exercise for every track, by track ID. */
export function currentSteps(choices: readonly TrackStepChoice[]): ReadonlyMap<string, string> {
  return new Map(
    SKILL_TRACKS.map((track) => [
      track.id,
      track.steps[currentStepIndex(track, choices)].exerciseId,
    ]),
  );
}

/**
 * A step's prescription in a track slot. The chapter writes the slot's dose for whatever step
 * is current ("Handstand track (current step) — 3 × 15–30 sec"), so a step counted the same way
 * (reps or seconds) keeps the slot's sets and dose. A step counted the other way takes its
 * catalog dose. The step's own catalog note comes first, then the slot's.
 */
export function stepPrescription(
  written: DeepReadonly<ExercisePrescription>,
  stepExerciseId: string,
): ExercisePrescription {
  const trackId = written.trackId;
  if (stepExerciseId === written.exerciseId)
    return structuredClone(written) as ExercisePrescription;
  const catalog = CUSTOM_FORGE_LIBRARY[stepExerciseId]?.catalogDose;
  const writtenCountsReps = written.reps !== undefined;
  const sameUnit = !catalog || (catalog.reps !== undefined) === writtenCountsReps;
  const notes = [catalog?.notes, sameUnit ? written.notes : undefined]
    .filter((note): note is string => !!note)
    .join(' ');
  const dose =
    sameUnit || !catalog
      ? {
          ...(written.sets !== undefined ? { sets: written.sets } : {}),
          ...(written.reps !== undefined ? { reps: written.reps } : {}),
          ...(written.durationSeconds !== undefined
            ? { durationSeconds: written.durationSeconds }
            : {}),
          ...(written.duration !== undefined ? { duration: written.duration } : {}),
          ...(written.perSide ? { perSide: true } : {}),
        }
      : {
          ...(catalog.sets !== undefined ? { sets: catalog.sets } : {}),
          ...(catalog.reps !== undefined ? { reps: catalog.reps } : {}),
          ...(catalog.durationSeconds !== undefined
            ? { durationSeconds: catalog.durationSeconds }
            : {}),
          ...(catalog.perSide ? { perSide: true } : {}),
        };
  return {
    exerciseId: stepExerciseId,
    ...dose,
    ...(notes ? { notes } : {}),
    ...(trackId ? { trackId } : {}),
  };
}

/** A workout as the person does it today: each track slot holds their current step. */
export function withCurrentSteps(
  definition: DeepReadonly<WorkoutDefinition>,
  choices: readonly TrackStepChoice[],
): WorkoutDefinition {
  const steps = currentSteps(choices);
  const resolved = structuredClone(definition) as WorkoutDefinition;
  resolved.exercises = resolved.exercises.map((exercise) => {
    const stepId = exercise.trackId ? steps.get(exercise.trackId) : undefined;
    return stepId ? stepPrescription(exercise, stepId) : exercise;
  });
  return resolved;
}

/**
 * A "Take this step" or "Go back a step" choice, checked against the track: only the step right
 * after the current one, or the one right before it, can be chosen. Whether a step up is
 * available (criteria and chapter) is the screen's to show; going back is always the person's
 * to do. Choices are only ever added, and the newest one is the current step.
 */
export function createTrackStepChoice(
  trackId: string,
  exerciseId: string,
  choices: readonly TrackStepChoice[],
  now: IsoTimestamp = new Date().toISOString(),
  id: string = `track-step-${crypto.randomUUID()}`,
): TrackStepChoice {
  const track = skillTrack(trackId);
  if (!track) throw new Error('That skill track is not in the program.');
  const index = currentStepIndex(track, choices);
  const allowed = [track.steps[index + 1], track.steps[index - 1]];
  if (!allowed.some((step) => step?.exerciseId === exerciseId)) {
    throw new Error('That is not the next step, or the one before, on this track.');
  }
  if (!Number.isFinite(Date.parse(now))) throw new Error('Choice time is invalid.');
  return { id, trackId, exerciseId, takenAt: now };
}
