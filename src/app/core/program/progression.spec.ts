import { describe, expect, it } from 'vitest';
import type {
  CompletedSet,
  ExercisePrescription,
  ReadinessCheck,
  WorkoutSession,
} from '../domain/models';
import { campaignDayResolver } from '../state/progression-history';
import { getExerciseGuide } from './exercise-guides';
import {
  chapterSummary,
  compareWithLastTime,
  exerciseProgress,
  exerciseRecord,
  parseRange,
  type ProgressionContext,
  type Today,
} from './progression';
import {
  changeLabel,
  compareLines,
  directionLabel,
  easierLine,
  hintCopy,
  lastTimeTitle,
  setLabel,
  sinceDayOneLine,
  summaryLines,
} from './progression-copy';
import { STEP_UP_FROM, progressionKind } from './progression-kinds';

// Day 1 is Monday, Oct 5. Week 3 begins Oct 19, the Week 4 deload Oct 26, and the Gate Trial
// passes on Monday, Nov 2, so Chapter II's Week 5 runs Nov 2–8 and Week 6 begins Nov 9.
const trials = [{ trialId: 'gate-trial', date: '2026-11-02' }];
const dayOf = campaignDayResolver('2026-10-05', trials);

function check(id: string, energy: number): ReadinessCheck {
  return {
    id,
    date: '2026-10-05',
    checkedAt: '2026-10-05T07:00:00.000Z',
    sleepHours: 7,
    poorSleep: false,
    energy,
    backPain: 0,
    shoulderPain: 0,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status: energy === 2 ? 'yellow' : 'green',
  } as ReadinessCheck;
}
const readinessById = new Map([
  ['green', check('green', 4)],
  ['yellow', check('yellow', 2)],
]);

interface Work {
  id: string;
  sets: CompletedSet[];
  prescription?: ExercisePrescription;
  pain?: boolean;
  substitution?: boolean;
}

let count = 0;
function session(
  date: string,
  work: Work[],
  options: { reduced?: boolean; readiness?: 'green' | 'yellow'; stopped?: boolean } = {},
): WorkoutSession {
  count += 1;
  return {
    id: `s${count}`,
    date,
    workoutDefinitionId: 'chapter-1-forge-a',
    readinessId: options.readiness ?? 'green',
    completedAt: `${date}T08:00:00.000Z`,
    outcome: options.stopped ? 'stopped' : 'completed',
    ...(options.reduced ? { reduced: true } : {}),
    definitionSnapshot: {
      id: 'chapter-1-forge-a',
      title: 'Forge A',
      contentVersion: 1,
      exercises: work.flatMap((item) => (item.prescription ? [item.prescription] : [])),
    },
    exerciseResults: work.map((item) => ({
      exerciseId: item.id,
      sets: item.sets,
      painEvents: item.pain
        ? [
            {
              timestamp: `${date}T08:00:00.000Z`,
              bodyArea: 'shoulder',
              severity: 3,
              actionTaken: 'Reduced',
            },
          ]
        : [],
      ...(item.substitution ? { substitutionId: 'other' } : {}),
    })),
  } as WorkoutSession;
}

const sets = (load: number | undefined, reps: number[], rpe?: number): CompletedSet[] =>
  reps.map((value, index) => ({
    completed: true,
    reps: value,
    ...(load !== undefined ? { load } : {}),
    ...(index === reps.length - 1 && rpe !== undefined ? { rpe } : {}),
  }));
const timed = (load: number | undefined, seconds: number[], rpe?: number): CompletedSet[] =>
  seconds.map((value, index) => ({
    completed: true,
    duration: value,
    ...(load !== undefined ? { load } : {}),
    ...(index === seconds.length - 1 && rpe !== undefined ? { rpe } : {}),
  }));

const bench: ExercisePrescription = { exerciseId: 'bench-press', sets: 3, reps: 6 };
const goblet: ExercisePrescription = { exerciseId: 'goblet-squat', sets: 3, reps: '8–10' };
const green: Today = { date: '2026-11-09', readiness: 'green' };

function context(...sessions: WorkoutSession[]): ProgressionContext {
  return { sessions, readinessById, dayOf };
}

function hint(prescription: ExercisePrescription, ctx: ProgressionContext, today = green) {
  const progress = exerciseProgress(prescription, today, ctx);
  return progress.hint ? hintCopy(progress.hint) : undefined;
}

