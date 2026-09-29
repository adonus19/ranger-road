import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign, ReadinessCheck, TrialDraft, TrialPhaseResult, TrialResult } from '../../../core/domain/models';
import { gateTrialDefinition } from '../../../core/program/chapter-one-trial.seed';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { GateTrialActivePage } from './gate-trial-active-page';

// Monday, Sep 28 is the first Gate Trial attempt for a campaign that began Monday, Aug 31.
const date = '2026-09-28';
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-08-31',
  currentChapterId: 'chapter-1',
  status: 'active',
};
const readiness: ReadinessCheck = {
  id: 'readiness-green',
  date,
  checkedAt: '2026-09-28T10:00:00.000Z',
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
};

function draftAt(phase: number): TrialDraft {
  const phases: TrialPhaseResult[] = gateTrialDefinition.phases.map((item) => ({ phaseId: item.id }));
  if (phase > 0) {
    phases[0] = {
      phaseId: 'brisk-walk',
      metrics: { distanceMiles: 2, durationMinutes: 36, rpe: 6 },
      responses: { knee: 'Stable', back: 'Stable', recoveryAfterFiveMinutes: 'Breathing settled' },
    };
  }
  if (phase > 1) {
    phases[1] = {
      phaseId: 'controlled-circuit',
      metrics: { restAfterWalkMinutes: 6, durationMinutes: 25, roundsCompleted: 3 },
      circuitRounds: [1, 2, 3].map((round) => ({
        round,
        movements: gateTrialDefinition.phases[1].circuit!.movements.map((movement) => ({
          exerciseId: movement.exerciseId,
          ...(movement.reps !== undefined
            ? movement.perSide
              ? { repsBySide: { left: movement.reps, right: movement.reps } }
              : { reps: movement.reps }
            : movement.perSide
              ? { durationSecondsBySide: { left: movement.durationSeconds!, right: movement.durationSeconds! } }
              : { durationSeconds: movement.durationSeconds! }),
        })),
      })),
    };
  }
  if (phase > 2) {
    phases[2] = {
      phaseId: 'mind-reflection',
      responses: { body: 'Move deliberately', character: 'Stay patient', family: 'Be present' },
    };
  }
  if (phase > 3) {
    phases[3] = {
      phaseId: 'psalm-and-prayer',
      metrics: { confirmed: true, prayerMinutes: 12 },
      responses: { identity: 'A steady husband and father' },
    };
    phases[4] = { phaseId: 'rangers-oath', notes: 'I will keep my word and serve my family.' };
  }
  return {
    id: 'trial-draft-1',
    trialId: 'gate-trial',
    date,
    readinessId: readiness.id,
    startedAt: '2026-09-28T10:30:00.000Z',
    updatedAt: '2026-09-28T10:31:00.000Z',
    revision: 1,
    currentPhaseIndex: phase,
    definitionSnapshot: structuredClone(gateTrialDefinition),
    phaseResults: phases,
    painEvents: [],
  };
}

async function render(
  options: { draft?: TrialDraft; check?: ReadinessCheck | null; today?: string; completed?: TrialResult[] } = {},
) {
  const state = {
    campaign: signal<Campaign | null>(campaign),
    readiness: signal<ReadinessCheck | null>(options.check === undefined ? readiness : options.check),
    today: signal(options.today ?? date),
    loading: signal(false),
    error: signal<string | null>(null),
    beforeDayOne: computed(() => false),
    initialize: vi.fn(async () => undefined),
  };
  const history = {
    activeDraft: vi.fn(async () => options.draft),
    forTrial: vi.fn(async () => options.completed ?? []),
    startDraft: vi.fn(async () => draftAt(0)),
    saveDraft: vi.fn(async (edited: TrialDraft) => ({ ...edited, revision: edited.revision + 1 })),
    recordPain: vi.fn(async () => undefined),
    finishDraft: vi.fn(async () => ({ ...draftAt(4), outcome: 'stopped' as const, stoppedAt: '2026-09-28T12:00:00.000Z' })),
  };
  TestBed.configureTestingModule({
    imports: [GateTrialActivePage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: TrialHistory, useValue: history },
    ],
  });
  const fixture = TestBed.createComponent(GateTrialActivePage);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Opening the Gate Trial from this device');
  });
  return { fixture, root, state, history };
}

