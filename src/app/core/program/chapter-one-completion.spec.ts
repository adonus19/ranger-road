import { describe, expect, it } from 'vitest';
import type { Campaign } from '../domain/models';
import {
  getChapterOneTrialPass,
  getChapterTwoStartDate,
  hasPassedChapterOneTrial,
  isChapterOneComplete,
} from './chapter-one-completion';

// Day 1 is Monday, Oct 5: Week 4 ends Sunday, Nov 1, and the first attempt is Monday, Nov 2.
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

const passOn = (date: string) => [{ trialId: 'gate-trial', date }];

describe('Gate Trial pass and Chapter II start', () => {
  it('continues into Chapter II the day after a Monday pass', () => {
    expect(getChapterTwoStartDate(campaign, passOn('2026-11-02'))).toBe('2026-11-03');
    expect(isChapterOneComplete(campaign, '2026-11-02', passOn('2026-11-02'))).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-03', passOn('2026-11-02'))).toBe(true);
  });

  it('starts Chapter II the Monday after a Thursday pass', () => {
    expect(getChapterTwoStartDate(campaign, passOn('2026-11-05'))).toBe('2026-11-09');
    expect(isChapterOneComplete(campaign, '2026-11-08', passOn('2026-11-05'))).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-09', passOn('2026-11-05'))).toBe(true);
  });

  it('keeps Chapter I going until the trial is passed', () => {
    expect(isChapterOneComplete(campaign, '2026-12-01', [])).toBe(false);
    expect(
      isChapterOneComplete(campaign, '2026-12-01', [
        { trialId: 'another-trial', date: '2026-11-02' },
      ]),
    ).toBe(false);
    expect(hasPassedChapterOneTrial(campaign, [])).toBe(false);
  });

  it('counts the first pass when more than one result is saved', () => {
    const results = [...passOn('2026-11-12'), ...passOn('2026-11-05')];
    expect(getChapterOneTrialPass(campaign, results)?.date).toBe('2026-11-05');
    expect(getChapterTwoStartDate(campaign, results)).toBe('2026-11-09');
  });

  it('starts Chapter II on the first attempt day for an older pass saved inside the four weeks', () => {
    expect(getChapterTwoStartDate(campaign, passOn('2026-10-31'))).toBe('2026-11-02');
    expect(isChapterOneComplete(campaign, '2026-11-01', passOn('2026-10-31'))).toBe(false);
    expect(isChapterOneComplete(campaign, '2026-11-02', passOn('2026-10-31'))).toBe(true);
  });

  it('uses the Monday after four full weeks for a midweek start', () => {
    // A Tuesday Day 1 leads in through Sunday; Week 4 then ends Sunday, Nov 8.
    const midweek = { ...campaign, startDate: '2026-10-06' };
    expect(getChapterTwoStartDate(midweek, passOn('2026-11-09'))).toBe('2026-11-10');
  });

  it('does not treat an absent or different campaign as passed', () => {
    expect(isChapterOneComplete(null, '2026-11-03', passOn('2026-11-02'))).toBe(false);
    const later = { ...campaign, currentChapterId: 'chapter-2' };
    expect(hasPassedChapterOneTrial(later, passOn('2026-11-02'))).toBe(false);
    expect(isChapterOneComplete(later, '2026-11-03', passOn('2026-11-02'))).toBe(false);
  });
});
