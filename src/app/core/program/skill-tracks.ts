/**
 * The skill tracks (RANGERS_ROAD_PROGRAM.md, Skill Tracks): one Forge slot whose exercise steps
 * up over the campaign. Each step's earliest chapter and "Passed when" come from
 * docs/rangers-road-full-program-content/EXERCISE_CATALOG.md, approved with ticket 01.
 *
 * Content only. The engine that reads it is `skill-track-progress.ts`; screens never hard-code
 * a step, a criterion or a chapter.
 */

export type TrackId = 'pull' | 'push' | 'handstand' | 'planche';

/**
 * The part of a step's "Passed when" that the saved sets can show, all in one session. The
 * person judges the rest (form, tempo, a second drill), named in `unchecked`.
 */
export interface StepCriteria {
  /** Completed sets that must each reach the target. */
  sets: number;
  /** Reps in each of those sets; `top-of-range` is the top of that session's written range. */
  reps?: number | 'top-of-range';
  /** Seconds in each of those sets. */
  seconds?: number;
  /** Band help on each of those sets, in pounds, at most. Help left blank does not count. */
  maxAssistance?: number;
  /** Reps added up over the session's completed sets, for counts such as "5 kick-ups". */
  totalReps?: number;
}

export interface TrackStep {
  exerciseId: string;
  /** The first chapter this step may be taken up in. */
  earliestChapter: number;
  /** "Passed when", word for word from the catalog. */
  passedWhen: string;
  /**
   * What the sets can show. Absent when nothing in the saved sets can show it (a freestanding
   * hold logged as attempts): the app then never reads the step as passed.
   */
  criteria?: StepCriteria;
  /** The part of "Passed when" the app cannot see in the sets; the person judges it. */
  unchecked?: string;
}

export interface SkillTrack {
  id: TrackId;
  title: string;
  /** Where the track lives, as the program names it. */
  slot: string;
  /** The first chapter whose Forge holds this slot. */
  firstChapter: number;
  /** The planche stretch item: skippable and never shown as missed. */
  optional?: boolean;
  steps: readonly TrackStep[];
}

/**
 * The default for every step, from the catalog: a completed session, a day that is not Yellow,
 * no pain note on the exercise, and the final set's effort at 7 or less.
 */
export const STEP_FINAL_EFFORT_CEILING = 7;

