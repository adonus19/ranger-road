import { describe, expect, it } from 'vitest';
import {
  addDays,
  getCampaignDay,
  getChapterOneLeadInDays,
  getChapterOneSchedule,
  getChapterOneTargetDay,
  getDaysUntilGateTrial,
  getGateTrialPlannedDay,
  getGateTrialTargetDate,
  getTodaysOrders,
  isLocalDate,
  reconcileChapterOneCampaign,
} from './campaign';
import { chapterOneSeed } from './chapter-one.seed';

describe('Chapter I seed', () => {
  it('keeps the trial and weekly rhythm anchored to the documented Chapter I', () => {
    expect(chapterOneSeed.chapter.name).toBe('The Muster');
    expect(chapterOneSeed.chapter.trialId).toBe(chapterOneSeed.trial.id);
    expect(chapterOneSeed.trial.phases.map((phase) => phase.title)).toEqual([
      '2-mile brisk walk',
      '3-round controlled circuit',
      'Mind reflection',
      'Psalm 121 + prayer',
      "Write personal Ranger's Oath",
    ]);
    expect(chapterOneSeed.weeklyRhythm).toHaveLength(7);
    expect(chapterOneSeed.weeklyRhythm[2].title).toBe('Restoration or skill');
  });
});

describe('campaign calendar', () => {
  it('counts civil days across a daylight saving change', () => {
    expect(getCampaignDay('2026-03-07', '2026-03-09')).toBe(3);
  });

  it('counts down to the Week 4 Saturday trial order without a negative count', () => {
    expect(getGateTrialTargetDate('2026-09-07')).toBe('2026-10-03');
    expect(getGateTrialPlannedDay('2026-09-07')).toBe(27);
    expect(getChapterOneTargetDay('2026-09-07')).toBe(28);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-09-07')).toBe(26);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-03')).toBe(0);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-04')).toBe(0);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-05', '2026-10-10')).toBe(5);
  });

  it('uses a short lead-in before four full weeks for a midweek or Sunday start', () => {
    expect(getChapterOneLeadInDays('2026-09-07')).toBe(0);
    expect(getChapterOneLeadInDays('2026-09-10')).toBe(4);
    expect(getChapterOneLeadInDays('2026-09-13')).toBe(1);
    expect(getChapterOneTargetDay('2026-09-10')).toBe(32);
    expect(getGateTrialTargetDate('2026-09-10')).toBe('2026-10-10');
    expect(getChapterOneSchedule('2026-09-10', '2026-09-10')).toMatchObject({
      campaignDay: 1,
      week: 0,
      contentWeek: 1,
      weekday: 4,
    });
    expect(getChapterOneSchedule('2026-09-10', '2026-09-13')).toMatchObject({
      campaignDay: 4,
      week: 0,
      contentWeek: 1,
      weekday: 7,
    });
    expect(getChapterOneSchedule('2026-09-10', '2026-09-14')).toMatchObject({
      campaignDay: 5,
      week: 1,
      contentWeek: 1,
      weekday: 1,
    });
    expect(getChapterOneSchedule('2026-09-10', '2026-09-21')).toMatchObject({
      campaignDay: 12,
      week: 2,
      contentWeek: 2,
      weekday: 1,
    });
    expect(getChapterOneSchedule('2026-09-10', '2026-10-12')).toMatchObject({
      campaignDay: 33,
      week: 4,
      contentWeek: 4,
      afterTarget: true,
    });
  });

  it('calculates the planning date over a leap day', () => {
    expect(getGateTrialTargetDate('2024-02-02')).toBe('2024-03-02');
  });

  it('upgrades only an older generated target and preserves a separately chosen target', () => {
    const saved = {
      id: 'primary',
      startDate: '2026-09-10',
      currentChapterId: 'chapter-1',
      status: 'active',
      trialTargetDate: '2026-10-07',
    };
    const upgraded = reconcileChapterOneCampaign(saved);
    expect(upgraded).toMatchObject({ scheduleVersion: 3, trialTargetDate: '2026-10-10' });
    expect(saved.trialTargetDate).toBe('2026-10-07');
    expect(reconcileChapterOneCampaign(upgraded)).toBe(upgraded);
    // Schedule 2 generated the Sunday that closes Week 4; it moves to that week's Saturday.
    expect(
      reconcileChapterOneCampaign({ ...saved, scheduleVersion: 2, trialTargetDate: '2026-10-11' }),
    ).toMatchObject({ scheduleVersion: 3, trialTargetDate: '2026-10-10' });
    expect(reconcileChapterOneCampaign({ ...saved, trialTargetDate: '2026-10-20' })).toMatchObject({
      trialTargetDate: '2026-10-20',
    });
    const future = { ...saved, scheduleVersion: 4 };
    expect(reconcileChapterOneCampaign(future)).toBe(future);
  });

  it('keeps dates before the campaign outside Chapter I and rejects invalid dates', () => {
    expect(getCampaignDay('2026-09-07', '2026-09-06')).toBe(0);
    expect(getTodaysOrders('2026-09-07', '2026-09-06')).toEqual([]);
    expect(() => getCampaignDay('2026-02-30', '2026-03-01')).toThrow(RangeError);
  });

  it('steps civil dates across months and leap days, and recognizes real dates', () => {
    expect(addDays('2026-09-26', -1)).toBe('2026-09-25');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(isLocalDate('2026-09-26')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('')).toBe(false);
  });
});

