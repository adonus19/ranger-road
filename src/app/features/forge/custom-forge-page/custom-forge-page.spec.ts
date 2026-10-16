import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  WorkoutDraft,
  WorkoutSession,
} from '../../../core/domain/models';
import type { WorkoutStart } from '../../../core/domain/workout';
import { chapterTwoForgeA } from '../../../core/program/chapter-two-workouts';
import { ProgressionHistory, campaignDayResolver } from '../../../core/state/progression-history';
import { CampaignState } from '../../../core/state/campaign-state';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { CustomForgePage } from './custom-forge-page';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};
const trials = [{ trialId: 'gate-trial', date: '2026-11-02' }];

/** Monday, Nov 9's Forge A, saved: Tuesday's builder notes the repeats. */
const forgeA = {
  id: 'forge-a',
  date: '2026-11-09',
  workoutDefinitionId: chapterTwoForgeA.id,
  readinessId: 'green',
  outcome: 'completed',
  definitionSnapshot: chapterTwoForgeA,
  exerciseResults: [],
} as WorkoutSession;

const lastCustom = {
  id: 'custom-old',
  date: '2026-11-04',
  workoutDefinitionId: 'custom-forge',
  kind: 'custom',
  readinessId: 'green',
  outcome: 'completed',
  definitionSnapshot: {
    id: 'custom-forge',
    title: 'Custom Forge',
    exercises: [
      { exerciseId: 'hammer-curl', sets: 2, reps: 10 },
      { exerciseId: 'band-face-pull', sets: 3, reps: 12 },
    ],
  },
  exerciseOrder: [1, 0],
  exerciseResults: [],
} as WorkoutSession;