export const SKILL_TRACKS: readonly SkillTrack[] = [
  {
    id: 'pull',
    title: 'Pull to muscle-up',
    slot: 'Forge A vertical pull',
    firstChapter: 2,
    steps: [
      {
        exerciseId: 'assisted-pull-up',
        earliestChapter: 1,
        passedWhen: '3 sets at the top of the chapter’s rep range with 20 lb of band help or less.',
        criteria: { sets: 3, reps: 'top-of-range', maxAssistance: 20 },
      },
      {
        exerciseId: 'band-light-pull-up',
        earliestChapter: 2,
        passedWhen:
          '3 × 5 pull-ups with 10 lb of band help or less, and 3 slow negatives of at least 5 seconds each.',
        criteria: { sets: 3, reps: 5, maxAssistance: 10 },
        unchecked: '3 slow negatives of at least 5 seconds each',
      },
      {
        exerciseId: 'pull-up',
        earliestChapter: 3,
        passedWhen: '3 × 5 strict pull-ups with no band.',
        criteria: { sets: 3, reps: 5 },
      },
      {
        exerciseId: 'chest-to-bar-pull-up',
        earliestChapter: 5,
        passedWhen:
          '8 strict pull-ups in one set, and 3 × 3 pull-ups with the chest touching the bar.',
        criteria: { sets: 3, reps: 3 },
        unchecked: '8 strict pull-ups in one set',
      },
      {
        exerciseId: 'straight-bar-dip',
        earliestChapter: 6,
        passedWhen: '3 × 6 straight-bar dips and 3 × 5 transition drills with light foot help.',
        criteria: { sets: 3, reps: 6 },
        unchecked: '3 × 5 transition drills with light foot help',
      },
      {
        exerciseId: 'band-assisted-muscle-up',
        earliestChapter: 7,
        passedWhen: '3 × 2 clean band-assisted muscle-ups with both arms turning over together.',
        criteria: { sets: 3, reps: 2 },
        unchecked: 'both arms turning over together',
      },
      {
        exerciseId: 'muscle-up',
        earliestChapter: 8,
        passedWhen: '3 × 1 strict muscle-ups.',
        criteria: { sets: 3, reps: 1 },
      },
    ],
  },
  {
    id: 'push',
    title: 'Push to wall handstand push-up',
    slot: 'Forge B push-up',
    firstChapter: 2,
    steps: [
      {
        exerciseId: 'push-up',
        earliestChapter: 1,
        passedWhen: '3 × 12 clean push-ups.',
        criteria: { sets: 3, reps: 12 },
      },
      {
        exerciseId: 'pike-push-up',
        earliestChapter: 2,
        passedWhen: '3 × 10 pike push-ups with the head reaching about an inch from the floor.',
        criteria: { sets: 3, reps: 10 },
        unchecked: 'the head reaching about an inch from the floor',
      },
      {
        exerciseId: 'feet-elevated-pike-push-up',
        earliestChapter: 3,
        passedWhen: '3 × 8 feet-elevated pike push-ups.',
        criteria: { sets: 3, reps: 8 },
      },
      {
        exerciseId: 'wall-handstand-push-up-negative',
        earliestChapter: 5,
        passedWhen: '3 × 3 controlled negatives of at least 3 seconds each.',
        criteria: { sets: 3, reps: 3 },
        unchecked: 'at least 3 seconds each',
      },
      {
        exerciseId: 'wall-handstand-push-up',
        earliestChapter: 7,
        passedWhen: '3 × 3 full wall handstand push-ups.',
        criteria: { sets: 3, reps: 3 },
      },
    ],
  },
  {
    id: 'handstand',
    title: 'Handstand balance',
    slot: 'Forge A slot 10',
    firstChapter: 5,
    steps: [
      {
        exerciseId: 'wall-plank-hold',
        earliestChapter: 5,
        passedWhen: '3 × 30 sec with the feet at hip height or higher.',
        criteria: { sets: 3, seconds: 30 },
        unchecked: 'the feet at hip height or higher',
      },
      {
        exerciseId: 'wall-walk',
        earliestChapter: 5,
        passedWhen: '3 walks to the hands about a hand’s length from the wall, down under control.',
        criteria: { sets: 3, reps: 1 },
        unchecked: 'the hands about a hand’s length from the wall, down under control',
      },
      {
        exerciseId: 'chest-to-wall-handstand-hold',
        earliestChapter: 6,
        passedWhen: '3 × 30 sec.',
        criteria: { sets: 3, seconds: 30 },
      },
      {
        exerciseId: 'kick-up-to-wall',
        earliestChapter: 6,
        passedWhen:
          '5 controlled kick-ups each followed by a 15-second hold, plus the bail practised on both sides.',
        criteria: { sets: 1, totalReps: 5 },
        unchecked: 'a 15-second hold after each, and the bail practised on both sides',
      },
      {
        exerciseId: 'freestanding-handstand-attempts',
        earliestChapter: 7,
        passedWhen: 'a 10-second freestanding hold. The track stays open past this step.',
        unchecked: 'a 10-second freestanding hold',
      },
    ],
  },
  {
    id: 'planche',
    title: 'Planche',
    slot: 'Forge B stretch item',
    firstChapter: 5,
    optional: true,
    steps: [
      {
        exerciseId: 'planche-lean',
        earliestChapter: 5,
        passedWhen: '2 × 20 sec with the shoulders clearly ahead of the hands.',
        criteria: { sets: 2, seconds: 20 },
        unchecked: 'the shoulders clearly ahead of the hands',
      },
      {
        exerciseId: 'frog-stand',
        earliestChapter: 5,
        passedWhen: '2 × 20 sec.',
        criteria: { sets: 2, seconds: 20 },
      },
      {
        exerciseId: 'pseudo-planche-push-up',
        earliestChapter: 6,
        passedWhen: '2 × 8.',
        criteria: { sets: 2, reps: 8 },
      },
      {
        exerciseId: 'tuck-planche-hold',
        earliestChapter: 7,
        passedWhen: '2 × 10 sec.',
        criteria: { sets: 2, seconds: 10 },
      },
      {
        exerciseId: 'advanced-tuck-planche-hold',
        earliestChapter: 8,
        passedWhen: '2 × 10 sec.',
        criteria: { sets: 2, seconds: 10 },
      },
      {
        exerciseId: 'tuck-planche-push-up',
        earliestChapter: 9,
        passedWhen: '2 × 3.',
        criteria: { sets: 2, reps: 3 },
      },
      {
        exerciseId: 'straddle-planche',
        earliestChapter: 9,
        passedWhen: '2 × 5 sec.',
        criteria: { sets: 2, seconds: 5 },
      },
      {
        exerciseId: 'planche-push-up',
        earliestChapter: 9,
        passedWhen: '2 × 1.',
        criteria: { sets: 2, reps: 1 },
      },
    ],
  },
];

export function skillTrack(id: string): SkillTrack | undefined {
  return SKILL_TRACKS.find((track) => track.id === id);
}

/** The track and step index an exercise belongs to, if it is a track step. */
export function trackStepOf(exerciseId: string): { track: SkillTrack; index: number } | undefined {
  for (const track of SKILL_TRACKS) {
    const index = track.steps.findIndex((step) => step.exerciseId === exerciseId);
    if (index >= 0) return { track, index };
  }
  return undefined;
}

/** Steps whose criteria count band help, so the set records it in pounds as for an assisted pull-up. */
export function recordsBandHelp(exerciseId: string): boolean {
  const found = trackStepOf(exerciseId);
  return found?.track.steps[found.index].criteria?.maxAssistance !== undefined;
}
