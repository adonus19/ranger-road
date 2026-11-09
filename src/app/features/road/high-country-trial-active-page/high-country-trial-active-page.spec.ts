import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  TrialDraft,
  TrialPhaseResult,
} from '../../../core/domain/models';
import { createTrialDraft } from '../../../core/domain/trial-draft';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { HighCountryTrialActivePage } from './high-country-trial-active-page';

// Day 1 Mon Oct 5; Gate pass Mon Nov 2; Three-Mile pass Mon Nov 30. Week 12 ends Sun Dec 27.
const hikeDay = '2026-12-29';
const nextDay = '2026-12-30';
const passes = [
  { id: 'gate', trialId: 'gate-trial', date: '2026-11-02', phaseResults: [], reflection: '' },
  { id: 'tm', trialId: 'three-mile-trial', date: '2026-11-30', phaseResults: [], reflection: '' },
];
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-3',
  status: 'active',
};

function check(date: string, changes: Partial<ReadinessCheck> = {}): ReadinessCheck {
  return {
    id: `check-${date}`,
    date,
    checkedAt: `${date}T10:00:00.000Z`,
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
    ...changes,
  };
}

function hikePhases(): TrialPhaseResult[] {
  return [
    {
      phaseId: 'pre-start-plan',
      responses: {
        direction: 'North',
        junctions: 'Fire road',
        expectedDistance: '5 miles',
        expectedElevation: '1,200 ft',
        turnaroundPoint: 'Overlook',
        turnaroundTime: '1:00 pm',
      },
    },
    {
      phaseId: 'hike',
      metrics: { durationMinutes: 150, distanceMiles: 5, rpe: 6 },
      responses: { knee: 'Fine', back: 'Fine' },
    },
    { phaseId: 'location-estimate', responses: { 'estimate-1': 'Past the fire road' } },
    {
      phaseId: 'high-point',
      metrics: { quietMinutesDone: true },
      responses: { reflection: 'A steady home.' },
    },
    { phaseId: 'circuit' },
  ];
}

function hikeDraft(): TrialDraft {
  return createTrialDraft(
    'high-country-trial',
    hikeDay,
    check(hikeDay),
    `${hikeDay}T10:30:00.000Z`,
    'hc-draft',
  );
}

function hikeSaved(): TrialDraft {
  const draft = hikeDraft();
  draft.phaseResults = hikePhases();
  draft.currentPhaseIndex = 3;
  draft.pieces![0].completedAt = `${hikeDay}T15:00:00.000Z`;
  return draft;
}

async function render(
  options: { draft?: TrialDraft; today?: string; readiness?: ReadinessCheck | null } = {},
) {
  const today = options.today ?? hikeDay;
  const state = {
    campaign: signal<Campaign | null>(campaign),
    readiness: signal<ReadinessCheck | null>(
      options.readiness === undefined ? check(today) : options.readiness,
    ),
    today: signal(today),
    loading: signal(false),
    error: signal<string | null>(null),
    beforeDayOne: computed(() => false),
    initialize: vi.fn(async () => undefined),
  };
  const history = {
    activeDraft: vi.fn(async () => options.draft),
    forTrial: vi.fn(async (id: string) => passes.filter((pass) => pass.trialId === id)),
    startDraft: vi.fn(async () => hikeDraft()),
    startPiece: vi.fn(async (_id: string, date: string) => {
      const draft = structuredClone(options.draft!);
      draft.pieces!.push({
        pieceId: 'circuit',
        date,
        readinessId: `check-${date}`,
        startedAt: `${date}T10:00:00.000Z`,
      });
      draft.currentPhaseIndex = 4;
      return draft;
    }),
    saveDraft: vi.fn(async (edited: TrialDraft) => ({ ...edited, revision: edited.revision + 1 })),
    postponePiece: vi.fn(async () => ({ ...hikeDraft(), outcome: 'postponed-for-weather' })),
    recordPain: vi.fn(async () => undefined),
    finishDraft: vi.fn(),
  };
  const progression = {
    load: vi.fn(async () => ({ sessions: [], readinessById: new Map(), dayOf: () => null })),
  };
  TestBed.configureTestingModule({
    imports: [HighCountryTrialActivePage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: TrialHistory, useValue: history },
      { provide: ProgressionHistory, useValue: progression },
    ],
  });
  const fixture = TestBed.createComponent(HighCountryTrialActivePage);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Opening the High Country Trial');
  });
  return { fixture, root, history, state };
}

function button(root: HTMLElement, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(text),
  );
  if (!found) throw new Error(`No button "${text}"`);
  return found as HTMLButtonElement;
}

describe('High Country Trial, active', () => {
  it('stays closed until Week 12 is over', async () => {
    const { root } = await render({ today: '2026-12-22' });
    expect(root.textContent).toContain(
      'The High Country Trial opens Monday, December 28, after Week 12, on any day you choose.',
    );
    expect(root.textContent).not.toContain('Begin the hike');
  });

  it('begins with the hike on any day after Week 12 with a Green check', async () => {
    const { root, history, fixture } = await render();
    expect(root.textContent).toContain('Two pieces on separate days');
    button(root, 'Begin the hike').click();
    await fixture.whenStable();
    expect(history.startDraft).toHaveBeenCalledWith(hikeDay, 'high-country-trial');
    expect(root.querySelector('.trial-phase h2')?.textContent).toContain('Pre-start plan');
    // The hike can be postponed from the plan, never failed.
    expect(button(root, 'Postpone')).toBeTruthy();
  });

  it('offers the winter stand-in on the plan, with an optional weather reason', async () => {
    const { root, fixture } = await render({ draft: hikeDraft() });
    root.querySelector<HTMLInputElement>('#trial-stand-in')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('One continuous walk of 1.5 to 2 hours, never a treadmill.');
    expect(root.querySelector('#trial-weather-reason')).not.toBeNull();
    expect(root.textContent).toContain('Route on the map');
  });

  it('holds the circuit for a later day, then opens it on a Green one', async () => {
    const sameDay = await render({ draft: hikeSaved() });
    expect(sameDay.root.textContent).toContain('The hike is done');
    expect(sameDay.root.textContent).toContain('Take the circuit on a later Green day');
    expect(sameDay.root.textContent).toContain('Within 48 hours is the target, not a rule.');
    expect(() => button(sameDay.root, 'Begin the circuit')).toThrow();
    TestBed.resetTestingModule();

    const yellow = await render({
      draft: hikeSaved(),
      today: nextDay,
      readiness: check(nextDay, { backPain: 3, status: 'yellow' }),
    });
    expect(yellow.root.textContent).toContain(
      'The circuit waits for a same-day Green · Ready check.',
    );
    TestBed.resetTestingModule();

    const { root, history, fixture } = await render({ draft: hikeSaved(), today: nextDay });
    button(root, 'Begin the circuit').click();
    await fixture.whenStable();
    expect(history.startPiece).toHaveBeenCalledWith('hc-draft', nextDay);
    expect(root.querySelector('.trial-phase h2')?.textContent).toContain('The circuit');
    expect(root.querySelectorAll('.hc-round')).toHaveLength(2);
    expect(root.querySelectorAll('.hc-station__toggle')).toHaveLength(10);
    expect(button(root, 'Stop circuit')).toBeTruthy();
    expect(() => button(root, 'Postpone')).toThrow();
  });
});
