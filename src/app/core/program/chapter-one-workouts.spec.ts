import { describe, expect, it } from 'vitest';
import {
  chapterOneForgeA,
  chapterOneForgeB,
  chapterOneRestoration,
  chapterOneWorkoutWeekNote,
  chapterOneWeekFourVolumeGuide,
  loadChapterOneWorkout,
} from './chapter-one-workouts';

describe('Chapter I workout content', () => {
  it('keeps the documented Forge A and B prescriptions distinct', () => {
    expect(chapterOneForgeA.warmup).toHaveLength(6);
    expect(chapterOneForgeA.exercises).toEqual([
      expect.objectContaining({ exerciseId: 'box-squat', sets: 3, reps: 6, rpeTarget: 6 }),
      expect.objectContaining({ exerciseId: 'bench-press', sets: 3, reps: 6 }),
      expect.objectContaining({ exerciseId: 'assisted-pull-up', sets: 3, reps: '5–8' }),
      expect.objectContaining({
        exerciseId: 'supported-split-squat',
        sets: 2,
        reps: 6,
        perSide: true,
      }),
      expect.objectContaining({
        exerciseId: 'suitcase-carry',
        sets: 3,
        durationSeconds: 30,
        perSide: true,
      }),
      expect.objectContaining({ exerciseId: 'bird-dog', sets: 2, reps: 6, perSide: true }),
      expect.objectContaining({
        exerciseId: 'side-plank',
        sets: 2,
        durationSeconds: '15–30',
        perSide: true,
      }),
    ]);
    expect(chapterOneForgeA.optionalFinish).toEqual([{ kind: 'walk', minutes: 5, pace: 'easy' }]);

    expect(chapterOneForgeB.warmup).toEqual(chapterOneForgeA.warmup);
    expect(chapterOneForgeB.exercises.map(({ exerciseId }) => exerciseId)).toEqual([
      'goblet-squat-to-box',
      'step-up',
      'one-arm-db-row',
      'push-up',
      'glute-bridge',
      'farmer-carry',
      'bird-dog',
    ]);
    expect(chapterOneForgeB.exercises[3]).toMatchObject({
      sets: 3,
      reps: '8–12',
      notes: 'Never to failure.',
    });
  });

  it('includes the documented restoration sequence and week 4 instructions', () => {
    expect(chapterOneRestoration.exercises.map(({ exerciseId }) => exerciseId)).toEqual([
      'cat-camel',
      'bird-dog',
      'glute-bridge',
      'half-kneeling-hip-flexor-stretch',
      'supported-squat-hold',
      'wall-slide',
      'open-book-rotation',
    ]);
    expect(chapterOneRestoration.finish).toEqual([{ kind: 'walk', minutes: 1, pace: 'easy' }]);
    expect(chapterOneWorkoutWeekNote(chapterOneForgeA.id, 2)).toContain('Week 1');
    expect(chapterOneWorkoutWeekNote(chapterOneForgeA.id, 4)).toContain('Reduced effort');
    expect(chapterOneWorkoutWeekNote(chapterOneForgeB.id, 4)).toContain('25%');
    expect(chapterOneWeekFourVolumeGuide(chapterOneForgeB.id, 4)).toEqual({
      plannedSets: 20,
      aroundCompletedSets: 15,
      aroundSkippedSets: 5,
    });
    expect(chapterOneWeekFourVolumeGuide(chapterOneForgeB.id, 3)).toBeUndefined();
  });

  it('returns a detached definition for historical snapshots', () => {
    const first = loadChapterOneWorkout(chapterOneForgeA.id);
    expect(first).toEqual(chapterOneForgeA);
    expect(first).not.toBe(chapterOneForgeA);
    first!.exercises[0].reps = 100;
    expect(loadChapterOneWorkout(chapterOneForgeA.id)?.exercises[0].reps).toBe(6);
    expect(loadChapterOneWorkout('unknown')).toBeUndefined();
  });
});
