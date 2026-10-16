import { describe, expect, it } from 'vitest';
import type { LocalDate, WorkoutSession } from '../domain/models';
import { campaignDayResolver } from '../state/progression-history';
import { resolveCampaignPosition, type TrialRecord } from './campaign-position';
import { getActivityChoices } from './chapter-orders';
import { chapterOneForgeC, chapterOneForgeCForWeek } from './chapter-one-workouts';
import { isThreeForgeWeek, type MakeupHistory } from './makeup-schedule';
import { getOptionalForge, isOptionalForge } from './optional-forge';
import { loadWorkoutOn } from './program-catalog';
import { exerciseProgress } from './progression';

// Chapter I with a Monday Day 1: Week 1 is Oct 5–11, Week 2 Oct 12–18, Week 4 (deload) Oct 26 –
// Nov 1, and the Gate Trial opens Monday, Nov 2, then each Monday and Thursday until a pass.
const start = '2026-10-05';
const resolverFor =
  (trials: readonly TrialRecord[] = []) =>
  (date: LocalDate) => {
    const position = resolveCampaignPosition(start, date, trials);
    return position && !position.awaitingNextChapter ? position.chapter : null;
  };
const resolve = resolverFor();
const mainId = (date: LocalDate) => getActivityChoices(resolve(date)!)[0].id;
const FORGE_C = 'chapter-1-forge-c';

/** Records name the date done and the source date whose order it was. */
function history(
  records: [LocalDate, LocalDate][] = [],
  sessions: [LocalDate, string, ('completed' | 'stopped')?][] = [],
): MakeupHistory {
  return {
    records: records.map(([date, source]) => ({ date, definitionId: mainId(source) })),
    sessions: sessions.map(([date, workoutDefinitionId, outcome]) => ({
      date,
      workoutDefinitionId,
      ...(outcome ? { outcome } : {}),
    })),
    redDates: new Set(),
  };
}

// Forge A and B each done on their own day, so no make-up moves anything.
const onTrack = (monday: LocalDate, thursday: LocalDate) => [
  [monday, monday] as [LocalDate, LocalDate],
  [thursday, thursday] as [LocalDate, LocalDate],
];
const weekOne = history(onTrack('2026-10-05', '2026-10-08'));

function offer(
  date: LocalDate,
  saved: MakeupHistory = weekOne,
  options: {
    today?: LocalDate;
    readiness?: 'green' | 'yellow' | 'red' | null;
    trials?: TrialRecord[];
  } = {},
) {
  return getOptionalForge(
    date,
    options.today ?? date,
    resolverFor(options.trials),
    saved,
    options.readiness ?? null,
  );
}

describe('Optional Forge eligibility', () => {
  it('offers Chapter I’s Forge C on Tuesday, Wednesday, Friday and Saturday', () => {
    for (const date of ['2026-10-06', '2026-10-07', '2026-10-09', '2026-10-10']) {
      expect(offer(date)).toEqual({ workoutId: FORGE_C, light: false });
    }
  });

  it('is never offered on a Forge day or Sunday', () => {
    for (const date of ['2026-10-05', '2026-10-08', '2026-10-11']) {
      expect(offer(date)).toBeNull();
    }
  });

  it('is not offered on a day that holds a moved Forge', () => {
    // Forge A missed Monday moves to Tuesday.
    expect(offer('2026-10-06', history())).toBeNull();
    // Forge B missed Thursday moves to Friday; Saturday is still open.
    const aOnly = history([['2026-10-05', '2026-10-05']]);
    expect(offer('2026-10-09', aOnly)).toBeNull();
    expect(offer('2026-10-10', aOnly, { today: '2026-10-09' })).toEqual({
      workoutId: FORGE_C,
      light: false,
    });
  });

  it('reads the make-up planner’s three-Forge week and is not offered in it', () => {
    // Forge B missed Thursday through Saturday of Week 1 opens a three-Forge Week 2.
    const missedB = history([['2026-10-05', '2026-10-05']]);
    const today = '2026-10-13';
    for (const date of ['2026-10-13', '2026-10-17']) {
      expect(isThreeForgeWeek(date, today, resolve, missedB)).toBe(true);
      expect(offer(date, missedB, { today })).toBeNull();
    }
    // The week after is a normal week again.
    const weekThree = history([
      ['2026-10-05', '2026-10-05'],
      ['2026-10-12', '2026-10-08'],
      ['2026-10-14', '2026-10-12'],
      ['2026-10-16', '2026-10-15'],
      ...onTrack('2026-10-19', '2026-10-22'),
    ]);
    expect(isThreeForgeWeek('2026-10-20', '2026-10-20', resolve, weekThree)).toBe(false);
    expect(offer('2026-10-20', weekThree)).not.toBeNull();
  });

  it('is gone for the week once Forge C is completed, and back next Monday', () => {
    const done = history(onTrack('2026-10-05', '2026-10-08'), [
      ['2026-10-07', FORGE_C, 'completed'],
    ]);
    expect(offer('2026-10-07', done)).toBeNull();
    expect(offer('2026-10-10', done)).toBeNull();
    const nextWeek = history(
      [...onTrack('2026-10-05', '2026-10-08'), ...onTrack('2026-10-12', '2026-10-15')],
      [['2026-10-07', FORGE_C, 'completed']],
    );
    expect(offer('2026-10-13', nextWeek)).not.toBeNull();
  });

  it('stays after a stopped session, and counts an older row without an outcome as done', () => {
    const stopped = history(onTrack('2026-10-05', '2026-10-08'), [
      ['2026-10-06', FORGE_C, 'stopped'],
    ]);
    expect(offer('2026-10-07', stopped)).not.toBeNull();
    const older = history(onTrack('2026-10-05', '2026-10-08'), [['2026-10-06', FORGE_C]]);
    expect(offer('2026-10-07', older)).toBeNull();
  });

  it('says to keep it light in the deload week', () => {
    const weekFour = history(onTrack('2026-10-26', '2026-10-29'));
    expect(offer('2026-10-27', weekFour)).toEqual({ workoutId: FORGE_C, light: true });
  });

  it('works while the Gate Trial waits, but never on a Monday or Thursday attempt day', () => {
    const waiting = history(onTrack('2026-10-26', '2026-10-29'));
    expect(offer('2026-11-02', waiting)).toBeNull();
    expect(offer('2026-11-05', waiting)).toBeNull();
    for (const date of ['2026-11-03', '2026-11-04', '2026-11-06', '2026-11-07', '2026-11-10']) {
      expect(offer(date, waiting)).toEqual({ workoutId: FORGE_C, light: true });
    }
  });

  it('opens the custom Forge builder from Chapter II, gone for the week once one is done', () => {
    const trials = [{ trialId: 'gate-trial', date: '2026-11-02' }];
    const custom = { workoutId: 'custom-forge', light: false };
    expect(offer('2026-11-03', history(), { trials })).toEqual(custom);
    expect(isOptionalForge('custom-forge')).toBe(true);
    // A stopped custom session leaves the card; a completed one settles the week.
    const stopped = history([], [['2026-11-03', 'custom-forge', 'stopped']]);
    expect(offer('2026-11-04', stopped, { trials })).toEqual(custom);
    const done = history([], [['2026-11-03', 'custom-forge', 'completed']]);
    expect(offer('2026-11-04', done, { trials })).toBeNull();
  });

  it('is not offered on a Red day; Yellow and an unchecked day still show it', () => {
    expect(offer('2026-10-07', weekOne, { readiness: 'red' })).toBeNull();
    expect(offer('2026-10-07', weekOne, { readiness: 'yellow' })).not.toBeNull();
    expect(offer('2026-10-07', weekOne, { readiness: 'green' })).not.toBeNull();
  });

  it('knows Forge C is the optional Forge', () => {
    expect(isOptionalForge(FORGE_C)).toBe(true);
    expect(isOptionalForge('chapter-1-forge-a')).toBe(false);
  });
});

