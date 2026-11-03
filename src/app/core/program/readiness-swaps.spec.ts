import { describe, expect, it } from 'vitest';
import { shoulderSwapFor, swappedPrescription } from './readiness-swaps';

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
