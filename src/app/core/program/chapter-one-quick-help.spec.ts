import { describe, expect, it } from 'vitest';
import { listChapterOneExerciseGuides } from './chapter-one-exercise-guides';
import { getChapterOneQuickHelpSteps } from './chapter-one-quick-help';

describe('Chapter I Quick Help', () => {
  it('has three to five source-backed steps for every named Chapter I exercise', () => {
    for (const guide of listChapterOneExerciseGuides()) {
      const steps = getChapterOneQuickHelpSteps(guide.id);
      expect(steps, guide.name).toBeDefined();
      expect(steps!.length, guide.name).toBeGreaterThanOrEqual(3);
      expect(steps!.length, guide.name).toBeLessThanOrEqual(5);
      expect(
        steps!.every((step) => step.trim().length > 10),
        guide.name,
      ).toBe(true);
    }
  });

  it('returns detached steps and no unknown guide', () => {
    const first = getChapterOneQuickHelpSteps('box-squat')!;
    first[0] = 'Changed';
    expect(getChapterOneQuickHelpSteps('box-squat')![0]).toContain('stable box');
    expect(getChapterOneQuickHelpSteps('unknown')).toBeUndefined();
  });
});
