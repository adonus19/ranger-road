import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReadinessCheck, WorkoutDefinition } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';
import { chapterOneRestoration } from '../program/chapter-one-workouts';
import { WorkoutHistory } from './workout-history';

const definition: WorkoutDefinition = {
  id: 'chapter-1-forge-a',
  title: 'Forge A',
  contentVersion: 1,
  warmup: [{ kind: 'walk', minutes: 2, pace: 'easy' }],
  exercises: [{ exerciseId: 'box-squat', sets: 3, reps: 6 }],
  optionalFinish: [{ kind: 'walk', minutes: 5, pace: 'easy' }],
};

const green: ReadinessCheck = {
  id: 'green',
  date: '2026-09-28',
  checkedAt: '2026-09-28T12:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 3,
  backPain: 0,
  shoulderPain: 0,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
  status: 'green',
};

describe('WorkoutHistory', () => {
  let databaseName: string;
  let originalOpen: typeof RoadDatabase.open;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    databaseName = `workout-history-${crypto.randomUUID()}`;
    originalOpen = RoadDatabase.open.bind(RoadDatabase);
    openSpy = vi.spyOn(RoadDatabase, 'open').mockImplementation(() => originalOpen(databaseName));
    const database = await originalOpen(databaseName);
    await database.putCampaign({
      id: 'primary',
      startDate: green.date,
      currentChapterId: 'chapter-1',
      status: 'active',
    });
    database.close();
  });

  afterEach(() => openSpy.mockRestore());

  it('resumes saved set position after reopen and appends immutable history with immediate pain', async () => {
    const database = await originalOpen(databaseName);
    await database.addReadinessCheck(green);
    database.close();

    const history = new WorkoutHistory();
    const draft = await history.start({ date: green.date, definition });
    await expect(history.start({ date: green.date, definition })).rejects.toThrow('active workout');
    const edited = structuredClone(draft);
    edited.warmupComplete = true;
    edited.currentSetIndex = 1;
    edited.restStartedAt = '2026-09-28T13:00:00.000Z';
    edited.exerciseResults[0].sets[0] = { reps: 6, load: 45, rpe: 6, completed: true };
    edited.exerciseResults[0].sets[1] = { completed: false };
    edited.exerciseResults[0].sets[2] = { completed: false };
    await history.saveDraft(edited);

    const resumed = await new WorkoutHistory().active();
    expect(resumed?.currentSetIndex).toBe(1);
    expect(resumed?.restStartedAt).toBe(edited.restStartedAt);
    expect(resumed?.exerciseResults[0].sets[0].load).toBe(45);

    const pain = await history.recordPain(draft.id, {
      bodyArea: 'Knee',
      severity: 3,
      exerciseId: 'box-squat',
      actionTaken: 'Raised box',
    });
    expect(pain.workoutSessionId).toBe(draft.id);
    const withPain = await new WorkoutHistory().active();
    expect(withPain?.exerciseResults[0].painEvents).toEqual([pain]);
    expect(withPain?.reduced).toBe(true);
    const databaseAfterPain = await originalOpen(databaseName);
    expect(await databaseAfterPain.getAllHistorical('painEvents')).toEqual([pain]);
    databaseAfterPain.close();

    // A stale form save may contain no painEvents, but cannot erase the saved event.
    const savedAfterPain = await history.saveDraft(edited);
    expect(savedAfterPain.exerciseResults[0].painEvents).toEqual([pain]);
    const completed = await history.complete(draft.id);
    expect(completed.definitionSnapshot?.title).toBe('Forge A');
    expect(completed.exerciseResults[0].painEvents).toEqual([pain]);
    expect(completed.outcome).toBe('completed');
    expect(await history.active()).toBeUndefined();
    expect(await history.forDate(green.date)).toEqual([completed]);
    await expect(history.complete(draft.id)).rejects.toThrow('not found');
  });

  it('uses the latest same-day readiness at start, blocks new Red work, and preserves a stopped session', async () => {
    const database = await originalOpen(databaseName);
    await database.addReadinessCheck(green);
    await database.addReadinessCheck({
      ...green,
      id: 'yellow-later',
      checkedAt: '2026-09-28T12:30:00.000Z',
      poorSleep: true,
      status: 'yellow',
    });
    database.close();

    const history = new WorkoutHistory();
    const draft = await history.start({ date: green.date, definition });
    expect(draft.readinessId).toBe('yellow-later');
    expect(draft.reduced).toBe(true);
    const edited = structuredClone(draft);
    edited.exerciseResults[0].sets[0] = { reps: 4, load: 35, completed: true };
    await history.saveDraft(edited);
    const later = await originalOpen(databaseName);
    await later.addReadinessCheck({
      ...green,
      id: 'red-later',
      checkedAt: '2026-09-28T13:00:00.000Z',
      energy: 1,
      status: 'red',
    });
    later.close();

    await expect(history.saveDraft(edited)).rejects.toThrow('Red readiness');
    await expect(history.complete(draft.id)).rejects.toThrow('Red readiness');
    const pain = await history.recordPain(draft.id, {
      bodyArea: 'Back',
      severity: 5,
      exerciseId: 'box-squat',
      actionTaken: 'Stopped',
    });
    const stopped = await history.stop(draft.id);
    expect(stopped.outcome).toBe('stopped');
    expect(stopped.exerciseResults[0].sets[0].load).toBe(35);
    expect(stopped.exerciseResults[0].painEvents).toEqual([pain]);
    expect(await history.active()).toBeUndefined();
  });

  it('requires a newer non-Red check to be reviewed before completion', async () => {
    const database = await originalOpen(databaseName);
    await database.addReadinessCheck(green);
    database.close();
    const history = new WorkoutHistory();
    const draft = await history.start({ date: green.date, definition });
    const later = await originalOpen(databaseName);
    await later.addReadinessCheck({
      ...green,
      id: 'yellow-later',
      checkedAt: '2026-09-28T13:00:00.000Z',
      poorSleep: true,
      status: 'yellow',
    });
    later.close();
    await expect(history.complete(draft.id)).rejects.toThrow('Readiness changed');
    const edited = structuredClone(draft);
    edited.exerciseResults[0].sets[0] = { reps: 6, completed: true };
    edited.exerciseResults[0].sets[1] = { completed: false };
    edited.exerciseResults[0].sets[2] = { completed: false };
    const reviewed = await history.saveDraft(edited);
    expect(reviewed.reduced).toBe(true);
    expect(reviewed.readinessId).toBe('yellow-later');
    expect((await history.complete(draft.id)).readinessId).toBe('yellow-later');
  });

  it('allows source-backed restoration on Red and records its required finish', async () => {
    const red: ReadinessCheck = { ...green, id: 'red', energy: 1, status: 'red' };
    const database = await originalOpen(databaseName);
    await database.addReadinessCheck(red);
    database.close();
    const history = new WorkoutHistory();
    await expect(history.start({ date: red.date, definition })).rejects.toThrow('Red readiness');
    const draft = await history.start({ date: red.date, definition: chapterOneRestoration });
    const edited = structuredClone(draft);
    for (const result of edited.exerciseResults) {
      result.sets = result.sets.map(() => ({ completed: true }));
    }
    edited.finishComplete = true;
    await history.saveDraft(edited);
    const completed = await history.complete(draft.id);
    expect(completed.outcome).toBe('completed');
    expect(completed.finishComplete).toBe(true);
    expect(completed.reduced).toBe(true);
  });
});
