import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import type { ReadinessCheck, ReadinessStatus } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { CheckInPage } from './check-in-page';

function check(date: string, sleepHours: number, backPain: number): ReadinessCheck {
  return {
    id: `readiness-${date}`,
    date,
    checkedAt: `${date}T12:00:00.000Z`,
    sleepHours,
    poorSleep: false,
    energy: 3,
    backPain,
    shoulderPain: 1,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status: 'green',
  };
}

interface OpenOptions {
  today?: string;
  readiness?: ReadinessStatus;
  entries?: SavedMeasurement[];
  readinessError?: boolean;
}

async function open(
  url = '/journal/check-in',
  { today = '2026-10-12', readiness, entries = [], readinessError = false }: OpenOptions = {},
) {
  const add = vi.fn(async (entry: SavedMeasurement): Promise<SavedMeasurement> => entry);
  const checks = [
    check('2026-09-01', 4, 9),
    check('2026-10-01', 6.5, 3),
    check('2026-10-12', 7, 1),
    ...(readiness ? [{ ...check(today, 7, 1), id: `latest-${today}`, checkedAt: `${today}T20:00:00.000Z`, status: readiness }] : []),
  ];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'journal/check-in', component: CheckInPage }]),
      {
        provide: CampaignState,
        useValue: {
          campaign: signal({ id: 'primary', startDate: '2026-09-14', currentChapterId: 'chapter-1', status: 'active' }),
          today: signal(today),
          readiness: signal(readiness ? { status: readiness } : null),
          error: signal(null),
          initialize: vi.fn(async () => undefined),
        },
      },
      {
        provide: MeasurementHistory,
        useValue: {
          add,
          all: async () => entries,
          readinessChecks: async () => {
            if (readinessError) throw new Error('Cannot read readiness');
            return checks;
          },
        },
      },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await settle(harness);
  return { harness, root: harness.routeNativeElement as HTMLElement, add };
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

async function save(root: HTMLElement, harness: RouterTestingHarness): Promise<void> {
  root.querySelector<HTMLButtonElement>('button.save-button')!.click();
  await settle(harness);
}

const text = (root: HTMLElement, selector: string) => root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