describe('active Gate Trial', () => {
  it('opens only on an attempt day, and not after a pass', async () => {
    const weekFour = await render({ today: '2026-09-24' });
    expect(weekFour.root.textContent).toContain('The Gate Trial opens Monday, September 28, the Monday after Week 4.');
    expect(weekFour.root.textContent).not.toContain('Begin Gate Trial');
    TestBed.resetTestingModule();

    const tuesday = await render({ today: '2026-09-29' });
    expect(tuesday.root.textContent).toContain('The next attempt is Thursday, October 1.');
    expect(tuesday.history.startDraft).not.toHaveBeenCalled();
    TestBed.resetTestingModule();

    const passed = await render({
      completed: [{ id: 'gate-passed', trialId: 'gate-trial', date, phaseResults: [], reflection: '' }],
    });
    expect(passed.root.textContent).toContain('You passed the Gate Trial on Monday, September 28.');
    expect(passed.root.textContent).not.toContain('Begin Gate Trial');
  });

  it('requires a same-day Green check before starting a new trial', async () => {
    const { root, history } = await render({ check: null });
    expect(root.textContent).toContain('same-day Green · Ready check');
    expect(root.querySelector('a[href="/readiness"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Begin Gate Trial');
    expect(history.startDraft).not.toHaveBeenCalled();
  });

  it('opens the first circuit station with an empty actual field and in-screen help', async () => {
    const { root, fixture } = await render({ draft: draftAt(1) });
    expect(root.querySelectorAll('.trial-progress button')).toHaveLength(5);
    expect(root.querySelectorAll('.trial-progress button.is-complete')).toHaveLength(1);
    expect(root.querySelector('.trial-station h3')?.textContent).toContain('Box Squat');
    expect(root.querySelector('.trial-dose')?.textContent).toContain('10');
    expect((root.querySelector('.trial-station-form input[type="number"]') as HTMLInputElement).value).toBe('');
    expect(root.querySelector('.trial-dock .trial-primary')?.textContent).toContain('Save station and continue');
    const help = root.querySelector('.trial-help-button') as HTMLButtonElement;
    help.click();
    fixture.detectChanges();
    expect(root.textContent).toContain('Box Squat · Quick Help');
    expect(root.querySelector('.trial-help img[alt^="Neck-down"]')).not.toBeNull();
    expect(root.querySelector('.trial-utility')?.textContent).toContain('Record pain');
    expect(root.querySelector('.trial-utility')?.textContent).toContain('Stop trial');
  });

  it('saves trial pain immediately and keeps the partial stop path available', async () => {
    const partial = draftAt(1);
    const { root, fixture, history } = await render({ draft: partial });
    history.activeDraft.mockResolvedValueOnce({
      ...partial,
      painEvents: [{
        id: 'pain-1',
        timestamp: '2026-09-28T11:00:00.000Z',
        bodyArea: 'Back',
        severity: 3,
        actionTaken: 'reduce',
      }],
    });
    (root.querySelector('.trial-utility button') as HTMLButtonElement).click();
    fixture.detectChanges();
    root.querySelector<HTMLInputElement>('.trial-pain .segments input[value="Back"]')!.click();
    root.querySelector<HTMLInputElement>('.trial-pain .scale__options--pain input[value="3"]')!.click();
    root.querySelector<HTMLInputElement>('.trial-pain .segments input[value="reduce"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    (root.querySelector('.trial-pain form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(history.recordPain).toHaveBeenCalledWith('trial-draft-1', {
        phaseId: 'controlled-circuit',
        bodyArea: 'Back',
        severity: 3,
        actionTaken: 'reduce',
        exerciseId: 'box-squat',
      });
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.textContent).toContain('Pain or a reduced response changed this attempt');
    });
    const stop = [...root.querySelectorAll('.trial-utility button')].find((button) =>
      button.textContent?.includes('Stop trial'),
    ) as HTMLButtonElement;
    stop.click();
    fixture.detectChanges();
    // Stopping asks first; nothing is finished until the second tap.
    expect(root.querySelector('.trial-confirm')?.textContent).toContain('Stop the Gate Trial?');
    expect(history.finishDraft).not.toHaveBeenCalled();
    const confirm = [...root.querySelectorAll('.trial-confirm button')].find((button) =>
      button.textContent?.includes('Stop trial'),
    ) as HTMLButtonElement;
    confirm.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('#stopped-title')?.textContent).toBe('Trial stopped');
    });
    expect(history.finishDraft).toHaveBeenCalledWith('trial-draft-1', 'stopped');
  });

  it('names the missing entry and marks its field when a phase is incomplete', async () => {
    const partial = draftAt(0);
    const { root, fixture, history } = await render({ draft: partial });
    root.querySelector<HTMLInputElement>('#trial-full-walk')!.click();
    await fixture.whenStable();
    (root.querySelector('.trial-dock .trial-primary') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('.trial-dock [role="alert"]')?.textContent).toContain(
        'Enter your walk time in minutes.',
      );
    });
    expect(root.querySelector('#trial-walk-minutes')?.getAttribute('aria-invalid')).toBe('true');
    expect(history.saveDraft).toHaveBeenCalled();
  });

  it('keeps Keep going as the way out of the stop question', async () => {
    const { root, fixture, history } = await render({ draft: draftAt(2) });
    (root.querySelector('.trial-stop') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('#trial-stop-keep') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.trial-confirm')).toBeNull();
    expect(root.querySelector('.trial-stop')).not.toBeNull();
    expect(history.finishDraft).not.toHaveBeenCalled();
  });

  it('marks the end of physical effort when advancing from the completed circuit', async () => {
    const { root, fixture, history } = await render({ draft: draftAt(2) });
    const before = Date.now();
    root.querySelector<HTMLButtonElement>('.trial-progress button[aria-label^="Part 2"]')!.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('#trial-all-stations')).not.toBeNull();
    });
    root.querySelector<HTMLButtonElement>('.trial-dock .trial-primary')!.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      const writes = history.saveDraft.mock.calls.map(([draft]) => draft);
      const marked = writes.find((draft) => draft.phaseResults[1].metrics?.['effortEndedAt']);
      expect(marked).toBeDefined();
      const time = Date.parse(marked!.phaseResults[1].metrics!['effortEndedAt'] as string);
      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(Date.now());
    });
  });

  it('names a later Yellow check instead of asking for a check that exists', async () => {
    const { root } = await render({
      draft: draftAt(1),
      check: { ...readiness, id: 'readiness-yellow', backPain: 4, status: 'yellow' },
    });
    expect(root.querySelector('.trial-hold')?.textContent).toContain(
      'Today’s latest readiness check is Yellow · Reduce',
    );
  });

  it('reviews recorded station values before allowing a completed result', async () => {
    const { root, fixture, history } = await render({ draft: draftAt(4) });
    expect((root.querySelector('textarea') as HTMLTextAreaElement).value).toContain('I will keep my word');
    (root.querySelector('.trial-dock .trial-primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('#review-title')?.textContent).toContain('Review the five parts');
    expect(root.textContent).toContain('Recovery after 5 minutes: Breathing settled');
    expect(root.textContent).toContain('A steady husband and father');
    expect(history.finishDraft).not.toHaveBeenCalled();
    const rounds = root.querySelector('.trial-review-rounds') as HTMLDetailsElement;
    rounds.open = true;
    expect(rounds.querySelectorAll('li')).toHaveLength(18);
    expect(rounds.textContent).toContain('10 reps');
  });
});
