import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/models';
import { createWorkoutDraft, completeWorkoutDraft, isCustomSession } from '../domain/workout';
import { chapterOneProgram } from './chapter-one.program';
import { chapterTwoForgeA, chapterTwoForgeB } from './chapter-two-workouts';
import { chapterTwoProgram } from './chapter-two.program';
import {
  CUSTOM_FORGE_ID,
  buildCustomForge,
  builderLibrary,
  doseLabel,
  lastCustomList,
  repeatNote,
  standardWarmup,
} from './custom-forge';
import { CUSTOM_FORGE_LIBRARY } from './custom-forge-library';
import { getExerciseGuide, listExerciseGuides } from './exercise-guides';

const nameOf = (id: string) => getExerciseGuide(id)?.name ?? id;

function entry(id: string) {
  return builderLibrary(chapterTwoProgram)
    .flatMap((section) => section.exercises)
    .find((exercise) => exercise.exerciseId === id);
}

const green = {
  id: 'readiness-1',
  date: '2026-11-10',
  checkedAt: '2026-11-10T11:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 4,
  backPain: 0,
  shoulderPain: 0,
  neckPain: 0,
  kneePain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
  status: 'green' as const,
};

function session(
  overrides: Partial<WorkoutSession> & Pick<WorkoutSession, 'id' | 'date'>,
): WorkoutSession {
  return {
    workoutDefinitionId: CUSTOM_FORGE_ID,
    readinessId: 'readiness-1',
    exerciseResults: [],
    outcome: 'completed',
    ...overrides,
  };
}

describe('Custom Forge library', () => {
  it('gives every exercise guide a builder group', () => {
    for (const guide of listExerciseGuides()) {
      expect(CUSTOM_FORGE_LIBRARY[guide.id], guide.id).toBeDefined();
    }
  });

  it('groups the library under the seven headings in order', () => {
    expect(builderLibrary(chapterTwoProgram).map((section) => section.title)).toEqual([
      'Lower body',
      'Push',
      'Pull',
      'Carry',
      'Core',
      'Arms',
      'Mobility',
    ]);
  });

  it('takes the dose from the current chapter’s Forge A or B first', () => {
    expect(entry('box-squat')).toMatchObject({
      dose: { sets: 3, reps: 6 },
      source: 'From Forge A',
    });
    expect(entry('goblet-squat')).toMatchObject({
      dose: { sets: 3, reps: '8–10' },
      source: 'From Forge B',
    });
    expect(entry('chin-up')?.source).toBe('From Forge B');
  });

  it('falls back to an earlier chapter, then to the catalog default', () => {
    // Supported split squat is written only in Chapter I's Forge A.
    expect(entry('supported-split-squat')).toMatchObject({
      dose: { sets: 2, reps: 6, perSide: true },
      source: 'From Chapter I Forge A',
    });
    expect(entry('band-face-pull')?.source).toBe('From Chapter I Forge C');
    expect(entry('preacher-curl')).toMatchObject({
      dose: { sets: 2, reps: '10–12', perSide: true },
      source: 'Catalog default',
    });
    expect(entry('pike-push-up')?.source).toBe('Catalog default');
    expect(entry('cat-camel')?.source).toBe('From Restoration');
  });

  it('lists every track step', () => {
    for (const id of [
      'pull-up',
      'muscle-up',
      'wall-handstand-push-up',
      'freestanding-handstand-attempts',
      'planche-push-up',
    ]) {
      expect(entry(id), id).toBeDefined();
    }
  });

  it('leaves out an exercise with no dose written yet, rather than inventing one', () => {
    expect(entry('single-leg-balance')).toBeUndefined();
    expect(entry('wrist-circles')).toBeUndefined();
  });

  it('formats a row’s dose', () => {
    expect(doseLabel(entry('suitcase-carry')!.dose)).toBe('2 × 40 sec per side');
    expect(doseLabel(entry('box-squat')!.dose, 2)).toBe('2 × 6');
  });
});

describe('Custom Forge definition', () => {
  it('snapshots the picks in tap order with their set counts and the standard warm-up', () => {
    const definition = buildCustomForge(chapterTwoProgram, [
      { exerciseId: 'pallof-press', sets: 3 },
      { exerciseId: 'box-squat', sets: 2 },
    ]);
    expect(definition).toMatchObject({
      id: CUSTOM_FORGE_ID,
      title: 'Custom Forge',
      exercises: [
        { exerciseId: 'pallof-press', sets: 3, reps: 8, perSide: true },
        { exerciseId: 'box-squat', sets: 2, reps: 6 },
      ],
    });
    expect(definition.warmup).toEqual(chapterTwoForgeA.warmup);
    expect(standardWarmup(chapterOneProgram)?.length).toBeGreaterThan(0);
  });

  it('refuses an empty list, an unknown exercise or an out-of-range set count', () => {
    expect(() => buildCustomForge(chapterTwoProgram, [])).toThrow();
    expect(() =>
      buildCustomForge(chapterTwoProgram, [{ exerciseId: 'deadlift', sets: 2 }]),
    ).toThrow();
    expect(() =>
      buildCustomForge(chapterTwoProgram, [{ exerciseId: 'box-squat', sets: 0 }]),
    ).toThrow();
  });

  it('saves as a custom session that keeps its own snapshot', () => {
    const definition = buildCustomForge(chapterTwoProgram, [{ exerciseId: 'box-squat', sets: 1 }]);
    const draft = createWorkoutDraft(
      { date: green.date, definition, kind: 'custom' },
      green,
      '2026-11-10T12:00:00.000Z',
      'workout-custom',
    );
    draft.exerciseResults[0].sets = [{ completed: true, reps: 6, load: 95 }];
    draft.warmupComplete = true;
    const saved = completeWorkoutDraft(draft, green, 'completed', '2026-11-10T12:30:00.000Z');
    expect(saved.kind).toBe('custom');
    expect(isCustomSession(saved)).toBe(true);
    expect(saved.definitionSnapshot).toEqual(definition);
  });

  it('refuses a custom kind on a written workout, and a custom ID without the kind', () => {
    expect(() =>
      createWorkoutDraft({ date: green.date, definition: chapterTwoForgeA, kind: 'custom' }, green),
    ).toThrow();
    const definition = buildCustomForge(chapterTwoProgram, [{ exerciseId: 'box-squat', sets: 1 }]);
    expect(() => createWorkoutDraft({ date: green.date, definition }, green)).toThrow();
  });
});

