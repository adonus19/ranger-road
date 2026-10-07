import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { MissionInstance, ReadinessCheck } from '../domain/models';
import { CampaignState } from './campaign-state';
import { MissionHistory } from './mission-history';
import { MissionRecorder } from './mission-recorder';
import { TrialHistory } from './trial-history';

const friday = '2026-09-25';

function check(status: 'green' | 'yellow', date = friday): ReadinessCheck {
  return {
    id: `readiness-${status}`,
    date,
    checkedAt: `${date}T11:00:00.000Z`,
    sleepHours: 7,
    poorSleep: false,
    energy: 3,
    backPain: status === 'yellow' ? 3 : 0,
    shoulderPain: 0,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status,
  };
}

function setup(readiness: ReadinessCheck | null, existing: MissionInstance[] = []) {
  const add = vi.fn(async (_record: MissionInstance) => undefined);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CampaignState,
        useValue: {
          campaign: signal({
            id: 'primary',
            startDate: '2026-09-21',
            currentChapterId: 'chapter-1',
            status: 'active',
          }),
          readiness: signal(readiness),
          today: signal(friday),
          initialize: async () => undefined,
        },
      },
      { provide: MissionHistory, useValue: { forDate: async () => existing, add } },
      { provide: TrialHistory, useValue: { forTrial: async () => [] } },
    ],
  });
  return { recorder: TestBed.inject(MissionRecorder), add };
}

describe('MissionRecorder', () => {
  it('records a logged walk as the full mission on a Green day', async () => {
    const { recorder, add } = setup(check('green'));
    const result = await recorder.recordToday({ missionType: 'conditioning' });
    expect(result).toMatchObject({ recorded: true, outcome: 'full' });
    expect(add.mock.calls[0][0]).toMatchObject({
      date: friday,
      status: 'completed',
      reduced: false,
    });
  });

  it('records Reduced when asked, and always on Yellow', async () => {
    const green = setup(check('green'));
    expect(
      await green.recorder.recordToday({ missionType: 'conditioning' }, { reduced: true }),
    ).toMatchObject({ outcome: 'reduced' });
    TestBed.resetTestingModule();
    const yellow = setup(check('yellow'));
    expect(await yellow.recorder.recordToday({ missionType: 'conditioning' })).toMatchObject({
      outcome: 'reduced',
    });
  });

  it('leaves the mission alone without a readiness check, or when already recorded', async () => {
    const none = setup(null);
    expect(await none.recorder.recordToday({ missionType: 'conditioning' })).toEqual({
      recorded: false,
      reason: 'readiness',
    });
    TestBed.resetTestingModule();
    const first = setup(check('green'));
    const record = (await first.recorder.recordToday({ missionType: 'conditioning' })) as {
      record: MissionInstance;
    };
    TestBed.resetTestingModule();
    const again = setup(check('green'), [record.record]);
    expect(await again.recorder.recordToday({ missionType: 'conditioning' })).toEqual({
      recorded: false,
      reason: 'already',
    });
    expect(again.add).not.toHaveBeenCalled();
  });

  it('finds nothing to record for a work type the day does not plan', async () => {
    const { recorder, add } = setup(check('green'));
    expect(await recorder.recordToday({ workoutId: 'not-a-workout' })).toEqual({
      recorded: false,
      reason: 'none',
    });
    expect(add).not.toHaveBeenCalled();
  });
});
