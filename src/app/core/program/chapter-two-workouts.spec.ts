import { describe, expect, it } from 'vitest';
import { chapterTwoProgram } from './chapter-two.program';
import {
  chapterTwoForgeA,
  chapterTwoForgeB,
  chapterTwoRestoration,
  chapterTwoWeekEightVolumeGuide,
  chapterTwoWorkoutWeekNote,
} from './chapter-two-workouts';
import { chapterOneForgeA, chapterOneForgeB } from './chapter-one-workouts';
import { loadWorkout } from './program-catalog';

const line = (exercise: (typeof chapterTwoForgeA.exercises)[number]) =>
  [
    exercise.exerciseId,
    exercise.sets,
    exercise.reps ?? exercise.durationSeconds,
    exercise.perSide ? 'per side' : '',
  ]
    .filter((part) => part !== '')
    .join(' ');

describe('Chapter II workout content', () => {
  it('keeps the documented Forge A and B prescriptions', () => {
    expect(chapterTwoForgeA.exercises.map(line)).toEqual([
      'box-squat 3 6',
      'bench-press 3 6',
      'assisted-pull-up 3 6–8',
      'split-squat 3 6 per side',
      'seated-two-db-overhead-press 3 8',
      'suitcase-carry 2 40 per side',
      'two-hand-overhead-carry 2 20–30',
      'side-plank 2 30 per side',
      'hammer-curl 2 10',
      'calf-raise 2 12',
    ]);
    expect(chapterTwoForgeB.exercises.map(line)).toEqual([
      'goblet-squat 3 8–10',
      'step-up 3 8 per side',
      'one-arm-db-row 3 8–10 per side',
      'push-up 3 8–12',
      'one-arm-db-overhead-press 3 8 per side',
      'farmer-carry 2 45–60',
      'two-hand-overhead-carry 2 20–30',
      'pallof-press 2 8 per side',
      'db-biceps-curl 2 10–12',
      'glute-bridge 3 12',
      'chin-up 2 5–8',
    ]);
  });

  it('steps up from Chapter I without reusing its exercise IDs', () => {
    const chapterOne = new Set(
      [...chapterOneForgeA.exercises, ...chapterOneForgeB.exercises].map((e) => e.exerciseId),
    );
    expect(chapterOne.has('split-squat')).toBe(false);
    expect(chapterOne.has('supported-split-squat')).toBe(true);
    expect(chapterTwoForgeA.exercises.map((e) => e.exerciseId)).not.toContain(
      'supported-split-squat',
    );
    expect(chapterTwoForgeB.exercises.map((e) => e.exerciseId)).not.toContain(
      'goblet-squat-to-box',
    );
    expect(chapterTwoRestoration.exercises.map((e) => e.exerciseId)).toContain(
      'supported-deep-squat',
    );
    expect(chapterTwoRestoration.exercises.map((e) => e.exerciseId)).not.toContain(
      'supported-squat-hold',
    );
  });

  it('keeps the documented Restoration II routine', () => {
    expect(chapterTwoRestoration.exercises.map(line)).toEqual([
      'cat-camel 1 6',
      'bird-dog 1 5 per side',
      'half-kneeling-hip-flexor-stretch 1 30–45 per side',
      'neutral-spine-hamstring-stretch 1 30 per side',
      'supported-deep-squat 2 20–30',
      'ankle-rock 1 10 per side',
      'wall-slide 1 8',
      'open-book-rotation 1 6 per side',
    ]);
  });

  it('adds only the band pull-apart to Chapter I’s warm-up and keeps its finishes', () => {
    const bandPullApart = {
      kind: 'exercise',
      prescription: { exerciseId: 'band-pull-apart', sets: 1, reps: 12 },
    };
    expect(chapterTwoForgeA.warmup).toEqual([...chapterOneForgeA.warmup!, bandPullApart]);
    expect(chapterTwoForgeB.warmup).toEqual([...chapterOneForgeB.warmup!, bandPullApart]);
    expect(chapterTwoForgeA.optionalFinish).toEqual([{ kind: 'walk', minutes: 5, pace: 'easy' }]);
    expect(chapterTwoRestoration.finish).toEqual([{ kind: 'walk', minutes: 1, pace: 'easy' }]);
  });

  it('counts all 28 of Forge B’s sets for the Week 8 guide', () => {
    expect(chapterTwoWeekEightVolumeGuide(chapterTwoForgeB.id, 8)).toEqual({
      week: 8,
      plannedSets: 28,
      aroundCompletedSets: 21,
      aroundSkippedSets: 7,
    });
    expect(chapterTwoWeekEightVolumeGuide(chapterTwoForgeB.id, 7)).toBeUndefined();
    expect(chapterTwoWeekEightVolumeGuide(chapterTwoForgeA.id, 8)).toBeUndefined();
  });

  it('plans Week 8 as a guide and never as a save limit', () => {
    expect(chapterTwoWorkoutWeekNote(chapterTwoForgeA.id, 8)).toBe(
      'Do not chase progression: the written sets and reps, with no load increases.',
    );
    expect(chapterTwoWorkoutWeekNote(chapterTwoForgeB.id, 8)).toBe(
      'Reduce volume about 25%: aim for around 21 of 28 work sets. Mark around 7 sets skipped. Choose which sets fit today; do not chase progression.',
    );
    expect(chapterTwoWorkoutWeekNote(chapterTwoForgeB.id, 7)).toBeUndefined();
    const plan = (id: string, week: number) => chapterTwoProgram.workoutPlan(id, week);
    expect(plan(chapterTwoForgeA.id, 8)).toMatchObject({ reduced: false });
    expect(plan(chapterTwoForgeB.id, 8)).toMatchObject({ reduced: true });
    expect(plan(chapterTwoForgeB.id, 8).volumeGuide?.week).toBe(8);
    expect(plan(chapterTwoForgeB.id, 6)).toEqual({ reduced: false });
    expect(plan(chapterTwoRestoration.id, 8)).toEqual({ reduced: false });
  });

  it('loads detached Chapter II definitions for historical snapshots', () => {
    const first = loadWorkout(chapterTwoForgeA.id);
    expect(first).toEqual(chapterTwoForgeA);
    first!.exercises[0].reps = 100;
    expect(loadWorkout(chapterTwoForgeA.id)?.exercises[0].reps).toBe(6);
  });

});
