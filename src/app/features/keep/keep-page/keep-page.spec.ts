import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck } from '../../../core/domain/models';
import { getCampaignDay } from '../../../core/program/campaign';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { KeepPage } from './keep-page';

function fakeState(campaign: Campaign | null, readiness: ReadinessCheck | null = null) {
  const state = {
    campaign: signal(campaign),
    readiness: signal(readiness),
    today: signal('2026-09-25'),
    loading: signal(false),
    error: signal<string | null>(null),
    initialize: () => Promise.resolve(),
    retry: () => Promise.resolve(),
  };
  return {
    ...state,
    needsStartDate: computed(() => !state.campaign()),
    beforeDayOne: computed(() => {
      const current = state.campaign();
      return !!current && getCampaignDay(current.startDate, state.today()) < 1;
    }),
  };
}

const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-09-21',
  currentChapterId: 'chapter-1',
  status: 'active',
  trialTargetDate: '2026-10-18',
};

async function render(
  state: ReturnType<typeof fakeState>,
  measurements: unknown[] = [],
): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [KeepPage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: MeasurementHistory, useValue: { all: async () => measurements } },
    ],
  });
  const fixture = TestBed.createComponent(KeepPage);
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (element: HTMLElement, selector: string) =>
  element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

describe('KeepPage', () => {
  it('asks for Day 1 on first launch while still introducing the chapter', async () => {
    const element = await render(fakeState(null));

    expect(text(element, 'h1')).toBe('The Muster');
    expect(text(element, '#start-title')).toBe('When is Day 1?');
    expect(element.querySelector('input[type="date"]')).not.toBeNull();
    expect(element.querySelector('.keep-band__counts')).toBeNull();
  });

  it('shows the day, the Gate Trial countdown, and the documented Friday order', async () => {
    const element = await render(fakeState(campaign));

    expect(
      Array.from(element.querySelectorAll('.keep-band__counts dd'), (dd) => dd.textContent?.trim()),
    ).toEqual(['5', '23']);
    expect(text(element, '.readiness-strip__status')).toBe('Not checked today');
    expect(text(element, '.main-order h3')).toBe('20–25-minute easy walk');
    expect(text(element, '.main-order__guidance')).toBe('Check readiness before training.');
    expect(
      Array.from(element.querySelectorAll('.watch h3'), (h3) => h3.textContent?.trim()),
    ).toEqual(['Morning Watch', 'Evening Watch']);
    expect(text(element, '.hearth__text p')).toContain('make this week easier');
  });

  it('names a midweek start as a lead-in and keeps Week 1 Hearth work', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-09-10',
      trialTargetDate: '2026-10-11',
      scheduleVersion: 2,
    });
    state.today.set('2026-09-11');
    const element = await render(state);

    expect(
      Array.from(element.querySelectorAll('.keep-band__counts dd'), (dd) => dd.textContent?.trim()),
    ).toEqual(['2', '30']);
    expect(text(element, '.keep-band__note')).toBe('Lead-in through Sunday. Week 1 begins Monday.');
    expect(text(element, '.main-order h3')).toBe('20–25-minute easy walk');
    expect(text(element, '.hearth__text p')).toContain('make this week easier');
  });

  it('names a red readiness state in words and replaces the main order with restoration', async () => {
    const red: ReadinessCheck = {
      id: 'r1',
      date: '2026-09-25',
      checkedAt: '2026-09-25T12:00:00.000Z',
      sleepHours: 7,
      poorSleep: false,
      energy: 3,
      backPain: 6,
      shoulderPain: 0,
      neckPain: 0,
      redFlags: {
        significantSymptomIncrease: false,
        newNeurologicalOrRadiatingSymptoms: false,
        illness: false,
        otherConcerningSymptoms: false,
      },
      status: 'red',
    };
    const element = await render(fakeState(campaign, red));

    expect(text(element, '.readiness-strip__status')).toBe('Red · Restore');
    expect(text(element, '.readiness-strip__help')).toContain('Seek medical evaluation');
    expect(text(element, '.main-order h3')).toBe('Restoration or easy movement, if appropriate');
  });

  it('reminds of the Day 1 check-in until it is saved, then lets it go', async () => {
    const element = await render(fakeState(campaign));
    const reminder = element.querySelector<HTMLAnchorElement>('.reminder')!;
    expect(text(element, '.reminder strong')).toBe('Day 1 check-in');
    expect(text(element, '.reminder__text span')).toBe('Record where you’re starting.');
    expect(reminder.getAttribute('href')).toBe('/journal/check-in?from=keep');

    TestBed.resetTestingModule();
    const done = await render(fakeState(campaign), [
      {
        id: 'measure-1',
        kind: 'check-in',
        date: '2026-09-22',
        recordedAt: '2026-09-22T12:00:00.000Z',
      },
    ]);
    expect(done.querySelector('.reminder')).toBeNull();
  });
});
