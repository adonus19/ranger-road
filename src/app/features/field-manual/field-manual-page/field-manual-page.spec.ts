import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app.routes';
import type { Campaign } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-1',
  status: 'active',
};

async function open(url: string) {
  const state = {
    campaign: signal<Campaign | null>(campaign),
    today: signal('2026-10-12'),
    loading: signal(false),
    initialize: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: CampaignState, useValue: state },
      { provide: TrialHistory, useValue: { forTrial: vi.fn(async () => []) } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await vi.waitFor(() => {
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toMatch(
      /Opening (this week’s pages|the contents)/,
    );
  });
  return { harness, state };
}

describe('Field Manual routes', () => {
  it('opens This week with the selected tab and the five Week 2 entries', async () => {
    const { harness } = await open('/field-manual');
    const root = harness.routeNativeElement!;
    const views = [...root.querySelectorAll<HTMLAnchorElement>('.views__option')];
    expect(views.map((item) => [item.textContent?.trim(), item.getAttribute('href')])).toEqual([
      ['This week', '/field-manual'],
      ['Contents', '/field-manual/contents'],
      ['Index', '/field-manual/index'],
    ]);
    expect(views[0].getAttribute('aria-current')).toBe('page');
    expect(root.querySelectorAll('.this-week .row')).toHaveLength(5);
    expect(
      root.querySelector<HTMLAnchorElement>('.row[href*="scripture"]')?.getAttribute('href'),
    ).toBe('/field-manual/scripture#week-2-day-1');
  });

  it('switches to Contents and opens its week-specific entries', async () => {
    const { harness } = await open('/field-manual/contents');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('.contents h2')?.textContent).toContain('Chapter I · The Muster');
    expect(
      root.querySelector<HTMLAnchorElement>(
        'a[href="/field-manual/cards/tool-inspection?from=contents"]',
      ),
    ).not.toBeNull();
    expect(root.querySelector('.views__option[aria-current="page"]')?.textContent?.trim()).toBe(
      'Contents',
    );
  });

  it('searches the Index and opens a field card', async () => {
    const { harness } = await open('/field-manual/index');
    const root = harness.routeNativeElement!;
    const search = root.querySelector<HTMLInputElement>('#manual-search')!;
    search.value = 'bowline';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(root.querySelectorAll('.group__entries .entry')).toHaveLength(1);
    expect(
      root.querySelector<HTMLAnchorElement>('.group__entries .entry')?.getAttribute('href'),
    ).toBe('/field-manual/cards/bowline?from=index');
  });

  it('lets a keyboard user jump through the Index letters', async () => {
    const { harness } = await open('/field-manual/index');
    const root = harness.routeNativeElement!;
    const rail = root.querySelector<HTMLElement>('.rail')!;
    const lastLetter = root.querySelector('.group:last-child .group__letter')?.textContent?.trim();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    rail.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    harness.detectChanges();
    expect(rail.getAttribute('aria-valuetext')).toBe(lastLetter);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('opens a suggested book result at its mention in the lesson', async () => {
    const { harness } = await open('/field-manual/index');
    const root = harness.routeNativeElement!;
    const search = root.querySelector<HTMLInputElement>('#manual-search')!;
    search.value = 'Extreme Ownership';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    const link = root.querySelector<HTMLAnchorElement>('.group__entries .entry')!;
    expect(link.getAttribute('href')).toBe(
      '/field-manual/lessons/keep-small-promises?from=index#book-extreme-ownership',
    );
    await harness.navigateByUrl(link.getAttribute('href')!);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('#book-extreme-ownership')).not.toBeNull();
  });

  it('marks the upcoming week before Day 1 without claiming the first book is current', async () => {
    const { harness, state } = await open('/field-manual/index');
    state.today.set('2026-09-29');
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    expect(root.querySelector('.filter[aria-pressed="false"]')?.textContent).toBeTruthy();
    expect(root.textContent).toContain('Week ahead');
    await harness.navigateByUrl('/field-manual/reading');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Chapter I book');
    expect(harness.routeNativeElement?.textContent).not.toContain('Now reading');
  });

  it('keeps the Week 4 Forge B deload beside the standard exercise list', async () => {
    const { harness, state } = await open('/field-manual/exercises');
    state.today.set('2026-10-29');
    harness.detectChanges();
    const forgeB = harness.routeNativeElement!.querySelector('#chapter-1-forge-b')!;
    expect(forgeB.querySelector('.manual-note')?.textContent).toContain(
      'around 15 of 20 work sets',
    );
    expect(forgeB.querySelector('.manual-note')?.textContent).toContain('standard plan');
  });
});
