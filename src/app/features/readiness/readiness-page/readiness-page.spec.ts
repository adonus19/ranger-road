import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { ReadinessInput } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { ReadinessPage } from './readiness-page';

function setup() {
  const recordReadiness = vi.fn(async (input: ReadinessInput) => ({
    ...input,
    id: 'readiness-1',
    checkedAt: '2026-09-25T12:00:00.000Z',
    status: 'yellow' as const,
  }));
  TestBed.configureTestingModule({
    imports: [ReadinessPage],
    providers: [
      provideRouter([]),
      {
        provide: CampaignState,
        useValue: {
          loading: signal(false),
          error: signal<string | null>(null),
          readiness: signal(null),
          today: signal('2026-09-25'),
          initialize: () => Promise.resolve(),
          recordReadiness,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ReadinessPage);
  return { fixture, recordReadiness };
}

function tap(root: HTMLElement, legend: string, value: string): void {
  const fieldset = Array.from(root.querySelectorAll('fieldset.scale')).find(
    (set) => set.querySelector('legend')?.textContent?.trim() === legend,
  );
  const radio = fieldset?.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`);
  if (!radio) {
    throw new Error(`No ${legend} option ${value}`);
  }
  radio.click();
}

describe('ReadinessPage', () => {
  it('offers one tap per answer: five energy levels and eleven levels for each pain area', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    const counts = Array.from(root.querySelectorAll('fieldset.scale'), (set) => [
      set.querySelector('legend')?.textContent?.trim(),
      set.querySelectorAll('input[type="radio"]').length,
    ]);
    expect(counts).toEqual([
      ['Energy', 5],
      ['Back', 11],
      ['Shoulder', 11],
      ['Neck', 11],
    ]);
    expect(root.querySelector('select')).toBeNull();
  });

  it('records the tapped answers as numbers', async () => {
    const { fixture, recordReadiness } = setup();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    const sleep = root.querySelector<HTMLInputElement>('#sleep-hours')!;
    sleep.value = '6.5';
    sleep.dispatchEvent(new Event('input'));
    tap(root, 'Energy', '2');
    tap(root, 'Back', '3');
    tap(root, 'Shoulder', '0');
    tap(root, 'Neck', '0');
    await fixture.whenStable();

    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();

    expect(recordReadiness).toHaveBeenCalledOnce();
    expect(root.querySelector('.saved-result__label')?.textContent?.trim()).toBe(
      'Saved for Friday, September 25',
    );
    expect(recordReadiness.mock.calls[0][0]).toMatchObject({
      date: '2026-09-25',
      sleepHours: 6.5,
      energy: 2,
      backPain: 3,
      shoulderPain: 0,
      neckPain: 0,
    });
  });
});
