import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  CompletedSet,
  ReadinessCheck,
  WorkoutDraft,
  WorkoutSession,
} from '../../../core/domain/models';
import { loadWorkout } from '../../../core/program/program-catalog';
import { ProgressionHistory, campaignDayResolver } from '../../../core/state/progression-history';
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

/** The readiness check behind the saved sessions: Green, with nothing noted. */
const greenCheck = {
  id: 'green',
  date: '2026-10-12',
  checkedAt: '2026-10-12T07:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 4,
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
} as ReadinessCheck;

/** Gate Trial passed Monday, Nov 2: Chapter II runs from Tuesday, with Week 6 from Nov 9. */
async function render(
  workoutId: string,
  today: string,
  options: { draft?: WorkoutDraft; sessions?: WorkoutSession[] } = {},
) {
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
          active: vi.fn(async () => options.draft),
        },
      },
      {
        provide: ProgressionHistory,
        useValue: {
          load: vi.fn(async () => ({
            sessions: options.sessions ?? [],
            readinessById: new Map([['green', greenCheck]]),
            dayOf: campaignDayResolver(campaign.startDate, [
              { trialId: 'gate-trial', date: '2026-11-02' },
            ]),
          })),
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
  const element = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Opening your session');
  });
  return element;
}

/** A Chapter II Forge A session in progress: Box Squat first, 3 sets, no warm-up left. */
function startedDraft(today: string, set = 0): WorkoutDraft {
  const definition = loadWorkout('chapter-2-forge-a')!;
  return {
    id: 'draft',
    date: today,
    workoutDefinitionId: definition.id,
    readinessId: 'green',
    startedAt: `${today}T08:00:00.000Z`,
    updatedAt: `${today}T08:00:00.000Z`,
    reduced: false,
    warmupComplete: true,
    finishComplete: false,
    optionalFinishComplete: false,
    currentExerciseIndex: 0,
    currentSetIndex: set,
    definitionSnapshot: definition,
    exerciseResults: definition.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Array.from({ length: exercise.sets ?? 1 }, () => ({}) as CompletedSet),
      painEvents: [],
    })),
  } as WorkoutDraft;
}

/** Box Squat 95 lb for 6, 6 and 6 on Monday, Oct 12, final effort 6. */
function boxSquatWeekTwo(): WorkoutSession {
  const sets: CompletedSet[] = [6, 6, 6].map((reps, index) => ({
    completed: true,
    reps,
    load: 95,
    ...(index === 2 ? { rpe: 6 } : {}),
  }));
  return {
    id: 'past',
    date: '2026-10-12',
    workoutDefinitionId: 'chapter-1-forge-a',
    readinessId: 'green',
    completedAt: '2026-10-12T08:00:00.000Z',
    outcome: 'completed',
    definitionSnapshot: {
      id: 'chapter-1-forge-a',
      title: 'Forge A',
      contentVersion: 1,
      exercises: [{ exerciseId: 'box-squat', sets: 3, reps: 6 }],
    },
    exerciseResults: [{ exerciseId: 'box-squat', sets, painEvents: [] }],
  } as WorkoutSession;
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

  describe('Last time', () => {
    it('shows last time’s sets, the current set in bold, and a hint, with the load box empty', async () => {
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft: startedDraft('2026-11-10', 1),
        sessions: [boxSquatWeekTwo()],
      });
      const block = element.querySelector('.last-time');
      expect(block?.querySelector('h3')?.textContent).toContain('Last time');
      expect(block?.querySelector('h3')?.textContent).toContain('Mon, Oct 12');
      const sets = block?.querySelectorAll('.last-sets > span:not(.last-effort)');
      expect([...(sets ?? [])].map((set) => set.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        '95 × 6',
        '95 × 6 (this set)',
        '95 × 6',
      ]);
      expect(block?.querySelector('.is-current')?.textContent).toContain('95 × 6');
      expect(block?.querySelector('.last-effort')?.textContent).toContain('effort 6');
      expect(block?.querySelector('.last-hint')?.textContent).toContain(
        'May add 5 lb → 100 lb, or a lower box · all sets at 6, final effort 6',
      );
      expect(block?.querySelector('.last-hint app-icon')).toBeTruthy();
      expect((element.querySelector('#set-load') as HTMLInputElement).value).toBe('');
      expect(element.textContent).not.toContain('Previous load');
    });

    it('says so on the first time and offers nothing to add', async () => {
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft: startedDraft('2026-11-10'),
      });
      const block = element.querySelector('.last-time');
      expect(block?.textContent).toContain('First time on record');
      expect(block?.querySelector('.last-hint')).toBeNull();
    });
  });

  describe('Final-set effort', () => {
    async function openConfirm(set: number) {
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft: startedDraft('2026-11-10', set),
      });
      (element.querySelector('.primary-action') as HTMLButtonElement).click();
      await vi.waitFor(() => {
        TestBed.tick();
        expect(element.querySelector('#actual-set')).toBeTruthy();
      });
      return element;
    }

    it('puts a 1–10 tap scale first on the last set of an exercise', async () => {
      const element = await openConfirm(2);
      const confirm = element.querySelector('#actual-set');
      expect(confirm?.querySelectorAll('input[type="radio"]').length).toBe(10);
      expect(confirm?.querySelector('fieldset')?.nextElementSibling).toBeNull();
      expect(confirm?.firstElementChild?.tagName).toBe('H3');
      expect(confirm?.textContent).toContain('easy');
      expect(confirm?.textContent).toContain('2–3 reps left');
      expect(confirm?.textContent).toContain('nothing left');
      expect(confirm?.textContent).toContain('Optional · decides next time’s hint');
      expect(confirm?.querySelector('#set-rpe')).toBeNull();
    });

    it('keeps the optional number field on earlier sets', async () => {
      const element = await openConfirm(0);
      const confirm = element.querySelector('#actual-set');
      expect(confirm?.querySelector('input[type="radio"]')).toBeNull();
      expect(confirm?.querySelector('#set-rpe')).toBeTruthy();
    });
  });
});
