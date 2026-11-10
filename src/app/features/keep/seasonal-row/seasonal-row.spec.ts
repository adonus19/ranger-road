import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CampaignState } from '../../../core/state/campaign-state';
import { DayProgress } from '../../../core/state/day-progress';
import { SeasonalRow } from './seasonal-row';

function setup(today: string, done: string[] = []) {
  const checks = signal(new Set<string>(done));
  const setDone = vi.fn(async (_date: string, item: string, on: boolean) => {
    checks.update((current) => {
      const next = new Set(current);
      if (on) next.add(item);
      else next.delete(item);
      return next;
    });
  });
  TestBed.configureTestingModule({
    imports: [SeasonalRow],
    providers: [
      { provide: CampaignState, useValue: { today: signal(today) } },
      { provide: DayProgress, useValue: { isDone: (item: string) => checks().has(item), setDone } },
    ],
  });
  const fixture = TestBed.createComponent(SeasonalRow);
  fixture.autoDetectChanges();
  return { fixture, setDone, root: fixture.nativeElement as HTMLElement };
}

describe('SeasonalRow', () => {
  it('shows nothing on an ordinary day', async () => {
    const { fixture, root } = setup('2026-11-10');
    await fixture.whenStable();
    expect(root.textContent?.trim()).toBe('');
  });

  it('shows Advent 2 with its reading and question, and Done can be undone the same day', async () => {
    const { fixture, root, setDone } = setup('2026-12-06');
    await fixture.whenStable();
    expect(root.textContent).toContain('Advent 2 · Peace');
    expect(root.textContent).toContain('Isaiah 40:1–11');
    expect(root.textContent).toContain('When have you felt carried?');

    const button = root.querySelector('button')!;
    expect(button.textContent?.trim()).toBe('Done');
    button.click();
    await fixture.whenStable();
    expect(setDone).toHaveBeenCalledWith('2026-12-06', 'seasonal', true);
    expect(button.textContent?.trim()).toBe('Undo');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    await fixture.whenStable();
    expect(setDone).toHaveBeenLastCalledWith('2026-12-06', 'seasonal', false);
    expect(button.textContent?.trim()).toBe('Done');
  });

  it('shows both readings with one Done when Advent 4 is Christmas Eve', async () => {
    const { fixture, root } = setup('2028-12-24');
    await fixture.whenStable();
    expect(root.textContent).toContain('Advent 4 · Love');
    expect(root.textContent).toContain('Matthew 1:18–25');
    expect(root.textContent).toContain('Christmas Eve');
    expect(root.textContent).toContain('Luke 2:1–20');
    expect(root.textContent).toContain('One unhurried, phone-free family evening.');
    expect(root.querySelectorAll('button')).toHaveLength(1);
  });

  it('keeps no tally or count of seasonal days', async () => {
    const { fixture, root } = setup('2026-12-25', ['seasonal']);
    await fixture.whenStable();
    expect(root.textContent).toContain('Christmas Day');
    expect(root.textContent).not.toMatch(/\d+\s*(of|\/)\s*\d+|streak|missed/i);
  });
});
