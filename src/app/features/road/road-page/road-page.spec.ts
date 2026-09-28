import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { RoadPage } from './road-page';

async function render(
  startDate: string,
  today: string,
  walks: SavedRoadSession[] = [],
  trialTargetDate?: string,
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
    ],
  });
  const fixture = TestBed.createComponent(RoadPage);
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

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
});