describe("Today's Orders", () => {
  it('uses the dated Chapter I order and Scripture reference', () => {
    const orders = getTodaysOrders('2026-09-07', '2026-09-09', 'green');
    expect(orders.map((order) => order.title)).toEqual([
      'Morning Watch',
      'Restoration',
      'Evening Watch',
    ]);
    expect(orders[0].guidance).toBe('James 1:19–25');
  });

  it('reduces a yellow training day and replaces strength on a red day', () => {
    const yellow = getTodaysOrders('2026-09-07', '2026-09-07', 'yellow');
    const red = getTodaysOrders('2026-09-07', '2026-09-07', 'red');
    expect(yellow[1].title).toBe('Forge A');
    expect(yellow[1].guidance).toContain('do not increase load');
    expect(red[1].title).toBe('Restoration or easy movement, if appropriate');
    expect(red[1].guidance).toContain('No strength mission');
  });

  it('keeps nonexertional skill practice available on a red Wednesday', () => {
    const orders = getTodaysOrders('2026-09-07', '2026-09-23', 'red');
    expect(orders[1].title).toBe('Restoration or skill practice');
    expect(orders[1].guidance).toContain('No strength or conditioning');
    expect(orders[1].guidance).toContain('knot practice');
    expect(orders[1].guidance).toContain('only if appropriate');
  });

  it('prompts a readiness check before an unassessed Road day', () => {
    expect(getTodaysOrders('2026-09-07', '2026-09-08')[1].guidance).toBe(
      'Check readiness before training.',
    );
  });

  it('keeps documented weekly orders available when the trial target passes', () => {
    expect(getTodaysOrders('2026-09-07', '2026-10-05', 'green')[1].title).toBe(
      'Forge A at reduced effort',
    );
  });

  it('repeats Week 1 content during the lead-in without reaching Week 2 early', () => {
    expect(getTodaysOrders('2026-09-10', '2026-09-10', 'green')[1].title).toBe('Forge B');
    expect(getTodaysOrders('2026-09-10', '2026-09-17', 'green')[1].title).toBe('Forge B');
    expect(getTodaysOrders('2026-09-10', '2026-09-21', 'green')[0].guidance).toBe(
      'Matthew 5:33–37',
    );
    expect(getTodaysOrders('2026-09-10', '2026-10-10', 'green')[1].title).toBe('Gate Trial');
  });

  it('defers the planned Gate Trial on Yellow or Red', () => {
    expect(getTodaysOrders('2026-09-07', '2026-10-03', 'green')[1].title).toBe('Gate Trial');
    expect(getTodaysOrders('2026-09-07', '2026-10-03', 'yellow')[1].title).toBe(
      'Gate Trial waits for Green',
    );
    expect(getTodaysOrders('2026-09-07', '2026-10-03', 'red')[1].guidance).toContain(
      'No strength or trial',
    );
  });
});
