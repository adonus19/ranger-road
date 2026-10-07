import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { LightActivity } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { LightActivityHistory } from '../../../core/state/light-activity-history';
import { LightActivityPage } from './light-activity-page';

function setup() {
  const stored: LightActivity[] = [];
  const add = vi.fn(async (entry: LightActivity) => void stored.push(entry));
  TestBed.configureTestingModule({
    imports: [LightActivityPage],
    providers: [
      provideRouter([]),
      {
        provide: CampaignState,
        useValue: { today: signal('2026-10-27'), initialize: async () => undefined },
      },
      {
        provide: LightActivityHistory,
        useValue: {
          add,
          forDate: async () => [...stored],
          remove: async (id: string) =>
            void stored.splice(0, stored.length, ...stored.filter((e) => e.id !== id)),
        },
      },
    ],
  });
  return { fixture: TestBed.createComponent(LightActivityPage), add, stored };
}

function fill(root: HTMLElement, id: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function save(root: HTMLElement, fixture: { whenStable(): Promise<unknown> }) {
  root.querySelector<HTMLButtonElement>('.save-button')!.click();
  await fixture.whenStable();
}

describe('LightActivityPage', () => {
  it('needs only a name, and saves the optional numbers when given', async () => {
    const { fixture, add } = setup();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    await save(root, fixture);
    expect(add).not.toHaveBeenCalled();
    expect(root.querySelector('.field-error')?.textContent).toContain('Name the activity');

    fill(root, 'activity-name', 'Cycling');
    fill(root, 'activity-time', '40');
    fill(root, 'activity-distance', '9.5');
    await fixture.whenStable();
    await save(root, fixture);
    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date: '2026-10-27',
      activity: 'Cycling',
      time: 40,
      distance: 9.5,
    });
    expect(add.mock.calls[0][0].weight).toBeUndefined();
    expect(root.querySelector('.logged')?.textContent).toContain('40 min · 9.5 mi');
  });

  it('rejects a non-number in an optional field', async () => {
    const { fixture, add } = setup();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    fill(root, 'activity-name', 'Swim');
    fill(root, 'activity-sets', 'lots');
    await fixture.whenStable();
    await save(root, fixture);
    expect(add).not.toHaveBeenCalled();
    expect(root.textContent).toContain('whole number of sets');
  });
});