describe('Forge C', () => {
  const curl = (date: LocalDate) =>
    loadWorkoutOn(FORGE_C, resolve(date), date)?.exercises.at(-1)?.exerciseId;

  it('follows 01_THE_MUSTER.md, with the standard warm-up first', () => {
    expect(chapterOneForgeC.warmup?.length).toBeGreaterThan(0);
    expect(
      chapterOneForgeC.exercises.map(({ exerciseId, sets, reps, durationSeconds, perSide }) => [
        exerciseId,
        sets,
        reps ?? durationSeconds,
        !!perSide,
      ]),
    ).toEqual([
      ['seated-two-db-overhead-press', 2, 8, false],
      ['two-hand-overhead-carry', 2, '20–30', false],
      ['band-pull-apart', 2, 12, false],
      ['band-face-pull', 2, 12, false],
      ['chest-supported-db-reverse-fly', 2, 10, false],
      ['pallof-press', 2, 8, true],
      ['hammer-curl', 2, '10–12', false],
    ]);
  });

  it('rotates the curl week by week: hammer, DB, preacher', () => {
    expect(curl('2026-10-06')).toBe('hammer-curl');
    expect(curl('2026-10-13')).toBe('db-biceps-curl');
    expect(curl('2026-10-20')).toBe('preacher-curl');
    expect(curl('2026-10-27')).toBe('hammer-curl');
    // The rotation carries on while the Gate Trial waits.
    expect(curl('2026-11-03')).toBe('db-biceps-curl');
    expect(chapterOneForgeCForWeek(-1).exercises.at(-1)?.exerciseId).toBe('hammer-curl');
    // Only the curl changes.
    expect(chapterOneForgeCForWeek(1).exercises.slice(0, -1)).toEqual(
      chapterOneForgeC.exercises.slice(0, -1),
    );
  });

  it('notes Week 4 as light and saves it as reduced', () => {
    const program = resolve('2026-10-27')!.program;
    expect(program.workoutPlan(FORGE_C, 4)).toEqual({ note: 'Keep it light.', reduced: true });
    expect(program.workoutPlan(FORGE_C, 2)).toEqual({ reduced: false });
  });

  it('feeds progression hints like Forge A and B', () => {
    const press = chapterOneForgeC.exercises[0];
    const saved = {
      id: 'c1',
      date: '2026-10-07',
      workoutDefinitionId: FORGE_C,
      readinessId: 'green',
      completedAt: '2026-10-07T08:00:00.000Z',
      outcome: 'completed',
      definitionSnapshot: { ...chapterOneForgeC },
      exerciseResults: [
        {
          exerciseId: press.exerciseId,
          painEvents: [],
          sets: [
            { completed: true, reps: 8, load: 15 },
            { completed: true, reps: 8, load: 15, rpe: 6 },
          ],
        },
      ],
    } as unknown as WorkoutSession;
    const progress = exerciseProgress(
      press,
      { date: '2026-10-14', readiness: 'green' },
      {
        sessions: [saved],
        readinessById: new Map(),
        dayOf: campaignDayResolver(start, []),
      },
    );
    expect(progress.last?.date).toBe('2026-10-07');
    expect(progress.hint).toBeDefined();
  });
});
