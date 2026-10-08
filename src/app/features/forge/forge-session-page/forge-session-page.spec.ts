import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign, ReadinessCheck } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionRecorder } from '../../../core/state/mission-recorder';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { ForgeSessionPage } from './forge-session-page';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

/** Gate Trial passed Monday, Nov 2: Chapter II runs from Tuesday, with Week 6 from Nov 9. */
async function render(workoutId: string, today: string) {
  const schedule = new ScheduleHistory();
  // Week 5's Forge B is saved; nothing on Monday, Nov 9, so its Forge A moves to Tuesday.
  schedule.history.set({
    records: [],
    sessions: [{ date: '2026-11-05', workoutDefinitionId: 'chapter-2-forge-b' }],
    redDates: new Set(),
  });
  schedule.refresh = vi.fn(async () => undefined);
  const readiness = { date: today, status: 'green' } as ReadinessCheck;
  TestBed.configureTestingModule({
    imports: [ForgeSessionPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ workoutId }) } },
      },
      {
        provide: CampaignState,
        useValue: {
          campaign: signal(campaign),
          today: signal(today),
          readiness: signal(readiness),
          loading: signal(false),
          initialize: vi.fn(async () => undefined),
        },
      },
      {
        provide: WorkoutHistory,
        useValue: {
          active: vi.fn(async () => undefined),
          previousLoad: vi.fn(async () => undefined),
        },
      },
      {
        provide: TrialHistory,
        useValue: {
          forTrial: vi.fn(async (id: string) =>
            id === 'gate-trial'
              ? [
                  {
                    id: 'g',
                    trialId: 'gate-trial',
                    date: '2026-11-02',
                    phaseResults: [],
                    reflection: '',
                  },
                ]
              : [],
          ),
        },
      },
      { provide: ScheduleHistory, useValue: schedule },
      { provide: MissionRecorder, useValue: {} },
    ],
  });
  const fixture = TestBed.createComponent(ForgeSessionPage);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ForgeSessionPage', () => {
  it('opens a Forge session moved to today by a make-up', async () => {
    const element = await render('chapter-2-forge-a', '2026-11-10');
    expect(element.textContent).not.toContain('not part of today');
    expect(element.querySelector('#preflight-title')?.textContent).toContain('Forge A');
    expect(element.querySelector('.preflight .eyebrow')?.textContent).toContain('Today’s order');
  });

  it('still refuses a session that is not in today’s orders', async () => {
    const element = await render('chapter-2-forge-b', '2026-11-10');
    expect(element.textContent).toContain('not part of today’s Chapter II plan');
  });
});
