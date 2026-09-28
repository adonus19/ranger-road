import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import type { JournalEntry } from '../../../core/domain/models';
import { CampaignState, localDateToday } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { JournalStore } from '../journal-store';
import { JournalPage } from './journal-page';

describe('JournalPage', () => {
  it('shows recent saved watches and lets the reader open the full local history', async () => {
    const entries: JournalEntry[] = Array.from({ length: 9 }, (_, index) => ({
      id: `entry-${index}`,
      date: localDateToday(),
      type: index === 0 ? 'morning-watch' : 'evening-watch',
      prompt: 'What mattered today?',
      response: `Response ${index}`,
    }));
    TestBed.configureTestingModule({
      imports: [JournalPage],
      providers: [
        provideRouter([]),
        { provide: JournalStore, useValue: { listWatches: async () => entries } },
      ],
    });
    const fixture = TestBed.createComponent(JournalPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.history-entry')).toHaveLength(8);
    expect(root.textContent).toContain('Saved today');
    root.querySelector<HTMLButtonElement>('.show-all')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.history-entry')).toHaveLength(9);

    const first = root.querySelector<HTMLDetailsElement>('.history-entry')!;
    first.open = true;
    await fixture.whenStable();
    expect(first.textContent).toContain('What mattered today?');
    expect(first.textContent).toContain('Response 0');
  });

  it('offers the check-in while it is due, and weight and waist with the latest values', async () => {
    const body: SavedMeasurement = {
      id: 'measure-body',
      kind: 'body',
      date: '2026-10-11',
      recordedAt: '2026-10-11T12:00:00.000Z',
      weight: 222.4,
    };
    const render = async (startDate: string, entries: SavedMeasurement[]) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [JournalPage],
        providers: [
          provideRouter([]),
          { provide: JournalStore, useValue: { listWatches: async () => [] } },
          {
            provide: CampaignState,
            useValue: {
              campaign: signal({ id: 'primary', startDate, currentChapterId: 'chapter-1', status: 'active' }),
              today: signal('2026-10-12'),
              readiness: signal(null),
              initialize: async () => undefined,
            },
          },
          { provide: MeasurementHistory, useValue: { all: async () => entries } },
        ],
      });
      const fixture = TestBed.createComponent(JournalPage);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    const due = await render('2026-09-14', [body]);
    const [checkIn, weight] = Array.from(due.querySelectorAll<HTMLAnchorElement>('.measures .watch-link'));
    expect(checkIn.textContent).toContain('Monthly check-in');
    expect(checkIn.textContent).toContain('Due now');
    expect(checkIn.getAttribute('href')).toBe('/journal/check-in');
    expect(weight.getAttribute('href')).toBe('/journal/body');
    expect(weight.querySelector('small')?.textContent).toBe('Last: 222.4 lb, Sun, Oct 11');

    const early = await render('2026-10-20', []);
    expect(early.querySelector('.measures__note')?.textContent).toBe('Your first check\u2011in opens on Day 1.');
    expect(early.querySelectorAll('.measures .watch-link')).toHaveLength(1);
  });
});
