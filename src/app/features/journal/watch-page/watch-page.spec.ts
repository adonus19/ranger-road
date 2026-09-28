import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { Campaign, JournalEntry } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { JournalStore, type EveningAnswers } from '../journal-store';
import { WatchPage } from './watch-page';

function setup(watch: 'morning' | 'evening', campaign: Campaign | null = null) {
  const state = {
    campaign: signal<Campaign | null>(campaign),
    today: signal('2026-09-21'),
    initialize: vi.fn(async () => undefined),
  };
  const params = convertToParamMap({ watch });
  const saveMorning = vi.fn(async (date: string, response: string): Promise<JournalEntry> => ({
    id: 'morning-1',
    date,
    type: 'morning-watch',
    prompt: 'Family need',
    response,
  }));
  const saveEvening = vi.fn(
    async (date: string, _answers: EveningAnswers): Promise<JournalEntry> => ({
      id: 'evening-1',
      date,
      type: 'evening-watch',
      prompt: 'Evening',
      response: 'Gratitude: Home',
    }),
  );
  TestBed.configureTestingModule({
    imports: [WatchPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: params }, paramMap: of(params) },
      },
      { provide: JournalStore, useValue: { saveMorning, saveEvening } },
      { provide: CampaignState, useValue: state },
    ],
  });
  return { fixture: TestBed.createComponent(WatchPage), saveMorning, saveEvening, state };
}

describe('WatchPage', () => {
  it('keeps the documented Morning sequence and saves the family response', async () => {
    const { fixture, saveMorning } = setup('morning');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.watch-steps')?.textContent).toContain('Read Scripture');
    expect(root.querySelector('.watch-steps')?.textContent).toContain('Pray briefly');
    expect(root.querySelector('.watch-steps a')?.getAttribute('href')).toBe('/keep');
    expect(root.querySelector('label[for="family-need"]')?.textContent).toContain(
      'What does my family need from me today?',
    );

    const response = root.querySelector<HTMLTextAreaElement>('#family-need')!;
    response.value = 'Listen to my spouse after work.';
    response.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();

    expect(saveMorning).toHaveBeenCalledOnce();
    expect(saveMorning.mock.calls[0][1]).toBe('Listen to my spouse after work.');
    expect(root.textContent).toContain('Morning Watch saved');
  });

  it('allows a short Evening entry without forcing every line', async () => {
    const { fixture, saveEvening } = setup('evening');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.evening-fields textarea')).toHaveLength(4);

    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(saveEvening).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('at least one line');

    const gratitude = root.querySelector<HTMLTextAreaElement>('#gratitude')!;
    gratitude.value = 'Home';
    gratitude.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(saveEvening).toHaveBeenCalledOnce();
    expect(saveEvening.mock.calls[0][1]).toMatchObject({ gratitude: 'Home' });
  });

  it('shows the new date and asks to review an unsaved entry after midnight', async () => {
    const { fixture, saveMorning, state } = setup('morning');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const response = root.querySelector<HTMLTextAreaElement>('#family-need')!;
    response.value = 'A note written the prior evening.';
    response.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    state.today.set('2026-09-22');
    await fixture.whenStable();
    expect(root.querySelector('.watch-heading')?.textContent).toContain('September 22');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Review this entry');

    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(saveMorning).not.toHaveBeenCalled();

    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(saveMorning).toHaveBeenCalledWith('2026-09-22', 'A note written the prior evening.');
  });

  it('does not show yesterday’s saved watch as today’s after the date changes', async () => {
    const { fixture, state } = setup('morning');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const response = root.querySelector<HTMLTextAreaElement>('#family-need')!;
    response.value = 'Yesterday’s entry.';
    response.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Morning Watch saved');

    state.today.set('2026-09-22');
    await fixture.whenStable();
    expect(root.textContent).not.toContain('Morning Watch saved');
    expect(root.querySelector<HTMLTextAreaElement>('#family-need')?.value).toBe('');
  });

  it('asks Week 1 Monday’s reflection in the Morning Watch, not the Evening Watch', async () => {
    const campaign: Campaign = {
      id: 'primary',
      startDate: '2026-09-21',
      currentChapterId: 'chapter-1',
      status: 'active',
    };
    const morning = setup('morning', campaign);
    await morning.fixture.whenStable();
    const morningRoot = morning.fixture.nativeElement as HTMLElement;
    expect(morningRoot.querySelector('.watch-steps')?.textContent).toContain(
      'Reflect: What requires my attention today?',
    );

    TestBed.resetTestingModule();
    const evening = setup('evening', campaign);
    await evening.fixture.whenStable();
    expect((evening.fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'What requires my attention today?',
    );
  });
});