describe('Start from last time’s list', () => {
  it('reads the newest custom session in the order it was worked', () => {
    const older = session({
      id: 'a',
      date: '2026-11-04',
      definitionSnapshot: buildCustomForge(chapterTwoProgram, [
        { exerciseId: 'hammer-curl', sets: 2 },
      ]),
    });
    const newer = session({
      id: 'b',
      date: '2026-11-11',
      definitionSnapshot: buildCustomForge(chapterTwoProgram, [
        { exerciseId: 'box-squat', sets: 2 },
        { exerciseId: 'pallof-press', sets: 3 },
      ]),
      exerciseOrder: [1, 0],
    });
    const forge = session({
      id: 'c',
      date: '2026-11-12',
      workoutDefinitionId: chapterTwoForgeB.id,
      definitionSnapshot: chapterTwoForgeB,
    });
    expect(lastCustomList([older, newer, forge], chapterTwoProgram)).toEqual([
      { exerciseId: 'pallof-press', sets: 3 },
      { exerciseId: 'box-squat', sets: 2 },
    ]);
  });

  it('drops an exercise the builder no longer lists, and is empty without a custom session', () => {
    const saved = session({
      id: 'a',
      date: '2026-11-04',
      definitionSnapshot: {
        id: CUSTOM_FORGE_ID,
        title: 'Custom Forge',
        exercises: [
          { exerciseId: 'retired-exercise', sets: 2, reps: 5 },
          { exerciseId: 'box-squat', sets: 9, reps: 6 },
        ],
      },
    });
    expect(lastCustomList([saved], chapterTwoProgram)).toEqual([
      { exerciseId: 'box-squat', sets: 6 },
    ]);
    expect(lastCustomList([], chapterTwoProgram)).toEqual([]);
  });
});

describe('Repeat note', () => {
  const forgeA = session({
    id: 'forge-a',
    date: '2026-11-09',
    workoutDefinitionId: chapterTwoForgeA.id,
    definitionSnapshot: chapterTwoForgeA,
  });

  it('names the picks that were in yesterday’s Forge A', () => {
    expect(repeatNote([{ exerciseId: 'box-squat' }], [forgeA], '2026-11-10', nameOf)).toBe(
      'Box Squat was in yesterday’s Forge A.',
    );
    expect(
      repeatNote(
        [
          { exerciseId: 'box-squat' },
          { exerciseId: 'pallof-press' },
          { exerciseId: 'bench-press' },
        ],
        [forgeA],
        '2026-11-10',
        nameOf,
      ),
    ).toBe('Box Squat and Bench Press were in yesterday’s Forge A.');
  });

  it('names today’s Forge too, and says nothing for older days or other sessions', () => {
    const today = { ...forgeA, date: '2026-11-10' };
    expect(repeatNote([{ exerciseId: 'box-squat' }], [today], '2026-11-10', nameOf)).toBe(
      'Box Squat was in today’s Forge A.',
    );
    expect(repeatNote([{ exerciseId: 'box-squat' }], [forgeA], '2026-11-11', nameOf)).toBeNull();
    const custom = session({
      id: 'custom',
      date: '2026-11-09',
      definitionSnapshot: buildCustomForge(chapterTwoProgram, [
        { exerciseId: 'box-squat', sets: 2 },
      ]),
    });
    expect(repeatNote([{ exerciseId: 'box-squat' }], [custom], '2026-11-10', nameOf)).toBeNull();
    expect(repeatNote([{ exerciseId: 'hammer-curl' }], [], '2026-11-10', nameOf)).toBeNull();
  });

  it('ignores the warm-up, so a bodyweight box squat there is not a repeat', () => {
    const forgeB = session({
      id: 'forge-b',
      date: '2026-11-12',
      workoutDefinitionId: chapterTwoForgeB.id,
      definitionSnapshot: chapterTwoForgeB,
    });
    expect(repeatNote([{ exerciseId: 'box-squat' }], [forgeB], '2026-11-13', nameOf)).toBeNull();
  });
});
