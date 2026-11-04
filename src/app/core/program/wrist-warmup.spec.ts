import { describe, expect, it } from 'vitest';
import type { WorkoutDefinition } from '../domain/models';
import { chapterTwoForgeA } from './chapter-two-workouts';
import {
  WRIST_WARMUP_SECONDS,
  hasWristLoadedWork,
  nextWristWarmup,
  withWristWarmup,
} from './wrist-warmup';

const handstandDay: WorkoutDefinition = {
  id: 'chapter-5-forge-a',
  title: 'Forge A',
  contentVersion: 1,
  warmup: [{ kind: 'walk', minutes: 2, pace: 'easy' }],
  exercises: [
    { exerciseId: 'barbell-overhead-press', sets: 3, reps: 5 },
    { exerciseId: 'chest-to-wall-handstand-hold', sets: 3, durationSeconds: '15–30' },
  ],
};

const past = (id: string, date: string, wrist?: string) => ({
  id,
  date,
  completedAt: `${date}T08:00:00.000Z`,
  definitionSnapshot: {
    id: 'x',
    title: 'x',
    contentVersion: 1,
    exercises: [],
    ...(wrist
      ? {
          warmup: [{ kind: 'exercise' as const, prescription: { exerciseId: wrist, sets: 1 } }],
        }
      : {}),
  },
});

describe('Wrist warm-up', () => {
  it('belongs to handstand and planche work, and to nothing else', () => {
    expect(hasWristLoadedWork(['chest-to-wall-handstand-hold'])).toBe(true);
    expect(hasWristLoadedWork(['wall-handstand-push-up'])).toBe(true);
    expect(hasWristLoadedWork(['tuck-planche-hold', 'box-squat'])).toBe(true);
    expect(hasWristLoadedWork(['pike-push-up', 'push-up', 'barbell-overhead-press'])).toBe(false);
  });

  it('adds about a minute of wrist work to the end of the warm-up on a handstand day', () => {
    const out = withWristWarmup(handstandDay, []);
    expect(out.warmup).toHaveLength(2);
    expect(out.warmup?.[1]).toEqual({
      kind: 'exercise',
      prescription: { exerciseId: 'wrist-circles', sets: 1, durationSeconds: WRIST_WARMUP_SECONDS },
    });
    // The written definition is not changed.
    expect(handstandDay.warmup).toHaveLength(1);
  });

  it('starts a warm-up when the definition has none', () => {
    const out = withWristWarmup({ ...handstandDay, warmup: undefined }, []);
    expect(out.warmup).toHaveLength(1);
  });

  it('leaves other days alone', () => {
    expect(withWristWarmup(chapterTwoForgeA, [])).toEqual(chapterTwoForgeA);
  });

  it('alternates from the newest session that had one', () => {
    expect(nextWristWarmup([])).toBe('wrist-circles');
    expect(nextWristWarmup([past('a', '2026-12-01', 'wrist-circles')])).toBe('wrist-rocks');
    expect(
      nextWristWarmup([
        past('a', '2026-12-01', 'wrist-circles'),
        past('b', '2026-12-04', 'wrist-rocks'),
        past('c', '2026-12-05'),
      ]),
    ).toBe('wrist-circles');
  });

  it('is never added twice', () => {
    const once = withWristWarmup(handstandDay, []);
    expect(withWristWarmup(once, []).warmup).toHaveLength(2);
  });
});
