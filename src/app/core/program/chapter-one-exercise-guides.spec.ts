// @ts-ignore The test runner has Node's built-in fs module; app code does not use it.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gateTrialDefinition } from './chapter-one-trial.seed';
import { chapterOneForgeA, chapterOneForgeB, chapterOneRestoration } from './chapter-one-workouts';
import {
  CHAPTER_ONE_EXERCISE_GUIDE_SOURCE,
  getChapterOneExerciseGuide,
  listChapterOneExerciseGuides,
  type ExerciseGuideContent,
} from './chapter-one-exercise-guides';

const catalog = readFileSync(CHAPTER_ONE_EXERCISE_GUIDE_SOURCE, 'utf8');

const fieldLabels: Record<Exclude<keyof ExerciseGuideContent, 'id' | 'name'>, string[]> = {
  purpose: ['Purpose'],
  movementPattern: ['Movement pattern'],
  targets: ['Targets'],
  how: ['How'],
  feel: ['Feel'],
  avoid: ['Avoid'],
  painAwareOptions: ['Pain-aware options', 'Pain-aware option'],
  progression: ['Progression'],
  safety: ['Safety'],
  rule: ['Rule'],
  stopOrSubstitute: ['Stop/substitute'],
  stepUpFrom: ['Step-up from'],
};

describe('Chapter I exercise guides', () => {
  it('resolves every exercise in Forge A, Forge B, restoration, and the Gate Trial', () => {
    const workouts = [chapterOneForgeA, chapterOneForgeB, chapterOneRestoration];
    const workoutIds = workouts.flatMap((workout) => [
      ...workout.exercises.map((prescription) => prescription.exerciseId),
      ...[...(workout.warmup ?? []), ...(workout.finish ?? []), ...(workout.optionalFinish ?? [])]
        .filter((step) => step.kind === 'exercise')
        .map((step) => step.prescription.exerciseId),
    ]);
    const trialIds = gateTrialDefinition.phases.flatMap(
      (phase) => phase.circuit?.movements.map((movement) => movement.exerciseId) ?? [],
    );
    const usedIds = [...new Set([...workoutIds, ...trialIds])].sort();

    expect(usedIds).toHaveLength(18);
    expect(usedIds.filter((id) => !getChapterOneExerciseGuide(id))).toEqual([]);
    expect(
      listChapterOneExerciseGuides()
        .map((guide) => guide.id)
        .sort(),
    ).toEqual(usedIds);
  });

  it('keeps every written guide field verbatim in its catalog section', () => {
    for (const guide of listChapterOneExerciseGuides()) {
      const heading = `## ${guide.name}\n`;
      const start = catalog.indexOf(heading);
      expect(start, `${guide.name} heading is missing`).toBeGreaterThanOrEqual(0);
      const next = catalog.indexOf('\n---\n', start);
      const section = catalog.slice(start, next < 0 ? undefined : next);

      for (const [key, value] of Object.entries(guide)) {
        if (key === 'id' || key === 'name') continue;
        const labels = fieldLabels[key as keyof typeof fieldLabels];
        expect(labels, `${guide.name}.${key} is not mapped to a catalog field`).toBeDefined();
        expect(
          labels.some((label) => section.includes(`**${label}:** ${value}`)),
          `${guide.name}.${key} differs from the catalog`,
        ).toBe(true);
      }
    }
  });

  it('returns copies so callers cannot change the source guide', () => {
    const guide = getChapterOneExerciseGuide('box-squat');
    expect(guide).toBeDefined();
    guide!.how = 'changed';
    expect(getChapterOneExerciseGuide('box-squat')?.how).toContain('stable box/bench');
  });

  it('ships an optimized movement sequence and neck-down map for every guide', () => {
    for (const guide of listChapterOneExerciseGuides()) {
      for (const name of ['sequence.webp', 'muscle-map.webp']) {
        const path = `public/images/exercises/${guide.id}/${name}`;
        const data = readFileSync(path);
        expect(data.toString('ascii', 0, 4), path).toBe('RIFF');
        expect(data.toString('ascii', 8, 12), path).toBe('WEBP');
        expect(statSync(path).size, path).toBeGreaterThan(5_000);
      }
    }
  });
});
