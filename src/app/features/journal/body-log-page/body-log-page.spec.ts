import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { BodyLogPage } from './body-log-page';

describe('BodyLogPage', () => {
  it('saves a weight or a waist on any day, and asks for one when both are blank', async () => {
    const add = vi.fn(async (_entry: SavedMeasurement): Promise<void> => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'journal/body', component: BodyLogPage }]),
        { provide: CampaignState, useValue: { today: signal('2026-10-14'), initialize: async () => undefined } },
        { provide: MeasurementHistory, useValue: { add } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/journal/body');
    const root = harness.routeNativeElement as HTMLElement;
    const settle = async () => {
      await harness.fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();
    };
    await settle();

    root.querySelector<HTMLButtonElement>('button.save-button')!.click();
    await settle();
    expect(add).not.toHaveBeenCalled();
    expect(root.querySelector('#weight-error')?.textContent?.trim()).toBe('Enter a weight, a waist, or both.');

    const waist = root.querySelector<HTMLInputElement>('#waist')!;
    waist.value = '41';
    waist.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('button.save-button')!.click();
    await settle();

    const entry = add.mock.calls[0][0];
    expect(entry).toMatchObject({ kind: 'body', date: '2026-10-14', waist: 41 });
    expect(entry).not.toHaveProperty('weight');
    expect(root.querySelector('#saved-title')?.textContent).toBe('Weight and waist saved');
  });
});
