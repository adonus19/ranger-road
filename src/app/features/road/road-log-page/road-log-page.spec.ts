import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { RoadLogPage } from './road-log-page';

const today = '2026-09-26';

async function open(url = '/road/log', lastTerrain?: string) {
  const add = vi.fn(async (_session: SavedRoadSession): Promise<void> => undefined);
  const recent = vi.fn(async (): Promise<SavedRoadSession[]> =>
    lastTerrain
      ? [
          {
            id: 'road-earlier',
            date: '2026-09-24',
            distance: 1.8,
            duration: 36,
            terrain: lastTerrain,
            rpe: 5,
          },
        ]
      : [],
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'road/log', component: RoadLogPage }]),
      {
        provide: CampaignState,
        useValue: { today: signal(today), initialize: vi.fn(async () => undefined) },
      },
      { provide: RoadHistory, useValue: { recent, add } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await settle(harness);
  return { harness, root: harness.routeNativeElement as HTMLElement, add, recent };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await harness.fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  harness.fixture.detectChanges();
  await harness.fixture.whenStable();
}

function type(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function pick(root: HTMLElement, group: string, value: string): void {
  root.querySelector<HTMLInputElement>(`${group} input[value="${value}"]`)!.click();
}

async function save(root: HTMLElement, harness: RouterTestingHarness): Promise<void> {
  root.querySelector<HTMLButtonElement>('button.save-button')!.click();
  await settle(harness);
}

describe('RoadLogPage', () => {
  it('offers an optional interval timer that the person sets up themselves', async () => {
    const { root } = await open();

    const timer = root.querySelector('app-interval-timer details') as HTMLDetailsElement;
    expect(timer.textContent).toContain('Interval timer (optional)');
    expect(timer.open).toBe(false);
    expect(root.querySelectorAll('.timer__fields input')).toHaveLength(3);
    // The walk can be logged without ever touching the timer.
    expect(root.querySelector('.log-form')).not.toBeNull();
  });

  it('saves a walk for today in the units entered and keeps the last terrain as the default', async () => {
    const { harness, root, add } = await open('/road/log', 'Gravel trail');

    expect(root.querySelector('.back-link')?.textContent?.trim()).toBe('Back to Road');
    expect(root.querySelector<HTMLInputElement>('#walk-terrain')!.value).toBe('Gravel trail');
    expect(root.querySelector<HTMLInputElement>('.segments input[value="today"]')!.checked).toBe(
      true,
    );

    type(root, '#walk-miles', '2.1');
    type(root, '#walk-minutes', '41');
    pick(root, '.scale__options--effort', '6');
    await save(root, harness);

    expect(add).toHaveBeenCalledOnce();
    const session = add.mock.calls[0][0];
    expect(session).toMatchObject({
      date: today,
      distance: 2.1,
      duration: 41,
      terrain: 'Gravel trail',
      rpe: 6,
    });
    expect(session).not.toHaveProperty('painBefore');
    expect(session).not.toHaveProperty('painAfter');
    expect(root.querySelector('#saved-title')?.textContent).toBe('Walk saved');
    expect(root.querySelector('.saved__date')?.textContent).toBe('Saturday, September 26');
    expect(
      Array.from(root.querySelectorAll('.saved__summary .line'), (line) => line.textContent),
    ).toEqual(['2.1 mi · 41 min', 'Gravel trail · Effort 6']);
    expect(document.activeElement?.id).toBe('saved-title');
  });

  it('opens from Today’s Mission on the mission’s date and returns there', async () => {
    const { harness, root, add } = await open(
      '/road/log?date=2026-09-25&from=mission',
      'Paved path',
    );

    const back = root.querySelector<HTMLAnchorElement>('.back-link')!;
    expect(back.textContent?.trim()).toBe('Back to Today’s Mission');
    expect(back.getAttribute('href')).toBe('/keep/mission');
    expect(
      root.querySelector<HTMLInputElement>('.segments input[value="yesterday"]')!.checked,
    ).toBe(true);

    type(root, '#walk-miles', '1.5');
    type(root, '#walk-minutes', '30');
    pick(root, '.scale__options--effort', '4');
    await save(root, harness);

    expect(add.mock.calls[0][0]).toMatchObject({ date: '2026-09-25', terrain: 'Paved path' });
  });

  it('saves nothing until the required answers are in and the date is not in the future', async () => {
    const { harness, root, add } = await open();

    await save(root, harness);
    expect(add).not.toHaveBeenCalled();
    expect(root.querySelector('.save-error')?.textContent?.trim()).toBe(
      'Check the miles, minutes, terrain, and effort above, then save again.',
    );
    const miles = root.querySelector<HTMLInputElement>('#walk-miles')!;
    expect(miles.getAttribute('aria-invalid')).toBe('true');
    expect(miles.getAttribute('aria-describedby')).toBe('walk-miles-error');
    expect(root.querySelector('#walk-miles-error')?.textContent?.trim()).toBe(
      'Enter the miles you walked.',
    );
    expect(document.activeElement).toBe(miles);
    expect(root.textContent).toContain('Enter the miles you walked.');
    expect(root.textContent).toContain('Enter the minutes you walked.');
    expect(root.textContent).toContain('Describe the ground, such as paved path or trail.');
    expect(root.textContent).toContain('Choose an effort from 1 to 10.');

    pick(root, '.segments', 'other');
    await settle(harness);
    type(root, '#walk-date', '2026-09-27');
    type(root, '#walk-miles', '3');
    type(root, '#walk-minutes', '41.5');
    type(root, '#walk-terrain', '  Trail  ');
    pick(root, '.scale__options--effort', '5');
    await save(root, harness);
    expect(add).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Choose today or an earlier date.');
    expect(root.textContent).toContain('Enter whole minutes above zero.');
    expect(root.querySelector('.save-error')?.textContent?.trim()).toBe(
      'Check the date and minutes above, then save again.',
    );
    expect(root.querySelector<HTMLInputElement>('#walk-date')!.max).toBe(today);

    type(root, '#walk-date', '2026-09-20');
    type(root, '#walk-minutes', '55');
    await save(root, harness);
    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date: '2026-09-20',
      distance: 3,
      duration: 55,
      terrain: 'Trail',
    });
  });

  it('records optional pain before and after, and clears it when the section is removed', async () => {
    const { harness, root, add } = await open('/road/log', 'Trail');
    const toggle = root.querySelector<HTMLButtonElement>('.pain-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await settle(harness);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const [before, after] = root.querySelectorAll('.pain .scale__options--pain');
    before.querySelector<HTMLInputElement>('input[value="2"]')!.click();
    after.querySelector<HTMLInputElement>('input[value="3"]')!.click();

    toggle.click();
    await settle(harness);
    expect(root.querySelector('.pain .scale')).toBeNull();
    toggle.click();
    await settle(harness);
    const [beforeAgain, afterAgain] = root.querySelectorAll('.pain .scale__options--pain');
    expect(beforeAgain.querySelector<HTMLInputElement>('input:checked')).toBeNull();

    beforeAgain.querySelector<HTMLInputElement>('input[value="2"]')!.click();
    afterAgain.querySelector<HTMLInputElement>('input[value="3"]')!.click();
    type(root, '#walk-miles', '2');
    type(root, '#walk-minutes', '40');
    pick(root, '.scale__options--effort', '5');
    await save(root, harness);

    expect(add.mock.calls[0][0]).toMatchObject({ painBefore: 2, painAfter: 3 });
    expect(root.querySelector('.saved__pain')?.textContent).toBe('Pain 2 before, 3 after');
  });

  it('starts a fresh entry after saving, keeping the terrain just used', async () => {
    const { harness, root } = await open('/road/log');

    type(root, '#walk-miles', '2');
    type(root, '#walk-minutes', '40');
    type(root, '#walk-terrain', 'Neighborhood loop');
    pick(root, '.scale__options--effort', '5');
    await save(root, harness);

    root.querySelector<HTMLButtonElement>('.saved .secondary-button')!.click();
    await settle(harness);
    expect(root.querySelector<HTMLInputElement>('#walk-miles')!.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#walk-terrain')!.value).toBe('Neighborhood loop');
  });
});