describe('progression kinds', () => {
  it('gives bodyweight and Restoration exercises no hint and no Last time', () => {
    for (const id of ['push-up', 'glute-bridge', 'bird-dog', 'cat-camel', 'ankle-rock']) {
      expect(progressionKind(id), id).toBe('none');
    }
    const ctx = context(
      session('2026-11-02', [{ id: 'push-up', sets: sets(undefined, [10, 10]) }]),
    );
    expect(exerciseProgress({ exerciseId: 'push-up', sets: 3, reps: '8–12' }, green, ctx)).toEqual({
      exerciseId: 'push-up',
      kind: 'none',
      lastDoseChanged: false,
      noLoadRecorded: false,
    });
  });

  it('links each step-up to the easier exercise its guide names', () => {
    for (const [id, easier] of Object.entries(STEP_UP_FROM)) {
      expect(getExerciseGuide(id)?.stepUpFrom).toBe(`${getExerciseGuide(easier)?.name}.`);
    }
  });

  it('reads written ranges', () => {
    expect(parseRange('8–10')).toEqual({ low: 8, high: 10 });
    expect(parseRange(6)).toEqual({ low: 6, high: 6 });
    expect(parseRange('15-30')).toEqual({ low: 15, high: 30 });
    expect(parseRange(undefined)).toBeUndefined();
  });
});

