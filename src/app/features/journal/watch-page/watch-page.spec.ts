import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from '../../../core/domain/models';
import { JournalStore, type EveningAnswers } from '../journal-store';
import { WatchPage } from './watch-page';

function setup(watch: 'morning' | 'evening') {
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
    ],
  });
  return { fixture: TestBed.createComponent(WatchPage), saveMorning, saveEvening };
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
});