async function render(
  options: {
    today?: string;
    readiness?: 'green' | 'yellow' | null;
    sessions?: WorkoutSession[];
    active?: WorkoutDraft;
    start?: (input: WorkoutStart) => Promise<WorkoutDraft>;
  } = {},
) {
  const today = options.today ?? '2026-11-10';
  const sessions = options.sessions ?? [forgeA];
  const schedule = new ScheduleHistory();
  schedule.history.set({
    records: [],
    sessions: [
      { date: '2026-11-05', workoutDefinitionId: 'chapter-2-forge-b' },
      ...sessions.map(({ date, workoutDefinitionId, outcome }) => ({
        date,
        workoutDefinitionId,
        ...(outcome ? { outcome } : {}),
      })),
    ],
    redDates: new Set(),
  });
  schedule.refresh = vi.fn(async () => undefined);
  const readiness =
    options.readiness === null
      ? null
      : ({
          id: 'r',
          date: today,
          status: options.readiness ?? 'green',
        } as ReadinessCheck);
  const start = vi.fn(options.start ?? (async () => ({}) as WorkoutDraft));
  TestBed.configureTestingModule({
    imports: [CustomForgePage],
    providers: [
      provideRouter([]),
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
        useValue: { active: vi.fn(async () => options.active), start },
      },
      {
        provide: ProgressionHistory,
        useValue: {
          load: vi.fn(async () => ({
            sessions,
            readinessById: new Map(),
            dayOf: campaignDayResolver(campaign.startDate, trials),
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
    ],
  });
  const fixture = TestBed.createComponent(CustomForgePage);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Opening the builder');
  });
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { element, start, navigate, settle };
}

function row(element: HTMLElement, name: string): HTMLLIElement {
  const found = [...element.querySelectorAll<HTMLLIElement>('.row')].find(
    (item) => item.querySelector('.name')?.textContent?.trim() === name,
  );
  if (!found) throw new Error(`No row for ${name}`);
  return found;
}

function button(element: HTMLElement, label: string): HTMLButtonElement {
  const found = [...element.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(label),
  );
  if (!found) throw new Error(`No button "${label}"`);
  return found;
}

describe('CustomForgePage', () => {
  it('lists the library by group, with each row’s dose and where it comes from', async () => {
    const { element } = await render();
    expect(element.querySelector('h1')?.textContent).toContain('Build your session');
    const headings = [...element.querySelectorAll('.group h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Lower body', 'Push', 'Pull', 'Carry', 'Core', 'Arms', 'Mobility']);
    expect(row(element, 'Box Squat').querySelector('.dose')?.textContent).toContain(
      '3 × 6 · From Forge A',
    );
    expect(row(element, 'Pike Push-Up').querySelector('.dose')?.textContent).toContain(
      'Catalog default',
    );
    expect(button(element, 'Done picking').disabled).toBe(true);
  });

  it('numbers picks in tap order and closes up the numbers when one is removed', async () => {
    const { element, settle } = await render();
    for (const name of ['Pallof Press', 'Hammer Curl', 'Farmer Carry']) {
      row(element, name).querySelector<HTMLButtonElement>('.toggle')!.click();
    }
    await settle();
    expect(row(element, 'Hammer Curl').querySelector('.mark')?.textContent?.trim()).toBe('2');
    expect(row(element, 'Farmer Carry').querySelector('.mark')?.textContent?.trim()).toBe('3');
    expect(
      row(element, 'Pallof Press').querySelector('.toggle')?.getAttribute('aria-pressed'),
    ).toBe('true');
    row(element, 'Hammer Curl').querySelector<HTMLButtonElement>('.toggle')!.click();
    await settle();
    expect(row(element, 'Farmer Carry').querySelector('.mark')?.textContent?.trim()).toBe('2');
    expect(row(element, 'Hammer Curl').querySelector('.stepper')).toBeNull();
    expect(button(element, 'Done picking').textContent).toContain('(2)');
  });

  it('edits the set count within its range', async () => {
    const { element, settle } = await render();
    row(element, 'Hammer Curl').querySelector<HTMLButtonElement>('.toggle')!.click();
    await settle();
    const stepper = row(element, 'Hammer Curl').querySelector('.stepper')!;
    const [fewer, more] = stepper.querySelectorAll('button');
    expect(stepper.querySelector('strong')?.textContent).toBe('2');
    more.click();
    await settle();
    expect(stepper.querySelector('strong')?.textContent).toBe('3');
    expect(row(element, 'Hammer Curl').querySelector('.dose')?.textContent).toContain('3 × 10');
    fewer.click();
    fewer.click();
    await settle();
    expect(stepper.querySelector('strong')?.textContent).toBe('1');
    expect(fewer.disabled).toBe(true);
  });

  it('notes, without blocking, a pick that was in yesterday’s Forge A', async () => {
    const { element, settle } = await render();
    expect(element.querySelector('.repeat-note')).toBeNull();
    row(element, 'Box Squat').querySelector<HTMLButtonElement>('.toggle')!.click();
    await settle();
    expect(element.querySelector('.repeat-note')?.textContent).toContain(
      'Box Squat was in yesterday’s Forge A.',
    );
    expect(button(element, 'Done picking').disabled).toBe(false);
  });

  it('starts from last time’s list in the order it was worked', async () => {
    const { element, settle } = await render({ sessions: [forgeA, lastCustom] });
    button(element, 'Start from last time’s list').click();
    await settle();
    expect(row(element, 'Band Face Pull').querySelector('.mark')?.textContent?.trim()).toBe('1');
    expect(row(element, 'Hammer Curl').querySelector('.mark')?.textContent?.trim()).toBe('2');
    expect(row(element, 'Band Face Pull').querySelector('.stepper strong')?.textContent).toBe('3');
  });

  it('opens the order editor, then begins a custom session in the chosen order', async () => {
    const { element, start, navigate, settle } = await render();
    for (const name of ['Pallof Press', 'Hammer Curl']) {
      row(element, name).querySelector<HTMLButtonElement>('.toggle')!.click();
    }
    await settle();
    button(element, 'Done picking').click();
    await settle();
    expect(element.querySelector('h1')?.textContent).toContain('Set the order');
    expect(element.textContent).toContain('2 exercises, 4 sets');
    expect(element.textContent).toContain('you can skip it');
    element.querySelector<HTMLButtonElement>('[aria-label="Move Hammer Curl up"]')!.click();
    await settle();
    button(element, 'Begin').click();
    await vi.waitFor(() => expect(start).toHaveBeenCalled());
    const input = start.mock.calls[0][0];
    expect(input.kind).toBe('custom');
    expect(input.reduced).toBe(false);
    expect(input.definition.id).toBe('custom-forge');
    expect(input.definition.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'hammer-curl',
      'pallof-press',
    ]);
    expect(input.definition.warmup?.length).toBeGreaterThan(0);
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(['/forge/session', 'custom-forge']),
    );
  });

  it('asks for readiness first', async () => {
    const { element } = await render({ readiness: null });
    expect(element.querySelector('h1')?.textContent).toContain('Check readiness first');
    expect(element.querySelector('.group')).toBeNull();
  });

  it('stays closed on a day without the optional Forge', async () => {
    // Monday, Nov 9 is a Forge A day.
    const { element } = await render({ today: '2026-11-09', sessions: [] });
    expect(element.querySelector('h1')?.textContent).toContain('No optional Forge today');
  });
});
