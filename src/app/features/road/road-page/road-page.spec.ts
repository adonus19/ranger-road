import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign, TrialResult } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { RoadPage } from './road-page';

async function render(
  startDate: string,
  today: string,
  walks: SavedRoadSession[] = [],
  trialTargetDate?: string,
  completedTrials: TrialResult[] = [],
): Promise<HTMLElement> {
  const campaign: Campaign = {
    id: 'primary',
    startDate,
    currentChapterId: 'chapter-1',
    status: 'active',
    ...(trialTargetDate ? { trialTargetDate } : {}),
  };
  TestBed.configureTestingModule({
    imports: [RoadPage],
    providers: [
      provideRouter([]),
      {
        provide: CampaignState,
        useValue: {
          campaign: signal(campaign),
          today: signal(today),
          loading: signal(false),
          error: signal<string | null>(null),
          initialize: () => Promise.resolve(),
        },
      },
      { provide: RoadHistory, useValue: { recent: vi.fn(async () => walks) } },
      { provide: TrialHistory, useValue: { forTrial: vi.fn(async () => completedTrials) } },
    ],
  });
  const fixture = TestBed.createComponent(RoadPage);
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const completedTrial: TrialResult = {
  id: 'gate-result-1',
  trialId: 'gate-trial',
  date: '2026-10-31',
  phaseResults: [],
  reflection: '',
};

describe('RoadPage', () => {
  it('names the planned Gate Trial date and shows its phases in the documented order', async () => {
    const element = await render('2026-09-21', '2026-09-25');

    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'First attempt Monday, October 19, the Monday after Week 4. If it doesn’t go, try again that Thursday. Chapter II waits until you pass.',
    );
    expect(element.querySelector('.trial__open')?.getAttribute('href')).toBe('/road/gate-trial');
    expect(element.querySelector('ol.trial__phases')).not.toBeNull();
    expect(
      Array.from(element.querySelectorAll('.trial__phases > li summary'), (summary) =>
        summary.textContent?.trim(),
      ),
    ).toEqual([
      '2-mile brisk walk',
      '3-round controlled circuit',
      'Mind reflection',
      'Psalm 121 + prayer',
      "Write personal Ranger's Oath",
    ]);
    const circuit = element.querySelectorAll<HTMLDetailsElement>('.trial__phases details')[1];
    circuit.open = true;
    expect(circuit.textContent).toContain('Rest 5–10 minutes after the walk.');
    expect(circuit.textContent).toContain('Assisted Pull-Up · 5 reps');
    expect(circuit.textContent).toContain('Step-Up · 8 reps per side');
    expect(circuit.textContent).toContain('Side Plank · 20 seconds per side');
  });

  it('names the next attempt once the first has gone by', async () => {
    const element = await render('2026-08-20', '2026-09-25');

    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Next attempt Monday, September 28. Chapter II waits until you pass.',
    );
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toContain(
      'A 4-day lead-in ends before Week 1 begins on day 5. Gate Trial target on day 33.',
    );
  });

  it('keeps the attempt rule even when an older campaign saved a different target date', async () => {
    const element = await render('2026-09-21', '2026-09-25', [], '2026-10-24');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toContain(
      'First attempt Monday, October 19',
    );
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toContain(
      'Gate Trial target on day 29.',
    );
    expect(element.querySelector('.route__target-label')?.textContent?.trim()).toBe('Gate Trial');
  });

  it('offers the walk log and lists the most recent walks', async () => {
    const element = await render('2026-09-21', '2026-09-26', [
      {
        id: 'road-b',
        date: '2026-09-26',
        distance: 2.1,
        duration: 41,
        terrain: 'Gravel trail',
        rpe: 6,
      },
      {
        id: 'road-a',
        date: '2026-09-24',
        distance: 1.8,
        duration: 36,
        terrain: 'Paved path',
        rpe: 5,
      },
    ]);

    expect(element.querySelector('.walks__log')?.getAttribute('href')).toBe('/road/log');
    expect(
      Array.from(element.querySelectorAll('.walks__list li'), (li) => [
        li.querySelector('strong')?.textContent?.trim(),
        li.querySelector('span')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['Sat, Sep 26', '2.1 mi · 41 min · Gravel trail · Effort 6'],
      ['Thu, Sep 24', '1.8 mi · 36 min · Paved path · Effort 5'],
    ]);
  });

  it('says where walks will appear before any are logged', async () => {
    const element = await render('2026-09-21', '2026-09-26');

    expect(element.querySelector('.walks__list')).toBeNull();
    expect(element.querySelector('.walks__state')?.textContent?.trim()).toBe(
      'Walks you log will appear here.',
    );
  });

  it('keeps Chapter I current through Week 4 Sunday after an older early pass', async () => {
    const element = await render('2026-10-05', '2026-11-01', [], undefined, [completedTrial]);

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Current chapter');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Passed Saturday, October 31. Chapter II begins Monday, November 2.',
    );
    expect(element.querySelector('.trial__open')?.textContent?.trim()).toBe(
      'View Gate Trial record',
    );
  });

  it('moves to Chapter II’s route and Three-Mile Trial once its first day arrives', async () => {
    // Gate Trial passed Saturday, Oct 31: Chapter II begins Monday, Nov 2 (weeks 5–8).
    const element = await render('2026-10-05', '2026-11-04', [], undefined, [completedTrial]);

    expect(element.querySelector('#road-title')?.textContent?.trim()).toBe('The Road');
    expect(element.querySelector('.road-band__meta')?.textContent).toContain(
      'Chapter II · Weeks 5–8',
    );
    expect(element.querySelector('.road-body #trial-title')?.textContent?.trim()).toBe(
      'The Three-Mile Trial',
    );
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'First attempt Monday, November 30, the Monday after Week 8. If it doesn’t go, try again that Thursday. Chapter III waits until you pass.',
    );
    expect(element.querySelector('.trial__open')?.getAttribute('href')).toBe(
      '/road/three-mile-trial',
    );
    expect(
      Array.from(element.querySelectorAll('.route__week'), (week) => week.textContent?.trim()),
    ).toEqual(['Week 5', 'Week 6', 'Week 7', 'Week 8']);
    expect(element.querySelector('.route__target-label')?.textContent?.trim()).toBe(
      'Three-Mile Trial',
    );
    // Wednesday of the chapter's first week is day 3 of the route; the trial falls on day 29.
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toBe(
      'Chapter route. Today is day 3. Three-Mile Trial target on day 29.',
    );
    expect(
      Array.from(element.querySelectorAll('.trial__phases > li summary'), (summary) =>
        summary.textContent?.trim(),
      ),
    ).toHaveLength(5);
  });

  it('shows Chapter II complete after the Three-Mile Trial is passed', async () => {
    const threeMile: TrialResult = {
      ...completedTrial,
      id: 'three-mile-result-1',
      trialId: 'three-mile-trial',
      date: '2026-11-30',
    };
    const element = await render('2026-10-05', '2026-12-01', [], undefined, [
      completedTrial,
      threeMile,
    ]);

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Chapter II complete');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Chapter II complete. You passed the Three-Mile Trial on Monday, November 30.',
    );
    expect(element.querySelector('.trial__open')?.textContent?.trim()).toBe(
      'View Three-Mile Trial record',
    );
  });

  it('keeps the trial pending after Week 4 without a completed result', async () => {
    const element = await render('2026-10-05', '2026-11-02');

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Current chapter');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Today is an attempt day. If it doesn’t go, the next is Thursday, November 5.',
    );
  });

  it('names Chapter II’s first day after a Monday pass', async () => {
    const monday = { ...completedTrial, date: '2026-11-02' };
    const element = await render('2026-10-05', '2026-11-02', [], undefined, [monday]);

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Current chapter');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Passed Monday, November 2. Chapter II begins Tuesday, November 3.',
    );
  });
});
