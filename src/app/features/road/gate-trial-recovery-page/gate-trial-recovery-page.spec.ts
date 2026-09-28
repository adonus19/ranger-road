import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import type { PostMissionFunction, TrialResult } from '../../../core/domain/models';
import { createPostMissionFunction, type RecoveryInput } from '../../../core/domain/post-mission-function';
import { TrialHistory } from '../../../core/state/trial-history';
import { GateTrialRecoveryPage } from './gate-trial-recovery-page';

function completedTrial(minutesAgo: number): TrialResult {
  const effortEndedAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return {
    id: 'gate-result',
    trialId: 'gate-trial',
    date: '2026-10-03',
    recordedAt: effortEndedAt,
    phaseResults: [
      { phaseId: 'brisk-walk' },
      { phaseId: 'controlled-circuit', metrics: { effortEndedAt } },
      { phaseId: 'mind-reflection' },
      { phaseId: 'psalm-and-prayer' },
      { phaseId: 'rangers-oath' },
    ],
    reflection: 'I stayed steady.',
  };
}

async function open(
  result: TrialResult,
  options: {
    recovery?: PostMissionFunction;
    addRecovery?: (input: RecoveryInput) => Promise<PostMissionFunction>;
    url?: string;
  } = {},
) {
  const forTrial = vi.fn(async () => [result]);
  const recoveries = vi.fn(async () => options.recovery ? [options.recovery] : []);
  const addRecovery = vi.fn(options.addRecovery ?? (async (input: RecoveryInput) =>
    createPostMissionFunction(result, input)));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'road/gate-trial/recovery/:resultId', component: GateTrialRecoveryPage }]),
      { provide: TrialHistory, useValue: { forTrial, recoveries, addRecovery } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(options.url ?? `/road/gate-trial/recovery/${result.id}`);
  await settle(harness);
  return { harness, root: harness.routeNativeElement as HTMLElement, forTrial, recoveries, addRecovery };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await harness.fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  harness.fixture.detectChanges();
  await harness.fixture.whenStable();
}

function choose(root: HTMLElement, area: number, value: string): void {
  root.querySelectorAll<HTMLFieldSetElement>('fieldset.segments')[area]
    .querySelector<HTMLInputElement>(`input[value="${value}"]`)!.click();
}

async function save(root: HTMLElement, harness: RouterTestingHarness): Promise<void> {
  root.querySelector<HTMLButtonElement>('button.save-button')!.click();
  await settle(harness);
}

describe('GateTrialRecoveryPage', () => {
  it('waits until 60 minutes after physical effort before offering the check', async () => {
    const { root, forTrial, addRecovery } = await open(completedTrial(30), {
      url: '/road/gate-trial/recovery/gate-result?from=keep',
    });

    expect(forTrial).toHaveBeenCalledWith('gate-trial');
    expect(root.querySelector('h1')?.textContent).toBe('Recovery check');
    expect(root.querySelector('.back-link')?.textContent?.trim()).toBe('Back to Keep');
    expect(root.querySelector('.back-link')?.getAttribute('href')).toBe('/keep');
    expect(root.textContent).toContain('Opens at');
    expect(root.querySelector('form')).toBeNull();
    expect(addRecovery).not.toHaveBeenCalled();
  });

  it('saves all five plain-language answers and an optional note once the check opens', async () => {
    const result = completedTrial(90);
    const { harness, root, addRecovery } = await open(result);
    expect(root.querySelectorAll('fieldset.segments')).toHaveLength(5);

    choose(root, 0, 'steady');
    choose(root, 1, 'a-little');
    choose(root, 2, 'calm');
    choose(root, 3, 'fully');
    choose(root, 4, 'partly');
    const note = root.querySelector<HTMLTextAreaElement>('#recovery-note')!;
    note.value = 'Present at dinner.';
    note.dispatchEvent(new Event('input'));
    await save(root, harness);

    expect(addRecovery).toHaveBeenCalledOnce();
    expect(addRecovery.mock.calls[0][0]).toMatchObject({
      trialResultId: result.id,
      energy: 'steady',
      soreness: 'a-little',
      irritability: 'calm',
      helpAtHome: 'fully',
      familyLife: 'partly',
      note: 'Present at dinner.',
    });
    expect(root.querySelector('#recovery-saved-title')?.textContent).toBe('Recovery check saved');
    expect(root.querySelector('form')).toBeNull();
    expect(root.textContent).toContain('Present at dinner.');
  });

  it('shows an existing linked check without offering another save', async () => {
    const result = completedTrial(100);
    const saved = createPostMissionFunction(result, {
      id: 'recovery-1',
      trialResultId: result.id,
      energy: 'good',
      soreness: 'not-sore',
      irritability: 'calm',
      helpAtHome: 'fully',
      familyLife: 'fully',
    });
    const { root, addRecovery } = await open(result, { recovery: saved });

    expect(root.querySelector('#recovery-saved-title')?.textContent).toBe('Recovery check saved');
    expect(root.querySelector('form')).toBeNull();
    expect(root.textContent).toContain('Good');
    expect(root.textContent).toContain('Not sore');
    expect(addRecovery).not.toHaveBeenCalled();
  });

  it('keeps incomplete answers local and reports a storage failure without claiming a save', async () => {
    const result = completedTrial(90);
    const addRecovery = vi.fn(async (_input: RecoveryInput): Promise<PostMissionFunction> => {
      throw new Error('Local storage is unavailable');
    });
    const { harness, root } = await open(result, { addRecovery });

    await save(root, harness);
    expect(addRecovery).not.toHaveBeenCalled();
    expect(root.querySelectorAll('.field-error')).toHaveLength(5);

    choose(root, 0, 'steady');
    choose(root, 1, 'a-little');
    choose(root, 2, 'calm');
    choose(root, 3, 'fully');
    choose(root, 4, 'partly');
    await save(root, harness);

    expect(addRecovery).toHaveBeenCalledOnce();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Local storage is unavailable');
    expect(root.querySelector('#recovery-saved-title')).toBeNull();
    expect(root.querySelector('form')).not.toBeNull();
  });
});
