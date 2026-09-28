import { describe, expect, it } from 'vitest';
import type { Campaign } from '../domain/models';
import { hasCompletedChapterOneTrial, isChapterOneComplete } from './chapter-one-completion';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

describe('isChapterOneComplete', () => {
  it('keeps all four dated weeks after an early completed trial', () => {
    expect(isChapterOneComplete(campaign, '2026-10-31', [{ trialId: 'gate-trial' }])).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-01', [{ trialId: 'gate-trial' }])).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-02', [{ trialId: 'gate-trial' }])).toBe(true);
  });

  it('keeps the Week 4 template pending after the fourth week without a completed result', () => {
    expect(isChapterOneComplete(campaign, '2026-11-02', [])).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-02', [{ trialId: 'another-trial' }])).toBe(
      false,
    );
  });

  it('uses the end of four full weeks after a midweek start', () => {
    const midweek = { ...campaign, startDate: '2026-10-06' };
    expect(isChapterOneComplete(midweek, '2026-11-08', [{ trialId: 'gate-trial' }])).toBe(false);
    expect(isChapterOneComplete(midweek, '2026-11-09', [{ trialId: 'gate-trial' }])).toBe(true);
  });

  it('does not mark an absent or different campaign complete', () => {
    expect(isChapterOneComplete(null, '2026-11-02', [{ trialId: 'gate-trial' }])).toBe(false);
    expect(
      isChapterOneComplete({ ...campaign, currentChapterId: 'chapter-2' }, '2026-11-02', [
        { trialId: 'gate-trial' },
      ]),
    ).toBe(false);
  });
});

describe('hasCompletedChapterOneTrial', () => {
  it('sees a saved Gate Trial before the four weeks end, and nothing else', () => {
    expect(hasCompletedChapterOneTrial(campaign, [{ trialId: 'gate-trial' }])).toBe(true);
    expect(hasCompletedChapterOneTrial(campaign, [])).toBe(false);
    expect(hasCompletedChapterOneTrial(campaign, [{ trialId: 'another-trial' }])).toBe(false);
    expect(hasCompletedChapterOneTrial(null, [{ trialId: 'gate-trial' }])).toBe(false);
  });
});
