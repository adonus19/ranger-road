// @ts-ignore The test runner has Node's built-in fs module; app code does not use it.
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTER_ONE_EXERCISE_GUIDE_SOURCE } from './chapter-one-exercise-guides';
import { chapterTwoExerciseGuides } from './chapter-two-exercise-guides';
import { chapterTwoForgeA, chapterTwoForgeB, chapterTwoRestoration } from './chapter-two-workouts';
import { getExerciseGuide, getQuickHelpSteps, listExerciseGuides } from './exercise-guides';

const catalog = readFileSync(CHAPTER_ONE_EXERCISE_GUIDE_SOURCE, 'utf8');
const labels: Record<string, string> = {
  purpose: 'Purpose',
  movementPattern: 'Movement pattern',
  targets: 'Targets',
  how: 'How',
  feel: 'Feel',
  avoid: 'Avoid',
  painAwareOptions: 'Pain-aware options',
  stepUpFrom: 'Step-up from',
};

const chapterTwoIds = [chapterTwoForgeA, chapterTwoForgeB, chapterTwoRestoration].flatMap(
  (workout) => [
    ...workout.exercises.map((item) => item.exerciseId),
    ...[...(workout.warmup ?? []), ...(workout.finish ?? []), ...(workout.optionalFinish ?? [])]
      .filter((step) => step.kind === 'exercise')
      .map((step) => step.prescription.exerciseId),
  ],
);

describe('Exercise guides across chapters', () => {
  it('has a guide and 3–5 Quick Help steps for every Chapter II exercise', () => {
    for (const id of new Set(chapterTwoIds)) {
      expect(getExerciseGuide(id), id).toBeDefined();
      const steps = getQuickHelpSteps(id) ?? [];
      expect(steps.length, id).toBeGreaterThanOrEqual(3);
      expect(steps.length, id).toBeLessThanOrEqual(5);
    }
  });

  it('keeps Chapter II guide text verbatim from the catalog', () => {
    for (const guide of chapterTwoExerciseGuides) {
      const start = catalog.indexOf(`## ${guide.name}\n`);
      expect(start, guide.name).toBeGreaterThanOrEqual(0);
      const end = catalog.indexOf('\n## ', start + 3);
      const section = catalog.slice(start, end < 0 ? undefined : end);
      for (const [key, value] of Object.entries(guide)) {
        if (key === 'id' || key === 'name') continue;
        // The app sets apostrophes curly; the catalog keeps them straight.
        const text = String(value).replace(/’/g, "'");
        expect(section, `${guide.name}.${key}`).toContain(`**${labels[key]}:** ${text}`);
      }
    }
  });

  it('lists every guide once', () => {
    const ids = listExerciseGuides().map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(25);
  });

  it('ships a movement sequence and neck-down map for every Chapter II exercise', () => {
    for (const guide of chapterTwoExerciseGuides) {
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