describe('the progression hint', () => {
  const benchAt = (date: string, set: CompletedSet[], options = {}) =>
    session(date, [{ id: 'bench-press', sets: set, prescription: bench }], options);

  it('allows 5 lb when every set hit the target and the final effort was 7 or less', () => {
    const ctx = context(benchAt('2026-10-21', sets(95, [6, 6, 6], 6)));
    const progress = exerciseProgress(bench, green, ctx);
    expect(progress.last?.load).toBe(95);
    expect(progress.last?.sets.map(setLabel)).toEqual(['95 × 6', '95 × 6', '95 × 6']);
    expect(hintCopy(progress.hint!)).toEqual({
      action: 'May add 5 lb → 100 lb',
      reason: 'all sets at 6, final effort 6',
      rising: true,
    });
  });

  it('offers a lower box as the squat alternative', () => {
    const squat = { exerciseId: 'box-squat', sets: 3, reps: 6 };
    const ctx = context(
      session('2026-10-21', [
        { id: 'box-squat', sets: sets(95, [6, 6, 6], 7), prescription: squat },
      ]),
    );
    expect(hint(squat, ctx)?.action).toBe('May add 5 lb → 100 lb, or a lower box');
  });

  it('holds with one plain reason', () => {
    expect(hint(bench, context(benchAt('2026-10-21', sets(95, [6, 6, 6], 8))))).toEqual({
      action: 'Hold at 95 lb',
      reason: 'final effort 8 last time',
      rising: false,
    });
    expect(hint(bench, context(benchAt('2026-10-21', sets(95, [6, 6, 6]))))?.reason).toBe(
      'no final effort recorded',
    );
    expect(hint(bench, context(benchAt('2026-10-21', sets(95, [6, 5, 6], 6))))?.reason).toBe(
      'not every set reached 6 reps',
    );
    expect(hint(bench, context(benchAt('2026-10-21', sets(95, [6, 6], 6))))?.reason).toBe(
      'not every set reached 6 reps',
    );
  });

  it('holds on Yellow today, in a deload week, and after pain on this exercise', () => {
    const good = context(benchAt('2026-10-21', sets(95, [6, 6, 6], 6)));
    expect(hint(bench, good, { date: '2026-11-09', readiness: 'yellow' })?.reason).toBe(
      'Yellow today',
    );
    expect(hint(bench, good, { date: '2026-10-27', readiness: 'green' })?.reason).toBe(
      'deload week',
    );
    const pained = context(
      session('2026-10-21', [
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6), prescription: bench, pain: true },
      ]),
    );
    // Pain is named before today's readiness.
    expect(hint(bench, pained, { date: '2026-11-09', readiness: 'yellow' })?.reason).toBe(
      'pain noted last time',
    );
  });

  it('ignores pain noted on a different exercise', () => {
    const ctx = context(
      session('2026-10-21', [
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6), prescription: bench },
        { id: 'box-squat', sets: sets(95, [6, 6, 6], 6), pain: true },
      ]),
    );
    expect(hint(bench, ctx)?.rising).toBe(true);
  });

  it('judges the last full session after a planned deload, and says so', () => {
    const ctx = context(
      benchAt('2026-10-19', sets(95, [6, 6, 6], 6)),
      benchAt('2026-10-26', sets(95, [6, 6], 5), { reduced: true }),
    );
    const progress = exerciseProgress(bench, green, ctx);
    expect(progress.last?.date).toBe('2026-10-26');
    expect(hintCopy(progress.hint!)).toEqual({
      action: 'May add 5 lb → 100 lb',
      reason: 'all sets at 6, final effort 6',
      rising: true,
      context: 'Week 4 was a deload; based on Week 3',
    });
  });

  it('looks past a session reduced by skipped sets, but holds after a Yellow one', () => {
    const skipped = context(
      benchAt('2026-11-09', sets(95, [6, 6, 6], 6)),
      benchAt('2026-11-16', sets(95, [6, 6], 6), { reduced: true }),
    );
    expect(hint(bench, skipped, { date: '2026-11-18', readiness: 'green' })?.context).toBe(
      'Last time was reduced; based on Week 6',
    );
    const yellow = context(
      benchAt('2026-11-09', sets(95, [6, 6, 6], 6)),
      benchAt('2026-11-16', sets(95, [6, 6], 6), { reduced: true, readiness: 'yellow' }),
    );
    expect(hint(bench, yellow, { date: '2026-11-18', readiness: 'green' })?.reason).toBe(
      'last session was Yellow',
    );
  });

  it('holds when only deload sessions are on record', () => {
    const ctx = context(benchAt('2026-10-26', sets(95, [6, 6], 6), { reduced: true }));
    expect(hint(bench, ctx)?.reason).toBe('no full session on record yet');
  });

  it('skips stopped sessions and substitutions', () => {
    const ctx = context(
      benchAt('2026-10-19', sets(90, [6, 6, 6], 6)),
      benchAt('2026-10-21', sets(95, [6], 6), { stopped: true }),
      session('2026-10-22', [
        { id: 'bench-press', sets: sets(50, [6, 6, 6], 6), substitution: true },
      ]),
    );
    expect(exerciseProgress(bench, green, ctx).last?.load).toBe(90);
  });

  it('takes reps to the top of a range before adding weight', () => {
    const at = (reps: number[]) =>
      context(
        session('2026-11-05', [
          { id: 'goblet-squat', sets: sets(30, reps, 6), prescription: goblet },
        ]),
      );
    expect(hint(goblet, at([8, 9, 9]))?.action).toBe('May add a rep, up to 10');
    expect(hint(goblet, at([10, 10, 10]))?.action).toBe('May add 5 lb → 35 lb, back to 8 reps');
    expect(hint(goblet, at([8, 7, 8]))?.reason).toBe('not every set reached 10 reps');
  });

  it('adds weight to carries only at the written time', () => {
    const suitcase = { exerciseId: 'suitcase-carry', sets: 3, durationSeconds: 40, perSide: true };
    const farmer = { exerciseId: 'farmer-carry', sets: 3, durationSeconds: '30–45' };
    const carry = (prescription: ExercisePrescription, seconds: number[]) =>
      context(
        session('2026-11-05', [
          { id: prescription.exerciseId, sets: timed(25, seconds, 6), prescription },
        ]),
      );
    expect(hint(suitcase, carry(suitcase, [40, 40, 40]))?.action).toBe('May add 5 lb → 30 lb');
    expect(hint(farmer, carry(farmer, [40, 40, 40]))?.reason).toBe('not every set reached 45 s');
  });

  it('adds seconds to a hold up to the top of its range', () => {
    const plank = { exerciseId: 'side-plank', sets: 2, durationSeconds: '15–30', perSide: true };
    const at = (seconds: number[]) =>
      context(
        session('2026-10-19', [
          { id: 'side-plank', sets: timed(undefined, seconds, 5), prescription: plank },
        ]),
      );
    expect(hint(plank, at([20, 25]))?.action).toBe('May hold longer, up to 25 s');
    expect(hint(plank, at([30, 30]))?.reason).toBe('30 s is the written time');
    // Chapter II writes a fixed 30 seconds.
    expect(hint({ ...plank, durationSeconds: 30 }, at([20, 25]))?.reason).toBe(
      '30 s is the written time',
    );
    expect(exerciseProgress(plank, green, at([20, 25])).noLoadRecorded).toBe(false);
  });

  it('suggests less band help once every pull-up set reaches the top', () => {
    const pullUp = { exerciseId: 'assisted-pull-up', sets: 3, reps: '6–8' };
    const at = (reps: number[]) =>
      context(
        session('2026-11-09', [
          { id: 'assisted-pull-up', sets: sets(undefined, reps, 6), prescription: pullUp },
        ]),
      );
    expect(hint(pullUp, at([8, 8, 8]))?.action).toBe('May use less band help');
    expect(hint(pullUp, at([8, 7, 8]))?.action).toBe('Hold');
  });

  it('hints on reps alone when no weight was recorded, and says to add it', () => {
    const ctx = context(benchAt('2026-10-21', sets(undefined, [6, 6, 6], 6)));
    const progress = exerciseProgress(bench, green, ctx);
    expect(progress.noLoadRecorded).toBe(true);
    expect(progress.last?.sets.map(setLabel)).toEqual(['— × 6', '— × 6', '— × 6']);
    expect(hintCopy(progress.hint!).action).toBe('May add 5 lb');
  });

  it('shows a step-up’s easier version the first time, and never says add', () => {
    const supported = { exerciseId: 'supported-split-squat', sets: 2, reps: 6, perSide: true };
    const ctx = context(
      session('2026-10-19', [
        { id: 'supported-split-squat', sets: sets(20, [6, 6], 6), prescription: supported },
      ]),
    );
    const progress = exerciseProgress(
      { exerciseId: 'split-squat', sets: 3, reps: 6, perSide: true },
      green,
      ctx,
    );
    expect(progress.last).toBeUndefined();
    expect(progress.hint).toBeUndefined();
    expect(easierLine(progress.easier!)).toBe('Last on Supported Split Squat: 20 × 6');
  });

  it('names a changed dose so a lower count does not read as a drop', () => {
    const chapterOne = { exerciseId: 'goblet-squat', sets: 3, reps: 8 };
    const ctx = context(
      session('2026-10-19', [
        { id: 'goblet-squat', sets: sets(30, [8, 8, 8], 6), prescription: chapterOne },
      ]),
    );
    const progress = exerciseProgress(goblet, green, ctx);
    expect(progress.lastDoseChanged).toBe(true);
    expect(lastTimeTitle(progress)).toBe('Last time (Chapter I, 3 × 8)');
    expect(lastTimeTitle(exerciseProgress(chapterOne, green, ctx))).toBe('Last time');
  });
});

