// @ts-ignore The test runner has Node's built-in fs module; app code does not use it.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gateTrialDefinition } from './chapter-one-trial.seed';
import { chapterOneForgeA, chapterOneForgeB, chapterOneRestoration } from './chapter-one-workouts';
import { chapterTwoForgeA, chapterTwoForgeB, chapterTwoRestoration } from './chapter-two-workouts';
import {
  EXERCISE_GUIDE_SOURCE,
  getExerciseGuide,
  getQuickHelpSteps,
  listExerciseGuides,
  type ExerciseGuideContent,
} from './exercise-guides';

const catalog = readFileSync(EXERCISE_GUIDE_SOURCE, 'utf8');

const fieldLabels: Record<
  Exclude<keyof ExerciseGuideContent, 'id' | 'name' | 'textOnly'>,
  string[]
> = {
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
  harderVersions: ["Harder versions (Chapter V on, in Forge B's balance slot)"],
  equipment: ['Equipment'],
};

/** The app drops "(see Press stance in `X.md`)" pointers and sets apostrophes curly. */
function appText(text: string): string {
  return text.replace(/\s*\(see [^)]*\)/g, '').replace(/'/g, '’');
}

function catalogSection(name: string): string {
  const start = catalog.indexOf(`\n## ${name}\n`);
  expect(start, `${name} heading is missing`).toBeGreaterThanOrEqual(0);
  const ends = ['\n---\n', '\n## ', '\n# ']
    .map((marker) => catalog.indexOf(marker, start + 4))
    .filter((index) => index >= 0);
  return appText(catalog.slice(start, Math.min(...ends)));
}

function workoutIds(workouts: (typeof chapterOneForgeA)[]): string[] {
  return workouts.flatMap((workout) => [
    ...workout.exercises.map((item) => item.exerciseId),
    ...[...(workout.warmup ?? []), ...(workout.finish ?? []), ...(workout.optionalFinish ?? [])]
      .filter((step) => step.kind === 'exercise')
      .map((step) => step.prescription.exerciseId),
  ]);
}

describe('Exercise guides', () => {
  it('resolves every exercise in Chapters I and II and the Gate Trial', () => {
    const trialIds = gateTrialDefinition.phases.flatMap(
      (phase) => phase.circuit?.movements.map((movement) => movement.exerciseId) ?? [],
    );
    const used = new Set([
      ...workoutIds([chapterOneForgeA, chapterOneForgeB, chapterOneRestoration]),
      ...workoutIds([chapterTwoForgeA, chapterTwoForgeB, chapterTwoRestoration] as never),
      ...trialIds,
    ]);
    expect([...used].filter((id) => !getExerciseGuide(id))).toEqual([]);
  });

  it('keeps the earlier guide IDs, in order, at the front of the list', () => {
    expect(
      listExerciseGuides()
        .slice(0, 25)
        .map((guide) => guide.id),
    ).toEqual([
      'box-squat',
      'bench-press',
      'assisted-pull-up',
      'supported-split-squat',
      'suitcase-carry',
      'side-plank',
      'goblet-squat-to-box',
      'step-up',
      'one-arm-db-row',
      'push-up',
      'glute-bridge',
      'farmer-carry',
      'bird-dog',
      'cat-camel',
      'half-kneeling-hip-flexor-stretch',
      'supported-squat-hold',
      'wall-slide',
      'open-book-rotation',
      'split-squat',
      'goblet-squat',
      'calf-raise',
      'hammer-curl',
      'supported-deep-squat',
      'ankle-rock',
      'neutral-spine-hamstring-stretch',
    ]);
  });

  it('lists every guide once', () => {
    const ids = listExerciseGuides().map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(76);
  });

  it('has a guide for every exercise and track step in the Forge Expansion catalog', () => {
    const part = catalog.slice(catalog.indexOf('# Forge Expansion Exercises'));
    const names = [...part.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(names).toHaveLength(51 - 6);
    const guideNames = new Set(listExerciseGuides().map((guide) => guide.name));
    expect(names.filter((name) => !guideNames.has(name))).toEqual([]);
  });

  it('keeps every written guide field verbatim in its catalog section', () => {
    for (const guide of listExerciseGuides()) {
      const section = catalogSection(guide.name);
      for (const [key, value] of Object.entries(guide)) {
        if (key === 'id' || key === 'name' || key === 'textOnly') continue;
        const labels = fieldLabels[key as keyof typeof fieldLabels];
        expect(labels, `${guide.name}.${key} is not mapped to a catalog field`).toBeDefined();
        const text = String(value);
        expect(
          labels.some((label) => section.includes(`**${appText(label)}:** ${text}`)),
          `${guide.name}.${key} differs from the catalog`,
        ).toBe(true);
      }
    }
  });

  it('keeps no catalog file names or backticks in the written text', () => {
    for (const guide of listExerciseGuides()) {
      expect(JSON.stringify(guide), guide.name).not.toMatch(/`|\.md\b/);
    }
  });

  it('has three to five Quick Help steps for every guide', () => {
    for (const guide of listExerciseGuides()) {
      const steps = getQuickHelpSteps(guide.id);
      expect(steps, guide.name).toBeDefined();
      expect(steps!.length, guide.name).toBeGreaterThanOrEqual(3);
      expect(steps!.length, guide.name).toBeLessThanOrEqual(5);
      expect(
        steps!.every((step) => step.trim().length > 5),
        guide.name,
      ).toBe(true);
    }
  });

  it('returns copies so callers cannot change the source', () => {
    const guide = getExerciseGuide('box-squat')!;
    guide.how = 'changed';
    expect(getExerciseGuide('box-squat')?.how).toContain('stable box/bench');
    const steps = getQuickHelpSteps('box-squat')!;
    steps[0] = 'Changed';
    expect(getQuickHelpSteps('box-squat')![0]).toContain('stable box');
    expect(getExerciseGuide('unknown')).toBeUndefined();
    expect(getQuickHelpSteps('unknown')).toBeUndefined();
  });

  it('ships a movement sequence and neck-down map for every guide that has pictures', () => {
    const pictured = listExerciseGuides().filter((guide) => !guide.textOnly);
    expect(pictured.length).toBeGreaterThanOrEqual(25);
    for (const guide of pictured) {
      for (const name of ['sequence.webp', 'muscle-map.webp']) {
        const path = `public/images/exercises/${guide.id}/${name}`;
        const data = readFileSync(path);
        expect(data.toString('ascii', 0, 4), path).toBe('RIFF');
        expect(data.toString('ascii', 8, 12), path).toBe('WEBP');
        expect(statSync(path).size, path).toBeGreaterThan(5_000);
      }
    }
  });

  it('marks as text only exactly the guides with no pictures shipped', () => {
    for (const guide of listExerciseGuides()) {
      let shipped = true;
      try {
        statSync(`public/images/exercises/${guide.id}/sequence.webp`);
      } catch {
        shipped = false;
      }
      expect(!!guide.textOnly, guide.name).toBe(!shipped);
    }
  });
});
