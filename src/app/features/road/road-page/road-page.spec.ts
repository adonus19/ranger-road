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
      'Planned for the end of Week 4, Sunday, October 18. You can take it when ready.',
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

  it('speaks of the target in the past once it has passed', async () => {
    const element = await render('2026-08-20', '2026-09-25');

    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'The Week 4 target was Sunday, September 20. You can take the Gate Trial when ready.',
    );
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toContain(
      'A 4-day lead-in ends before Week 1 begins on day 5. Gate Trial target on day 32.',
    );
  });

  it('keeps a custom trial date distinct from the fixed four-week route endpoint', async () => {
    const element = await render('2026-09-21', '2026-09-25', [], '2026-10-24');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Your Gate Trial target is Saturday, October 24. You can take it when ready.',
    );
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toContain(
      'End of Week 4 target on day 28.',
    );
    expect(element.querySelector('.route__target-label')?.textContent?.trim()).toBe(
      'End of Week 4',
    );
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

  it('keeps Chapter I current through Week 4 Sunday after an early trial', async () => {
    const element = await render('2026-10-05', '2026-11-01', [], undefined, [completedTrial]);

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Current chapter');
    expect(element.querySelector('.trial__target')?.textContent).toContain(
      'Planned for the end of Week 4',
    );
  });

  it('shows Chapter I complete after the full four weeks and a completed Gate Trial', async () => {
    const element = await render('2026-10-05', '2026-11-02', [], undefined, [completedTrial]);

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Chapter I complete');
    expect(element.querySelector('.trial__target')?.textContent?.trim()).toBe(
      'Chapter I complete. Your Gate Trial is saved on this device.',
    );
    expect(element.querySelector('.trial__open')?.textContent?.trim()).toBe(
      'View Gate Trial record',
    );
  });

  it('keeps the trial pending after Week 4 without a completed result', async () => {
    const element = await render('2026-10-05', '2026-11-02');

    expect(element.querySelector('.road-band__meta')?.textContent).toContain('Current chapter');
    expect(element.querySelector('.trial__target')?.textContent).toContain('The Week 4 target was');
  });
});