describe('after the session', () => {
  it('compares each tracked exercise with its last time in any chapter', () => {
    const before = session('2026-10-19', [
      { id: 'box-squat', sets: sets(95, [6, 6, 6], 6) },
      { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
      { id: 'suitcase-carry', sets: timed(25, [30, 30, 30], 6) },
      { id: 'bird-dog', sets: sets(undefined, [6, 6]) },
    ]);
    const now = session(
      '2026-11-09',
      [
        { id: 'box-squat', sets: sets(100, [6, 6, 6], 7) },
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
        { id: 'suitcase-carry', sets: timed(25, [40, 40], 6) },
        { id: 'split-squat', sets: sets(20, [6, 6, 6], 6) },
        { id: 'bird-dog', sets: sets(undefined, [6, 6]) },
      ],
      { reduced: true },
    );
    const changes = compareWithLastTime(now, [before, now]);
    expect(changes.map((item) => [item.exerciseId, item.direction, changeLabel(item)])).toEqual([
      ['box-squat', 'up', '95 → 100 lb'],
      ['bench-press', 'held', '6 → 6 reps'],
      ['suitcase-carry', 'up', '30 → 40 s'],
    ]);
    expect(directionLabel('lighter', true)).toBe('Lighter today (reduced)');
    expect(directionLabel('up', false)).toBeUndefined();
  });

  it('keeps the record newest first, tagged, across chapters', () => {
    const ctx = context(
      session('2026-10-05', [{ id: 'box-squat', sets: sets(75, [6, 6, 6], 6) }]),
      session('2026-10-26', [{ id: 'box-squat', sets: sets(90, [6, 6], 5) }], { reduced: true }),
      session('2026-11-09', [{ id: 'box-squat', sets: sets(100, [6, 6, 6], 7) }]),
    );
    const record = exerciseRecord('box-squat', ctx);
    expect(record.rows.map((row) => [row.date, row.chapter, row.tag])).toEqual([
      ['2026-11-09', 2, undefined],
      ['2026-10-26', 1, 'deload'],
      ['2026-10-05', 1, undefined],
    ]);
    expect(sinceDayOneLine(record.first!, record.latest!)).toBe('Since Day 1: 75 → 100 lb');
  });

  it('sums up a chapter from its first and last full sessions, leaving out the deload', () => {
    const ctx = context(
      session('2026-10-05', [
        { id: 'box-squat', sets: sets(75, [6, 6, 6], 6) },
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
        { id: 'suitcase-carry', sets: timed(20, [30, 30, 30], 6) },
      ]),
      session('2026-10-22', [
        { id: 'box-squat', sets: sets(90, [6, 6, 6], 6) },
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
        { id: 'suitcase-carry', sets: timed(25, [30, 30, 30], 6) },
      ]),
      session('2026-10-26', [{ id: 'box-squat', sets: sets(80, [6, 6], 5) }], { reduced: true }),
      session('2026-11-09', [{ id: 'box-squat', sets: sets(100, [6, 6, 6], 6) }]),
    );
    const summary = chapterSummary(1, ctx);
    expect(summary.lifts.map((item) => [item.exerciseId, changeLabel(item)])).toEqual([
      ['box-squat', '75 → 90 lb'],
    ]);
    expect(summary.carriesAndHolds.map((item) => changeLabel(item))).toEqual(['20 → 25 lb']);
    expect(summary.heldCount).toBe(1);
    expect(summaryLines(summary)).toEqual({
      lifts: [{ label: 'Box Squat', value: '75 → 90 lb' }],
      carriesAndHolds: [{ label: 'Suitcase Carry', value: '20 → 25 lb' }],
      held: '1 held steady',
    });
  });

  it('lists what went up, then what held, then anything lighter', () => {
    const carry = { exerciseId: 'suitcase-carry', sets: 3, durationSeconds: 40, perSide: true };
    const before = session('2026-10-19', [
      { id: 'box-squat', sets: sets(95, [6, 6, 6], 6) },
      { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
      { id: 'suitcase-carry', sets: timed(25, [30, 30, 30], 6) },
      { id: 'goblet-squat', sets: sets(30, [8, 8, 8], 6) },
    ]);
    const now = session(
      '2026-11-09',
      [
        { id: 'goblet-squat', sets: sets(25, [8, 8, 8], 6) },
        { id: 'box-squat', sets: sets(100, [6, 6, 6], 7) },
        { id: 'bench-press', sets: sets(95, [6, 6, 6], 6) },
        { id: 'suitcase-carry', sets: timed(25, [40, 40, 40], 6), prescription: carry },
      ],
      { reduced: true },
    );
    expect(compareLines(compareWithLastTime(now, [before, now]))).toEqual([
      { label: 'Box Squat', value: '95 → 100 lb' },
      { label: 'Suitcase Carry', value: '30 → 40 s per side' },
      { label: '1 held steady' },
      { label: 'Goblet Squat', value: '30 → 25 lb', note: 'Lighter today (reduced)' },
    ]);
    expect(compareLines([])).toEqual([]);
  });

  it('leaves untracked exercises out of the record', () => {
    const ctx = context(session('2026-10-05', [{ id: 'bird-dog', sets: sets(undefined, [6, 6]) }]));
    expect(exerciseRecord('bird-dog', ctx).rows).toEqual([]);
  });
});

describe('campaign days', () => {
  it('places dates in their chapter and week, with Weeks 4 and 8 as deloads', () => {
    expect(dayOf('2026-10-19')).toEqual({ chapter: 1, week: 3, deload: false });
    expect(dayOf('2026-10-26')).toEqual({ chapter: 1, week: 4, deload: true });
    expect(dayOf('2026-11-09')).toEqual({ chapter: 2, week: 6, deload: false });
    expect(dayOf('2026-11-23')).toEqual({ chapter: 2, week: 8, deload: true });
    expect(dayOf('2026-10-04')).toBeNull();
    expect(campaignDayResolver(undefined, trials)('2026-10-19')).toBeNull();
  });
});
