import type { WorkoutStart } from '../../../core/domain/workout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  CompletedSet,
  ReadinessCheck,
  TrackStepChoice,
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
  options: {
    draft?: WorkoutDraft;
    sessions?: WorkoutSession[];
    history?: Partial<Record<keyof WorkoutHistory, unknown>>;
    shoulderPain?: number;
    neckPain?: number;
    status?: 'green' | 'yellow';
    trackSteps?: TrackStepChoice[];
  } = {},
) {
  const schedule = new ScheduleHistory();
  // Week 5's Forge B is saved; nothing on Monday, Nov 9, so its Forge A moves to Tuesday.
  schedule.history.set({
    records: [],
    sessions: [{ date: '2026-11-05', workoutDefinitionId: 'chapter-2-forge-b' }],
    redDates: new Set(),
  });
  schedule.refresh = vi.fn(async () => undefined);
  const readiness = {
    date: today,
    status: options.status ?? 'green',
    shoulderPain: options.shoulderPain ?? 0,
    neckPain: options.neckPain ?? 0,
  } as ReadinessCheck;
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
          trackSteps: vi.fn(async () => options.trackSteps ?? []),
          ...options.history,
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
function startedDraft(today: string, set = 0, workoutId = 'chapter-2-forge-a'): WorkoutDraft {
  const definition = loadWorkout(workoutId)!;
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

/** Push-ups 3 × 12 on Thursday, Nov 5 (Chapter II), final effort 6: the push track's step 1. */
function pushUpsPassed(): WorkoutSession {
  return {
    id: 'push-pass',
    date: '2026-11-05',
    workoutDefinitionId: 'chapter-2-forge-b',
    readinessId: 'green',
    completedAt: '2026-11-05T08:00:00.000Z',
    outcome: 'completed',
    definitionSnapshot: loadWorkout('chapter-2-forge-b')!,
    exerciseResults: [
      {
        exerciseId: 'push-up',
        sets: [12, 12, 12].map((reps, index) => ({
          completed: true,
          reps,
          ...(index === 2 ? { rpe: 6 } : {}),
        })),
        painEvents: [],
      },
    ],
  } as WorkoutSession;
}

describe('ForgeSessionPage', () => {
  describe('Skill track step', () => {
    const today = '2026-11-10';
    const pushDraft = (marked = false) => {
      const draft = startedDraft(today, 0, 'chapter-2-forge-b');
      draft.currentExerciseIndex = draft.definitionSnapshot.exercises.findIndex(
        (exercise) => exercise.trackId === 'push',
      );
      if (marked) {
        draft.exerciseResults[draft.currentExerciseIndex].sets[0] = { completed: true, reps: 10 };
        draft.currentSetIndex = 1;
      }
      return draft;
    };
    const line = (element: HTMLElement) => element.querySelector('.track-step');
    const button = (element: HTMLElement, text: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('.track-step button')].find((b) =>
        b.textContent?.includes(text),
      )!;

    it('shows "Next step available" as information and changes nothing by itself', async () => {
      const takeTrackStep = vi.fn();
      const element = await render('chapter-2-forge-b', today, {
        draft: pushDraft(),
        sessions: [pushUpsPassed()],
        history: { takeTrackStep },
      });
      expect(line(element)?.textContent).toContain('Next step available: Pike Push-Up');
      expect(button(element, 'Take this step')).toBeTruthy();
      expect(button(element, 'Not yet')).toBeTruthy();
      expect(element.textContent).not.toMatch(/behind/i);
      expect(element.querySelector('#exercise-title')?.textContent).toContain('Push-Up');
      expect(takeTrackStep).not.toHaveBeenCalled();
    });

    it('shows nothing before the step is passed, on a Yellow day, or off the track slot', async () => {
      const none = await render('chapter-2-forge-b', today, { draft: pushDraft() });
      expect(line(none)).toBeNull();
      TestBed.resetTestingModule();
      const yellow = await render('chapter-2-forge-b', today, {
        draft: pushDraft(),
        sessions: [pushUpsPassed()],
        status: 'yellow',
      });
      expect(line(yellow)).toBeNull();
      TestBed.resetTestingModule();
      const squat = await render('chapter-2-forge-b', today, {
        draft: startedDraft(today, 0, 'chapter-2-forge-b'),
        sessions: [pushUpsPassed()],
      });
      expect(line(squat)).toBeNull();
    });

    it('hides the line for this session on "Not yet"', async () => {
      const element = await render('chapter-2-forge-b', today, {
        draft: pushDraft(),
        sessions: [pushUpsPassed()],
      });
      button(element, 'Not yet').click();
      await vi.waitFor(() => expect(line(element)).toBeNull());
    });

    it('takes the step into today’s session before the slot’s first set', async () => {
      const draft = pushDraft();
      const index = draft.currentExerciseIndex;
      const takeTrackStep = vi.fn(async (_track: string, exerciseId: string, change) => {
        const changed = structuredClone(draft);
        (changed.definitionSnapshot.exercises as unknown[])[index] = change.prescription;
        changed.exerciseResults[index] = { exerciseId, sets: [{}, {}, {}], painEvents: [] };
        return {
          choice: { id: 'c', trackId: 'push', exerciseId, takenAt: `${today}T09:00:00.000Z` },
          draft: changed,
        };
      });
      const element = await render('chapter-2-forge-b', today, {
        draft,
        sessions: [pushUpsPassed()],
        history: { takeTrackStep },
      });
      button(element, 'Take this step').click();
      await vi.waitFor(() =>
        expect(element.querySelector('#exercise-title')?.textContent).toContain('Pike Push-Up'),
      );
      expect(takeTrackStep).toHaveBeenCalledWith('push', 'pike-push-up', {
        draftId: 'draft',
        index,
        prescription: {
          exerciseId: 'pike-push-up',
          sets: 3,
          reps: '8–12',
          notes: 'Submaximal sets. Never to failure.',
          trackId: 'push',
        },
      });
      expect(line(element)?.textContent).not.toContain('Next step available');
      // Past the first step, going back is offered quietly, and nothing happens until it is tapped.
      expect(button(element, 'Go back a step').textContent).toContain('Push-Up');
    });

    it('saves the step for next time once the slot has begun', async () => {
      const takeTrackStep = vi.fn(async () => ({
        choice: {
          id: 'c',
          trackId: 'push',
          exerciseId: 'pike-push-up',
          takenAt: `${today}T09:00:00.000Z`,
        },
      }));
      const element = await render('chapter-2-forge-b', today, {
        draft: pushDraft(true),
        sessions: [pushUpsPassed()],
        history: { takeTrackStep },
      });
      button(element, 'Take this step').click();
      await vi.waitFor(() =>
        expect(line(element)?.textContent).toContain('Saved. Pike Push-Up starts next time.'),
      );
      expect(takeTrackStep).toHaveBeenCalledWith('push', 'pike-push-up', undefined);
      expect(element.querySelector('#exercise-title')?.textContent).not.toContain('Pike');
    });

    it('starts the session on the current step and keeps the remembered order', async () => {
      const start = vi.fn(async (input: WorkoutStart) => ({
        ...startedDraft('2026-11-10'),
        exerciseOrder: input.exerciseOrder,
      }));
      const ids = loadWorkout('chapter-2-forge-a')!.exercises.map((e) => e.exerciseId);
      const order = ids.map((_, index) => index).reverse();
      const forgetOrder = vi.fn(async () => undefined);
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        trackSteps: [
          {
            id: 'c',
            trackId: 'pull',
            exerciseId: 'band-light-pull-up',
            takenAt: '2026-11-05T09:00:00.000Z',
          },
        ],
        history: {
          start,
          forgetOrder,
          savedOrder: vi.fn(async () => ({
            id: 'chapter-2-forge-a',
            exerciseIds: order.map((index) => ids[index]),
            updatedAt: 'x',
          })),
        },
      });
      [...element.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Start'))!
        .click();
      await vi.waitFor(() => expect(start).toHaveBeenCalled());
      const input = start.mock.calls[0][0];
      expect(input.definition.exercises[2]).toMatchObject({
        exerciseId: 'band-light-pull-up',
        trackId: 'pull',
        reps: '6–8',
      });
      expect(input.exerciseOrder).toEqual(order);
      expect(forgetOrder).not.toHaveBeenCalled();
    });
  });

  describe('Shoulder swap', () => {
    const pressDraft = () => {
      const draft = startedDraft('2026-11-10');
      draft.currentExerciseIndex = draft.definitionSnapshot.exercises.findIndex((exercise) =>
        exercise.exerciseId.includes('overhead-press'),
      );
      return draft;
    };

    it('offers a calm choice at shoulder pain 3, and applies nothing by itself', async () => {
      const draft = pressDraft();
      const swapExercise = vi.fn();
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft,
        shoulderPain: 3,
        history: { swapExercise },
      });
      expect(draft.currentExerciseIndex).toBeGreaterThanOrEqual(0);
      const offer = element.querySelector('.swap-offer');
      expect(offer?.textContent).toContain('Band Pull-Apart');
      expect(offer?.textContent).toContain('reduced');
      expect(swapExercise).not.toHaveBeenCalled();
    });

    it('offers a pike hold and a push-up for a handstand step at neck pain 2', async () => {
      const draft = startedDraft('2026-11-10');
      (draft.definitionSnapshot.exercises as unknown[])[0] = {
        exerciseId: 'chest-to-wall-handstand-hold',
        sets: 3,
        durationSeconds: '15–30',
      };
      draft.exerciseResults[0].exerciseId = 'chest-to-wall-handstand-hold';
      const element = await render('chapter-2-forge-a', '2026-11-10', { draft, neckPain: 2 });
      const buttons = [...element.querySelectorAll('.swap-offer button')].map((button) =>
        button.textContent?.trim(),
      );
      expect(buttons).toEqual(['Do Pike Hold', 'Do Push-Up', 'Keep as written']);
      expect(element.querySelector('.swap-offer')?.textContent).toContain('neck or shoulder');
    });

    it('stays away below shoulder pain 3', async () => {
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft: pressDraft(),
        shoulderPain: 2,
      });
      expect(element.querySelector('.swap-offer')).toBeNull();
    });

    it('closes the offer on "Keep as written"', async () => {
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft: pressDraft(),
        shoulderPain: 4,
      });
      const keep = [...element.querySelectorAll<HTMLButtonElement>('.swap-offer button')].find(
        (button) => button.textContent?.includes('Keep as written'),
      )!;
      keep.click();
      await vi.waitFor(() => expect(element.querySelector('.swap-offer')).toBeNull());
    });
  });

  describe('press stance choice', () => {
    /** A draft on a one-arm press that offers the half-kneeling stance, as Chapter III's does. */
    function stanceDraft(stanceFrom?: string): WorkoutDraft {
      const draft = startedDraft('2026-11-10');
      const current = stanceFrom ? 'half-kneeling-one-arm-db-press' : 'one-arm-db-overhead-press';
      (draft.definitionSnapshot.exercises as unknown[])[0] = {
        exerciseId: current,
        sets: 3,
        reps: 8,
        perSide: true,
        stanceChoice: stanceFrom ?? 'half-kneeling-one-arm-db-press',
      };
      draft.exerciseResults[0] = {
        exerciseId: current,
        sets: [{}, {}, {}],
        painEvents: [],
        ...(stanceFrom ? { stanceFrom } : {}),
      };
      return draft;
    }

    it('offers "Press half-kneeling instead" quietly and saves only on a tap', async () => {
      const draft = stanceDraft();
      const switched = stanceDraft('one-arm-db-overhead-press');
      const switchStance = vi.fn(async () => switched);
      const element = await render('chapter-2-forge-a', '2026-11-10', {
        draft,
        history: { switchStance },
      });
      const row = element.querySelector('.stance-choice');
      expect(row?.textContent).toContain('Seated by default.');
      expect(switchStance).not.toHaveBeenCalled();
      expect(element.querySelector('.swap-offer')).toBeNull();

      row!.querySelector('button')!.click();
      await vi.waitFor(() => expect(switchStance).toHaveBeenCalledWith('draft', 0));
      await vi.waitFor(() =>
        expect(element.querySelector('.stance-choice button')?.textContent?.trim()).toBe(
          'Press seated instead',
        ),
      );
    });

    it('leaves once the first set is marked', async () => {
      const draft = stanceDraft();
      draft.exerciseResults[0].sets[0] = { reps: 8, completed: true };
      const element = await render('chapter-2-forge-a', '2026-11-10', { draft });
      expect(element.querySelector('.stance-choice')).toBeNull();
    });
  });

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

  describe('Remembered order', () => {
    const today = '2026-11-10';

    async function startWith(exerciseIds: string[]) {
      const start = vi.fn(async (input: WorkoutStart) => ({
        ...startedDraft(today),
        exerciseOrder: input.exerciseOrder,
      }));
      const forgetOrder = vi.fn(async () => undefined);
      const element = await render('chapter-2-forge-a', today, {
        history: {
          start,
          forgetOrder,
          savedOrder: vi.fn(async () => ({
            id: 'chapter-2-forge-a',
            exerciseIds,
            updatedAt: `${today}T07:00:00.000Z`,
          })),
        },
      });
      const button = [...element.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Start'),
      )!;
      button.click();
      await vi.waitFor(() => expect(start).toHaveBeenCalled());
      return { element, start, forgetOrder };
    }

    it('starts in the remembered order', async () => {
      const ids = loadWorkout('chapter-2-forge-a')!.exercises.map((e) => e.exerciseId);
      const order = ids.map((_, index) => index).reverse();
      const { start, forgetOrder } = await startWith(order.map((index) => ids[index]));
      expect(start.mock.calls[0][0].exerciseOrder).toEqual(order);
      expect(forgetOrder).not.toHaveBeenCalled();
    });

    it('drops an order that no longer fits and says why', async () => {
      const { element, start, forgetOrder } = await startWith(['box-squat', 'retired-exercise']);
      expect(start.mock.calls[0][0].exerciseOrder).toBeUndefined();
      expect(forgetOrder).toHaveBeenCalledWith('chapter-2-forge-a');
      await vi.waitFor(() =>
        expect(element.textContent).toContain(
          'This workout’s exercises changed, so it’s back in the written order.',
        ),
      );
    });
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

  describe('Custom Forge', () => {
    const today = '2026-11-10';
    function customDraft(warmupComplete: boolean): WorkoutDraft {
      const written = startedDraft(today);
      return {
        ...written,
        workoutDefinitionId: 'custom-forge',
        kind: 'custom',
        warmupComplete,
        definitionSnapshot: {
          ...written.definitionSnapshot,
          id: 'custom-forge',
          title: 'Custom Forge',
        },
      } as WorkoutDraft;
    }

    it('shows Last time for reference but no hint line', async () => {
      const element = await render('custom-forge', today, {
        draft: customDraft(true),
        sessions: [boxSquatWeekTwo()],
      });
      const block = element.querySelector('.last-time');
      expect(block?.querySelector('h3')?.textContent).toContain('Last time');
      expect(block?.querySelector('.last-hint')).toBeNull();
    });

    it('offers to skip the warm-up and records that it was skipped', async () => {
      const saveDraft = vi.fn(async (draft: WorkoutDraft) => draft);
      const element = await render('custom-forge', today, {
        draft: customDraft(false),
        history: { saveDraft },
      });
      expect(element.querySelector('#warmup-title')).toBeTruthy();
      const skip = [...element.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Skip the warm-up'),
      )!;
      skip.click();
      await vi.waitFor(() => expect(saveDraft).toHaveBeenCalled());
      expect(saveDraft.mock.calls[0][0]).toMatchObject({
        warmupComplete: true,
        warmupSkipped: true,
      });
    });

    it('keeps the skip out of a written Forge’s warm-up', async () => {
      const element = await render('chapter-2-forge-a', today, {
        draft: { ...startedDraft(today), warmupComplete: false },
      });
      expect(element.querySelector('#warmup-title')).toBeTruthy();
      expect(element.textContent).not.toContain('Skip the warm-up');
    });

    it('sends a custom session without a draft to the builder', async () => {
      const element = await render('custom-forge', today);
      expect(element.textContent).toContain('Build your session first');
      expect(element.querySelector('a[href="/forge/custom"]')).toBeTruthy();
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