describe('CheckInPage', () => {
  it('opens on the month’s readiness averages and saves them with the check-in', async () => {
    const { harness, root, add } = await open('/journal/check-in', { readiness: 'green' });

    expect(text(root, 'h1')).toBe('Monthly check-in');
    expect(text(root, '.date-line')).toBe('Day 29 · Monday, October 12');
    expect(text(root, '.lookback__hours')).toBe('6.8');
    expect(Array.from(root.querySelectorAll('.lookback__pain'), (dd) => dd.textContent?.trim())).toEqual([
      '2.0',
      '1.0',
      '0.0',
    ]);
    expect(text(root, '.lookback__note')).toBe('Averages from 2 readiness checks.');

    type(root, '#weight', '221.6');
    type(root, '#waist', '41.5');
    type(root, '#resting-heart-rate', '68');
    type(root, '#systolic', '128');
    type(root, '#diastolic', '82');
    type(root, '#pushups', '0');
    type(root, '#pullup', ' Purple band ');
    root.querySelector<HTMLInputElement>('.segments input[value="parallel"]')!.click();
    type(root, '#toe-reach', '3');
    root.querySelectorAll('.scale__options--five')[0].querySelector<HTMLInputElement>('input[value="3"]')!.click();
    await save(root, harness);

    expect(add).toHaveBeenCalledOnce();
    const entry = add.mock.calls[0][0];
    expect(entry).toMatchObject({
      kind: 'check-in',
      date: '2026-10-12',
      weight: 221.6,
      waist: 41.5,
      restingHeartRate: 68,
      bloodPressure: { systolic: 128, diastolic: 82 },
      pushups: 0,
      pullupAssistance: 'Purple band',
      squatDepth: 'parallel',
      toeReach: 3,
      energy: 3,
    });
    expect(entry).not.toHaveProperty('readinessSummary');
    expect(entry).not.toHaveProperty('capabilityRating');
    expect(entry).not.toHaveProperty('testsHeld');
    expect(text(root, '#saved-title')).toBe('Check-in saved');
    expect(document.activeElement?.id).toBe('saved-title');
    expect(Array.from(root.querySelectorAll('.saved__summary .line'), (line) => line.textContent)).toEqual([
      '221.6 lb · 41.5 in · 68 bpm',
      'Blood pressure 128/82',
      '0 push-ups · Toe reach 3 in',
      'Squat to parallel',
      'Pull-up: Purple band',
      'Energy 3',
    ]);
  });

  it('holds the four tests on a Red day and records that they were held', async () => {
    const { harness, root, add } = await open('/journal/check-in', { readiness: 'red' });

    expect(text(root, '.held')).toContain('Your readiness today is Red, so the tests wait for another day.');
    expect(root.querySelector('#pushups')).toBeNull();

    type(root, '#weight', '221.6');
    type(root, '#waist', '41.5');
    type(root, '#resting-heart-rate', '68');
    await save(root, harness);

    const entry = add.mock.calls[0][0];
    expect(entry).toMatchObject({ kind: 'check-in', testsHeld: true });
    expect(entry).not.toHaveProperty('pushups');
    expect(text(root, '.saved__held')).toBe(
      'The tests were held for a Red day. Add them from the Journal on a better day.',
    );
  });

  it('saves nothing until the needed answers are in, and names what stopped it', async () => {
    const { harness, root, add } = await open();

    await save(root, harness);
    expect(add).not.toHaveBeenCalled();
    expect(text(root, '.save-error')).toBe(
      'Check the weight, waist, and resting heart rate above, then save again.',
    );
    expect(document.activeElement?.id).toBe('weight');
    expect(root.querySelector('#weight')?.getAttribute('aria-describedby')).toBe('weight-error');

    type(root, '#weight', '221.6');
    type(root, '#waist', '41.5');
    type(root, '#resting-heart-rate', '68.5');
    type(root, '#systolic', '128');
    await save(root, harness);
    expect(add).not.toHaveBeenCalled();
    expect(text(root, '.save-error')).toBe('Check the resting heart rate and blood pressure above, then save again.');
    expect(root.textContent).toContain('Enter both blood pressure numbers, or neither.');
    expect(root.textContent).toContain('Enter whole beats per minute, such as 68.');
  });

  it('adds the tests a Red day held, on their own', async () => {
    const held: SavedMeasurement = {
      id: 'held', kind: 'check-in', date: '2026-10-12',
      recordedAt: '2026-10-12T12:00:00.000Z', weight: 221,
      waist: 41, restingHeartRate: 68, testsHeld: true,
    };
    const { harness, root, add } = await open('/journal/check-in?part=tests', {
      today: '2026-10-13', readiness: 'green', entries: [held],
    });

    expect(text(root, 'h1')).toBe('Check-in tests');
    expect(root.querySelector('app-readiness-lookback')).toBeNull();
    expect(root.querySelector('#weight')).toBeNull();
    expect(text(root, 'button.save-button')).toBe('Save tests');

    await save(root, harness);
    expect(add).not.toHaveBeenCalled();
    expect(text(root, '.save-error')).toBe('Enter at least one test, then save.');

    type(root, '#pushups', '12');
    await save(root, harness);
    const entry = add.mock.calls[0][0];
    expect(entry).toMatchObject({ kind: 'tests', pushups: 12 });
    expect(Object.keys(entry).sort()).toEqual(['date', 'id', 'kind', 'pushups', 'recordedAt']);
    expect(text(root, '#saved-title')).toBe('Tests saved');
  });

  it('titles the first check-in Day 1 and returns to Keep when opened from its reminder', async () => {
    const { root } = await open('/journal/check-in?from=keep', { today: '2026-09-14' });

    expect(text(root, 'h1')).toBe('Day 1 check-in');
    const back = root.querySelector<HTMLAnchorElement>('.back-link')!;
    expect(back.textContent?.trim()).toBe('Back to Keep');
    expect(back.getAttribute('href')).toBe('/keep');
  });

  it('blocks a direct check-in route before Day 1', async () => {
    const before = await open('/journal/check-in', { today: '2026-09-13' });
    expect(text(before.root, '.page-state')).toBe('Your first check-in opens on Day 1.');
    expect(before.root.querySelector('form')).toBeNull();
  });

  it('blocks a duplicate check-in in the same window', async () => {
    const saved: SavedMeasurement = {
      id: 'saved', kind: 'check-in', date: '2026-10-12',
      recordedAt: '2026-10-12T12:00:00.000Z', weight: 221,
      waist: 41, restingHeartRate: 68,
    };
    const duplicate = await open('/journal/check-in', { today: '2026-10-13', entries: [saved] });
    expect(text(duplicate.root, '.page-state')).toContain('already saved');
    expect(duplicate.root.querySelector('form')).toBeNull();
  });

  it('blocks a direct tests route without held tests', async () => {
    const missing = await open('/journal/check-in?part=tests');
    expect(text(missing.root, '.page-state')).toContain('Save this window’s check-in');
    expect(missing.root.querySelector('form')).toBeNull();
  });

  it('blocks held tests on a Red day', async () => {
    const held: SavedMeasurement = {
      id: 'held', kind: 'check-in', date: '2026-10-12',
      recordedAt: '2026-10-12T12:00:00.000Z', weight: 221,
      waist: 41, restingHeartRate: 68, testsHeld: true,
    };
    const red = await open('/journal/check-in?part=tests', {
      today: '2026-10-13', readiness: 'red', entries: [held],
    });
    expect(text(red.root, '.page-state')).toContain('Red');
    expect(red.root.querySelector('form')).toBeNull();
  });

  it('asks for readiness before tests while still allowing a body-only check-in', async () => {
    const { harness, root, add } = await open('/journal/check-in', { today: '2026-10-13' });
    expect(text(root, '.test-readiness')).toContain('Check readiness first to take tests in this check\u2011in.');
    expect(text(root, '.test-readiness')).toContain('Saving the body values now finishes this check\u2011in without tests.');
    expect(root.querySelector<HTMLAnchorElement>('.test-readiness a')?.getAttribute('href')).toBe('/readiness');
    expect(root.querySelector('#pushups')).toBeNull();
    expect(root.querySelector('#pullup')).toBeNull();
    expect(root.querySelector('.segments')).toBeNull();
    expect(root.querySelector('#toe-reach')).toBeNull();

    type(root, '#weight', '221.6');
    type(root, '#waist', '41.5');
    type(root, '#resting-heart-rate', '68');
    await save(root, harness);
    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).not.toHaveProperty('pushups');
  });

  it('asks for today’s readiness before adding held tests through a direct route', async () => {
    const held: SavedMeasurement = {
      id: 'held', kind: 'check-in', date: '2026-10-12',
      recordedAt: '2026-10-12T12:00:00.000Z', weight: 221,
      waist: 41, restingHeartRate: 68, testsHeld: true,
    };
    const { root } = await open('/journal/check-in?part=tests', {
      today: '2026-10-13', entries: [held],
    });
    expect(text(root, '.page-state')).toContain('Check readiness today before adding the held tests.');
    expect(root.querySelector<HTMLAnchorElement>('.page-state a')?.getAttribute('href')).toBe('/readiness');
    expect(root.querySelector('form')).toBeNull();
  });

  it('keeps the form closed when the readiness lookback cannot be read', async () => {
    const { root } = await open('/journal/check-in', { readinessError: true });
    expect(text(root, '.page-state')).toContain('could not be read');
    expect(root.querySelector('.retry-button')).not.toBeNull();
    expect(root.querySelector('form')).toBeNull();
  });
});
