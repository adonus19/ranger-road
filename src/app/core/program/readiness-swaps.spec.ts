import { describe, expect, it } from 'vitest';
import { shoulderSwapFor, swapsFor, swappedPrescription } from './readiness-swaps';

describe('Shoulder swaps', () => {
  it('offers nothing below shoulder pain 3', () => {
    expect(shoulderSwapFor('two-hand-overhead-carry', 2)).toBeNull();
    expect(shoulderSwapFor('barbell-overhead-press', 0)).toBeNull();
  });

  it('offers the front-hold carry for overhead carries at 3 or more', () => {
    for (const id of ['two-hand-overhead-carry', 'waiter-carry']) {
      expect(shoulderSwapFor(id, 3)?.toId).toBe('front-hold-carry');
    }
  });

  it('offers band pull-aparts for every overhead press at 3 or more', () => {
    for (const id of [
      'seated-two-db-overhead-press',
      'standing-two-db-overhead-press',
      'one-arm-db-overhead-press',
      'half-kneeling-one-arm-db-press',
      'barbell-overhead-press',
      'seated-barbell-overhead-press',
    ]) {
      expect(shoulderSwapFor(id, 5)?.toId).toBe('band-pull-apart');
    }
  });

  it('offers band pull-aparts for the muscle-up steps of the pull track at 3 or more', () => {
    for (const id of ['straight-bar-dip', 'band-assisted-muscle-up', 'muscle-up']) {
      expect(shoulderSwapFor(id, 3)?.toId).toBe('band-pull-apart');
      expect(shoulderSwapFor(id, 2)).toBeNull();
    }
    expect(shoulderSwapFor('pull-up', 6)).toBeNull();
    expect(
      swappedPrescription(
        { exerciseId: 'muscle-up', sets: 3, reps: 1, trackId: 'pull' },
        'band-pull-apart',
      ),
    ).toEqual({ exerciseId: 'band-pull-apart', sets: 3, reps: 12 });
  });

  it('leaves other exercises alone', () => {
    expect(shoulderSwapFor('farmer-carry', 8)).toBeNull();
  });

  it('keeps a carry’s sets and time, and gives a press band pull-apart reps without a load', () => {
    expect(
      swappedPrescription(
        { exerciseId: 'two-hand-overhead-carry', sets: 2, durationSeconds: '20–30' },
        'front-hold-carry',
      ),
    ).toEqual({ exerciseId: 'front-hold-carry', sets: 2, durationSeconds: '20–30' });
    expect(
      swappedPrescription(
        { exerciseId: 'barbell-overhead-press', sets: 3, reps: 5, loadStrategy: 'x' },
        'band-pull-apart',
      ),
    ).toEqual({ exerciseId: 'band-pull-apart', sets: 3, reps: 12 });
  });
});

describe('Neck and shoulder inversion swaps', () => {
  const calm = { shoulderPain: 1, neckPain: 1 };

  it('offers nothing below neck or shoulder pain 2', () => {
    for (const id of [
      'chest-to-wall-handstand-hold',
      'wall-handstand-push-up',
      'tuck-planche-hold',
    ]) {
      expect(swapsFor(id, calm)).toEqual([]);
    }
  });

  it('offers a pike hold or a push-up at neck pain 2, or at shoulder pain 2', () => {
    for (const pain of [
      { shoulderPain: 0, neckPain: 2 },
      { shoulderPain: 2, neckPain: 0 },
    ]) {
      for (const id of [
        'wall-plank-hold',
        'wall-walk',
        'chest-to-wall-handstand-hold',
        'wall-handstand-push-up-negative',
        'wall-handstand-push-up',
        'planche-lean',
        'tuck-planche-hold',
        'planche-push-up',
      ]) {
        expect(
          swapsFor(id, pain).map((swap) => swap.toId),
          id,
        ).toEqual(['pike-hold', 'push-up']);
      }
    }
  });

  it('leaves the pike push-up, the pull track and the presses to their own gates', () => {
    const neck = { shoulderPain: 0, neckPain: 6 };
    expect(swapsFor('pike-push-up', neck)).toEqual([]);
    expect(swapsFor('muscle-up', neck)).toEqual([]);
    expect(swapsFor('barbell-overhead-press', { shoulderPain: 2, neckPain: 0 })).toEqual([]);
    expect(
      swapsFor('barbell-overhead-press', { shoulderPain: 3, neckPain: 0 }).map((s) => s.toId),
    ).toEqual(['band-pull-apart']);
    expect(swapsFor('muscle-up', { shoulderPain: 3, neckPain: 0 }).map((s) => s.toId)).toEqual([
      'band-pull-apart',
    ]);
  });

  it('keeps a step’s sets and gives the pike hold or push-up its own dose', () => {
    const written = { exerciseId: 'wall-walk', sets: 3, reps: 2 };
    expect(swappedPrescription(written, 'pike-hold')).toEqual({
      exerciseId: 'pike-hold',
      sets: 3,
      durationSeconds: '20–30',
    });
    expect(swappedPrescription(written, 'push-up')).toEqual({
      exerciseId: 'push-up',
      sets: 3,
      reps: '8–12',
    });
  });
});
