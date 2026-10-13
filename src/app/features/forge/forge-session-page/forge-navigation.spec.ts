import { describe, expect, it } from 'vitest';
import { displayOrder, finishedPosition, nextAfterMark, openSetFor } from './forge-navigation';

const done = { completed: true };
const skipped = { completed: false };
const open = {};

function draft(...exercises: Array<Array<{ completed?: boolean }>>) {
  return {
    exerciseResults: exercises.map((sets) => ({ exerciseId: 'x', sets, painEvents: [] })),
  };
}

describe('openSetFor', () => {
  it('opens the first unmarked set, not the last one touched', () => {
    expect(openSetFor(draft([done, open, open]), 0)).toEqual({ exercise: 0, set: 1 });
    expect(openSetFor(draft([open, done, open]), 0)).toEqual({ exercise: 0, set: 0 });
  });

  it('opens the last set when every set is marked', () => {
    expect(openSetFor(draft([done, skipped, done]), 0)).toEqual({ exercise: 0, set: 2 });
  });
});

describe('nextAfterMark', () => {
  it('stays on the exercise while it has unmarked sets', () => {
    const state = draft([done, open, open], [open]);
    expect(nextAfterMark(state, { exercise: 0, set: 0 })).toEqual({ exercise: 0, set: 1 });
  });

  it('stays where the person is when they worked out of order', () => {
    const state = draft([done, open], [done, open, open]);
    expect(nextAfterMark(state, { exercise: 1, set: 0 })).toEqual({ exercise: 1, set: 1 });
  });

  it('picks up an earlier skipped-over set on the same exercise last', () => {
    const state = draft([open, done, done]);
    expect(nextAfterMark(state, { exercise: 0, set: 2 })).toEqual({ exercise: 0, set: 0 });
  });

  it('moves to the next exercise below when this one is finished', () => {
    const state = draft([open, open], [done, done], [open]);
    expect(nextAfterMark(state, { exercise: 1, set: 1 })).toEqual({ exercise: 2, set: 0 });
  });

  it('wraps to the top when nothing below is open', () => {
    const state = draft([done, open], [done, open], [done, done]);
    expect(nextAfterMark(state, { exercise: 2, set: 1 })).toEqual({ exercise: 0, set: 1 });
  });

  it('follows a chosen order', () => {
    const state = draft([done], [open], [open]);
    expect(nextAfterMark(state, { exercise: 0, set: 0 }, [2, 0, 1])).toEqual({
      exercise: 1,
      set: 0,
    });
    expect(
      nextAfterMark(draft([done], [open], [open]), { exercise: 0, set: 0 }, [0, 2, 1]),
    ).toEqual({
      exercise: 2,
      set: 0,
    });
  });

  it('finishes when every set is marked', () => {
    const state = draft([done, done], [skipped]);
    expect(nextAfterMark(state, { exercise: 1, set: 0 })).toEqual(finishedPosition(state));
    expect(finishedPosition(state)).toEqual({ exercise: 2, set: 0 });
  });
});

describe('displayOrder', () => {
  it('is the written order unless one is chosen', () => {
    expect(displayOrder(draft([open], [open], [open]))).toEqual([0, 1, 2]);
    expect(displayOrder(draft([open], [open]), [1, 0])).toEqual([1, 0]);
  });

  it('uses the order stored on the draft', () => {
    const state = { ...draft([open], [open], [open]), exerciseOrder: [2, 0, 1] };
    expect(displayOrder(state)).toEqual([2, 0, 1]);
  });

  it('moves on in the stored order after a mark, wrapping to the top of it', () => {
    const state = { ...draft([done], [open], [open]), exerciseOrder: [2, 0, 1] };
    expect(nextAfterMark(state, { exercise: 0, set: 0 })).toEqual({ exercise: 1, set: 0 });
    const wrap = { ...draft([open], [done], [done]), exerciseOrder: [1, 2, 0] };
    expect(nextAfterMark(wrap, { exercise: 2, set: 0 })).toEqual({ exercise: 0, set: 0 });
  });
});
