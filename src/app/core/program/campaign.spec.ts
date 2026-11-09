import { describe, expect, it } from 'vitest';
import {
  addDays,
  getCampaignDay,
  getChapterOneDay,
  getChapterOneLeadInDays,
  getChapterOneSchedule,
  getChapterOneTargetDay,
  getDaysUntilGateTrial,
  getGateTrialPlannedDay,
  getGateTrialTargetDate,
  getNextGateTrialAttempt,
  getTodaysOrders,
  isGateTrialOpen,
  isLocalDate,
  reconcileChapterOneCampaign,
} from './campaign';
import { withTrialDay } from './campaign-position';
import { getDayOrders } from './chapter-orders';
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

  it('counts down to the Monday after Week 4, then stays open every day', () => {
    expect(getChapterOneTargetDay('2026-09-07')).toBe(28);
    expect(getGateTrialPlannedDay('2026-09-07')).toBe(29);
    expect(getGateTrialTargetDate('2026-09-07')).toBe('2026-10-05');
    expect(getDaysUntilGateTrial('2026-09-07', '2026-09-07')).toBe(28);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-03')).toBe(2);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-05')).toBe(0);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-06')).toBe(0);
    expect(getDaysUntilGateTrial('2026-09-07', '2026-10-09')).toBe(0);
    expect(getNextGateTrialAttempt('2026-09-07', '2026-09-20')).toBe('2026-10-05');
    expect(getNextGateTrialAttempt('2026-09-07', '2026-10-10')).toBe('2026-10-10');
  });

  it('opens the Gate Trial on any day once Week 4 has ended', () => {
    // Week 4's own Monday and Thursday are strength days, not attempts.
    expect(isGateTrialOpen('2026-09-07', '2026-09-28')).toBe(false);
    expect(isGateTrialOpen('2026-09-07', '2026-10-04')).toBe(false);
    expect(isGateTrialOpen('2026-09-07', '2026-10-05')).toBe(true);
    expect(isGateTrialOpen('2026-09-07', '2026-10-06')).toBe(true);
    expect(isGateTrialOpen('2026-09-07', '2026-10-10')).toBe(true);
  });

  it('uses a short lead-in before four full weeks for a midweek or Sunday start', () => {
    expect(getChapterOneLeadInDays('2026-09-07')).toBe(0);
    expect(getChapterOneLeadInDays('2026-09-10')).toBe(4);
    expect(getChapterOneLeadInDays('2026-09-13')).toBe(1);
    expect(getChapterOneTargetDay('2026-09-10')).toBe(32);
    expect(getGateTrialTargetDate('2026-09-10')).toBe('2026-10-12');
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
      attemptDay: false,
    });
  });

  it('calculates the planning date over a leap day', () => {
    expect(getGateTrialTargetDate('2024-02-02')).toBe('2024-03-04');
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
    expect(upgraded).toMatchObject({ scheduleVersion: 4, trialTargetDate: '2026-10-12' });
    expect(saved.trialTargetDate).toBe('2026-10-07');
    expect(reconcileChapterOneCampaign(upgraded)).toBe(upgraded);
    // Version 2 generated the Sunday closing Week 4.
    expect(
      reconcileChapterOneCampaign({ ...saved, scheduleVersion: 2, trialTargetDate: '2026-10-11' }),
    ).toMatchObject({ scheduleVersion: 4, trialTargetDate: '2026-10-12' });
    // Version 3 generated Saturday's former trial order; that saved target must also move.
    expect(
      reconcileChapterOneCampaign({ ...saved, scheduleVersion: 3, trialTargetDate: '2026-10-10' }),
    ).toMatchObject({ scheduleVersion: 4, trialTargetDate: '2026-10-12' });
    // On version 1 or 2, Saturday was never generated, so preserve a chosen Saturday.
    for (const scheduleVersion of [undefined, 2]) {
      expect(
        reconcileChapterOneCampaign({ ...saved, scheduleVersion, trialTargetDate: '2026-10-10' }),
      ).toMatchObject({ scheduleVersion: 4, trialTargetDate: '2026-10-10' });
    }
    // The prior Monday-target build also stored version 3. Its generated Monday is already correct.
    expect(
      reconcileChapterOneCampaign({ ...saved, scheduleVersion: 3, trialTargetDate: '2026-10-12' }),
    ).toMatchObject({ scheduleVersion: 4, trialTargetDate: '2026-10-12' });
    expect(reconcileChapterOneCampaign({ ...saved, trialTargetDate: '2026-10-20' })).toMatchObject({
      trialTargetDate: '2026-10-20',
    });
    const future = { ...saved, scheduleVersion: 5 };
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

  it('repeats every Week 4 order after Week 4, its lighter Forges included', () => {
    const monday = getTodaysOrders('2026-09-07', '2026-10-05', 'green');
    expect(monday[1].title).toBe('Forge A at reduced effort');
    expect(monday[0].guidance).toBe('Hebrews 12:1–3');
    expect(getTodaysOrders('2026-09-07', '2026-10-06', 'green')[1].title).toBe(
      '30-minute easy walk',
    );
    expect(getTodaysOrders('2026-09-07', '2026-10-07', 'green')[1].title).toBe('Restoration');
    expect(getTodaysOrders('2026-09-07', '2026-10-08', 'green')[1].title).toBe(
      'Forge B at reduced volume',
    );
    expect(getTodaysOrders('2026-09-07', '2026-10-12', 'green')[1].title).toBe(
      'Forge A at reduced effort',
    );
  });

  it('gives a day the Gate Trial is taken on to the trial, with its Scripture', () => {
    const tuesday = withTrialDay(getChapterOneDay('2026-09-07', '2026-10-06')!, '2026-10-06', [
      { trialId: 'gate-trial', date: '2026-10-06' },
    ]);
    const orders = getDayOrders(tuesday, 'green');
    expect(orders[1]).toMatchObject({ title: 'Gate Trial', missionType: 'trial' });
    expect(orders[0].guidance).toBe('2 Timothy 4:7');
  });

  it('repeats Week 1 content during the lead-in without reaching Week 2 early', () => {
    expect(getTodaysOrders('2026-09-10', '2026-09-10', 'green')[1].title).toBe('Forge B');
    expect(getTodaysOrders('2026-09-10', '2026-09-17', 'green')[1].title).toBe('Forge B');
    expect(getTodaysOrders('2026-09-10', '2026-09-21', 'green')[0].guidance).toBe(
      'Matthew 5:33–37',
    );
    expect(getTodaysOrders('2026-09-10', '2026-10-10', 'green')[1].title).toBe(
      '30-minute easy walk',
    );
    expect(getTodaysOrders('2026-09-10', '2026-10-12', 'green')[1].title).toBe(
      'Forge A at reduced effort',
    );
  });

  it('defers the Gate Trial on Yellow or Red', () => {
    const day = withTrialDay(getChapterOneDay('2026-09-07', '2026-10-05')!, '2026-10-05', [
      { trialId: 'gate-trial', date: '2026-10-05' },
    ]);
    expect(getDayOrders(day, 'green')[1].title).toBe('Gate Trial');
    expect(getDayOrders(day, 'yellow')[1].title).toBe('Gate Trial waits for Green');
    expect(getDayOrders(day, 'red')[1].guidance).toContain('No strength or trial');
  });
});
