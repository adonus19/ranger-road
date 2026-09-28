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

describe('Forge after Chapter I', () => {
  it('offers no repeated Week 4 workout after four weeks and a completed trial', async () => {
    const { root } = await render(ForgePage, '2026-11-02', [completedTrial]);
    expect(root.textContent).toContain('Chapter I complete');
    expect(root.querySelector('.choice-list')).toBeNull();
  });

  it('blocks a direct workout route after completion', async () => {
    const { root, history } = await render(ForgeSessionPage, '2026-11-02', [completedTrial]);
    expect(root.textContent).toContain('Chapter I complete');
    expect(root.textContent).not.toContain('Start Forge A');
    expect(history.start).not.toHaveBeenCalled();
  });

  it('continues the Week 4 template while the Gate Trial is pending', async () => {
    const { root } = await render(ForgePage, '2026-11-02', []);
    expect(root.textContent).toContain('Forge A');
    expect(root.querySelector('.choice-list')).not.toBeNull();
  });
});
