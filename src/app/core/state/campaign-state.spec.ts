import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMissionRecord } from '../domain/mission';
import { DATABASE_NAME, RoadDatabase } from '../persistence/road-database';
import { CampaignState } from './campaign-state';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('CampaignState', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 25, 9, 0));
    TestBed.resetTestingModule();
    await deleteDatabase();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('waits for the person to choose Day 1 instead of starting on first open', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();

    expect(state.campaign()).toBeNull();
    expect(state.needsStartDate()).toBe(true);
  });

  it('saves the chosen Day 1 with its first Gate Trial attempt and keeps it across a reload', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();
    await state.startCampaign('2026-09-28');

    expect(state.campaign()).toMatchObject({
      startDate: '2026-09-28',
      trialTargetDate: '2026-10-26',
    });
    expect(state.beforeDayOne()).toBe(true);

    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(CampaignState);
    await reloaded.initialize();
    expect(reloaded.campaign()?.startDate).toBe('2026-09-28');
  });

  it('moves Day 1 while it is still ahead, and refuses once it has passed', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();
    await state.startCampaign('2026-09-28');
    await state.startCampaign('2026-10-05');
    expect(state.campaign()?.startDate).toBe('2026-10-05');

    await state.startCampaign('2026-09-25');
    expect(state.beforeDayOne()).toBe(false);
    await expect(state.startCampaign('2026-09-30')).rejects.toThrow(/already passed/);
    expect(state.campaign()?.startDate).toBe('2026-09-25');
  });

  it('updates an older generated trial target while leaving an existing mission snapshot untouched', async () => {
    const database = await RoadDatabase.open();
    const savedCampaign = {
      id: 'primary',
      startDate: '2026-09-10',
      currentChapterId: 'chapter-1',
      status: 'active',
      trialTargetDate: '2026-10-07',
    };
    const oldDefinition = {
      id: 'chapter-1-week-2-day-4-weekly',
      chapterId: 'chapter-1',
      week: 2,
      day: 4,
      missionType: 'fieldcraft' as const,
      title: 'Old schedule order',
      required: true,
      contentReferences: ['old-content'],
      requiresReadiness: false,
    };
    const record = createMissionRecord({
      id: 'saved-before-schedule-change',
      definition: oldDefinition,
      date: '2026-09-17',
      outcome: 'full',
      recordedAt: '2026-09-17T12:00:00.000Z',
    });
    await database.putCampaign(savedCampaign);
    await database.addMissionInstance(record);
    database.close();

    const state = TestBed.inject(CampaignState);
    await state.initialize();
    expect(state.campaign()).toMatchObject({
      startDate: '2026-09-10',
      trialTargetDate: '2026-10-12',
      scheduleVersion: 3,
    });

    const reloaded = await RoadDatabase.open();
    expect(await reloaded.getCampaign('primary')).toMatchObject({
      trialTargetDate: '2026-10-12',
      scheduleVersion: 3,
    });
    expect(await reloaded.getMissionInstancesForDate('2026-09-17')).toEqual([record]);
    reloaded.close();
  });

  it('rejects an impossible date without writing anything', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();

    await expect(state.startCampaign('2026-02-30')).rejects.toThrow(RangeError);
    expect(state.campaign()).toBeNull();
  });

  it('clears yesterday’s readiness when the app returns after midnight', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();
    await state.recordReadiness({
      date: '2026-09-25',
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
    });
    expect(state.readiness()?.date).toBe('2026-09-25');

    vi.setSystemTime(new Date(2026, 8, 26, 0, 1));
    window.dispatchEvent(new Event('focus'));
    expect(state.today()).toBe('2026-09-26');
    expect(state.readiness()).toBeNull();
    await expect(
      state.recordReadiness({
        date: '2026-09-25',
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
      }),
    ).rejects.toThrow(/new day started/i);
  });

  it('moves the open app to the new civil day without waiting for navigation', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 8, 25, 23, 59, 59));
    const state = TestBed.inject(CampaignState);
    await state.initialize();
    expect(state.today()).toBe('2026-09-25');

    await vi.advanceTimersByTimeAsync(2_100);
    expect(state.today()).toBe('2026-09-26');
    expect(state.readiness()).toBeNull();
  });

  it('refreshes readiness saved in another tab when this tab regains focus', async () => {
    const state = TestBed.inject(CampaignState);
    await state.initialize();
    const database = await RoadDatabase.open();
    await database.addReadinessCheck({
      id: 'other-tab-check',
      date: '2026-09-25',
      checkedAt: '2026-09-25T13:00:00.000Z',
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
    });
    database.close();

    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(state.readiness()?.id).toBe('other-tab-check'));
  });
});
