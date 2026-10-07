import { computed, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, TrialResult } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { ForgeSessionPage } from '../forge-session-page/forge-session-page';
import { ForgePage } from './forge-page';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

const completedTrial: TrialResult = {
  id: 'gate-result-1',
  trialId: 'gate-trial',
  date: '2026-10-31',
  phaseResults: [],
  reflection: '',
};

// A Monday Gate Trial pass on Nov 2 starts Chapter II on Tuesday (Weeks 5–8); a Monday
// Three-Mile Trial pass on Nov 30 ends it, and Chapter III is not in the app yet.
const gatePass: TrialResult = { ...completedTrial, date: '2026-11-02' };
const threeMilePass: TrialResult = {
  ...completedTrial,
  id: 'three-mile-result-1',
  trialId: 'three-mile-trial',
  date: '2026-11-30',
};

function stateFor(date: string) {
  const state = {
    campaign: signal<Campaign | null>(campaign),
    today: signal(date),
    readiness: signal(null),
    loading: signal(false),
    error: signal<string | null>(null),
    initialize: vi.fn(async () => undefined),
  };
  return {
    ...state,
    needsStartDate: computed(() => !state.campaign()),
    beforeDayOne: computed(() => false),
  };
}

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

async function render<T>(component: Type<T>, date: string, trials: TrialResult[]) {
  const history = {
    active: vi.fn(async () => undefined),
    forDate: vi.fn(async () => []),
    start: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: stateFor(date) },
      { provide: TrialHistory, useValue: { forTrial: vi.fn(async () => trials) } },
      { provide: WorkoutHistory, useValue: history },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => 'chapter-1-forge-a' } } },
      },
    ],
  });
  const fixture = TestBed.createComponent(component);
  cleanup = () => fixture.destroy();
  fixture.autoDetectChanges();
  const root = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Opening your');
  });
  return { root, history };
}

describe('Forge across chapters', () => {
  it('offers Chapter II’s workouts, not a repeated Week 4 workout, once Chapter II begins', async () => {
    const { root } = await render(ForgePage, '2026-11-03', [gatePass]);
    expect(root.textContent).toContain('Chapter II');
    expect(root.textContent).not.toContain('Chapter I complete');
    // Tuesday's walk has no workout; Chapter II's restoration stays open as needed.
    expect(root.textContent).toContain('Restoration');
    expect(root.textContent).not.toContain('Forge B');
  });

  it('offers no workout once the last chapter in the app is complete', async () => {
    const { root } = await render(ForgePage, '2026-12-01', [gatePass, threeMilePass]);
    expect(root.textContent).toContain('Chapter II complete');
    expect(root.querySelector('.choice-list')).toBeNull();
  });

  it('blocks a direct workout route after completion', async () => {
    const { root, history } = await render(ForgeSessionPage, '2026-12-01', [
      gatePass,
      threeMilePass,
    ]);
    expect(root.textContent).toContain('Chapter II complete');
    expect(root.textContent).not.toContain('Start Forge A');
    expect(history.start).not.toHaveBeenCalled();
  });

  it('gives an attempt day to the Gate Trial and keeps Restoration as needed', async () => {
    const { root } = await render(ForgePage, '2026-11-02', []);
    expect(root.textContent).not.toContain('Forge A');
    expect(root.textContent).toContain('Restoration');
    expect(root.querySelector('.choice-list')).not.toBeNull();
  });
});
