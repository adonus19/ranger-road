import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign, ReadinessCheck, TrialDraft, TrialResult } from '../../../core/domain/models';
import { createGateTrialResult } from '../../../core/domain/trial';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { completeGateTrialInput } from '../../../core/testing/gate-trial-fixture';
import { GateTrialPage } from './gate-trial-page';

const date = '2026-10-03';
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-09-07',
  currentChapterId: 'chapter-1',
  status: 'active',
};

function readiness(status: 'green' | 'yellow' | 'red'): ReadinessCheck {
  return {
    id: `readiness-${status}`,
    date,
    checkedAt: `${date}T10:00:00.000Z`,
    sleepHours: 7,
    poorSleep: status === 'yellow',
    energy: status === 'red' ? 1 : 3,
    backPain: 0,
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

async function render(
  check: ReadinessCheck | null,
  activeCampaign: Campaign | null = campaign,
  options: { loading?: boolean; error?: string } = {},
  activeDraft: TrialDraft | null = null,
  completedResults: TrialResult[] = [],
) {
  const state = {
    campaign: signal(activeCampaign),
    readiness: signal(check),
    today: signal(date),
    loading: signal(options.loading ?? false),
    error: signal(options.error ?? null),
    beforeDayOne: computed(() => false),
    initialize: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
  const history = {
    activeDraft: vi.fn(async () => activeDraft ?? undefined),
    forTrial: vi.fn(async () => completedResults),
    stoppedForTrial: vi.fn(async () => []),
    painForAttempt: vi.fn(async () => []),
  };
  TestBed.configureTestingModule({
    imports: [GateTrialPage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: TrialHistory, useValue: history },
    ],
  });
  const fixture = TestBed.createComponent(GateTrialPage);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return { root: fixture.nativeElement as HTMLElement, state, history };
}

describe('Station Gate Trial plan', () => {
  it('shows the five ordered parts and exact controlled circuit before recording', async () => {
    const { root } = await render(null);
    expect(root.querySelector('h1')?.textContent).toBe('The Gate Trial');
    expect(root.querySelector('.station-walk__distance')?.textContent).toContain('2');
    expect(root.querySelectorAll('.station-progress a')).toHaveLength(5);
    expect(root.querySelector('.station-progress a')?.getAttribute('aria-current')).toBeNull();
    expect(root.querySelectorAll('.station-circuit li')).toHaveLength(6);
    expect(root.querySelector('.station-circuit')?.textContent).toContain(
      'Step-Up · 8 reps per side',
    );
    expect(root.querySelector('.station-circuit')?.textContent).toContain(
      'Side Plank · 20 seconds per side',
    );
    expect(root.textContent).toContain('Your entries save on this device');
    expect(root.querySelector('.station-walk__record')?.getAttribute('role')).toBe('note');
    expect(root.querySelector('form')).toBeNull();
  });

  it('names Green readiness and directs the person back to their check', async () => {
    const { root } = await render(readiness('green'));
    expect(root.textContent).toContain('Green · Ready');
    expect(root.querySelector('.station-dock a')?.getAttribute('href')).toBe('/road/gate-trial/active');
    expect(root.querySelector('.station-dock a')?.textContent).toContain('Begin the Gate Trial');
  });

  it('defers the physical trial on Yellow or Red', async () => {
    const yellow = await render(readiness('yellow'));
    expect(yellow.root.textContent).toContain('Wait for a Green day');
    expect(yellow.root.querySelector('.station-dock a')?.textContent).toContain('Review readiness');
    TestBed.resetTestingModule();
    const red = await render(readiness('red'));
    expect(red.root.textContent).toContain('Do not attempt the physical trial today.');
  });

  it('sends a person without a campaign to Keep', async () => {
    const { root } = await render(null, null);
    expect(root.textContent).toContain('Choose Day 1');
    expect(root.querySelector('.station-dock a')?.getAttribute('href')).toBe('/keep');
  });

  it('shows loading and storage failure without claiming that Day 1 was never chosen', async () => {
    const loading = await render(null, null, { loading: true });
    expect(loading.root.textContent).toContain('Opening your campaign');
    expect(loading.root.textContent).not.toContain('Choose Day 1');
    expect(loading.root.querySelector('.station-dock a')).toBeNull();
    TestBed.resetTestingModule();

    const failed = await render(null, null, { error: 'Storage failed' });
    expect(failed.root.textContent).toContain('Local storage is unavailable');
    expect(failed.root.textContent).not.toContain('Choose Day 1');
    (failed.root.querySelector('.station-dock button') as HTMLButtonElement).click();
    expect(failed.state.retry).toHaveBeenCalledOnce();
  });

  it('resumes a saved attempt even when the latest check is no longer Green', async () => {
    const { root } = await render(readiness('yellow'), campaign, {}, {
      id: 'draft-1',
      trialId: 'gate-trial',
      date,
      readinessId: 'earlier-green',
      startedAt: `${date}T09:00:00.000Z`,
      updatedAt: `${date}T09:00:00.000Z`,
      revision: 1,
      currentPhaseIndex: 0,
      definitionSnapshot: { id: 'gate-trial', chapterId: 'chapter-1', phases: [] },
      phaseResults: [],
      painEvents: [],
    });
    expect(root.querySelector('.station-dock a')?.getAttribute('href')).toBe('/road/gate-trial/active');
    expect(root.querySelector('.station-dock a')?.textContent).toContain('Resume saved trial');
    expect(root.textContent).toContain('Wait for a Green day');
  });

  it('shows the saved five-phase record in campaign history', async () => {
    const green = readiness('green');
    const result = createGateTrialResult(completeGateTrialInput(green));
    const { root } = await render(green, campaign, {}, null, [result]);
    const entry = root.querySelector('.station-history__entry') as HTMLDetailsElement;
    expect(entry.querySelector('summary')?.textContent).toContain('Completed');
    entry.open = true;
    expect(entry.textContent).toContain('36 min');
    expect(entry.textContent).toContain('Round 3');
    expect(entry.textContent).toContain('I will show up with care.');
  });
});
