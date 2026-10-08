import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck, TrialResult } from '../../../core/domain/models';
import { getCampaignDay } from '../../../core/program/campaign';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionHistory } from '../../../core/state/mission-history';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { TrialHistory } from '../../../core/state/trial-history';
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
  trialTargetDate: '2026-10-19',
};

async function render(
  state: ReturnType<typeof fakeState>,
  measurements: unknown[] = [],
  completedTrials: TrialResult[] = [],
  missions: unknown[] = [],
): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [KeepPage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: MissionHistory, useValue: { forDate: async () => missions } },
      { provide: MeasurementHistory, useValue: { all: async () => measurements } },
      {
        provide: TrialHistory,
        useValue: { forTrial: async () => completedTrials, recoveries: async () => [] },
      },
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

const completedTrial: TrialResult = {
  id: 'gate-result-1',
  trialId: 'gate-trial',
  date: '2026-10-31',
  phaseResults: [],
  reflection: '',
};

describe('KeepPage', () => {
  it('offers a calm note after two unrecorded days, with no counts, and none once they are recorded', async () => {
    const root = await render(fakeState(campaign));
    const note = root.querySelector('.back-on-track');
    expect(note?.textContent).toContain('Welcome back');
    expect(note?.textContent).not.toMatch(/\d|missed/i);

    TestBed.resetTestingModule();
    const recorded = await render(
      fakeState(campaign),
      [],
      [],
      [{ id: 'a', date: '2026-09-24', definitionId: 'x', status: 'rest' }],
    );
    expect(recorded.querySelector('.back-on-track')).toBeNull();
  });

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
    ).toEqual(['5', '24']);
    expect(text(element, '.readiness-strip__status')).toBe('Not checked today');
    expect(text(element, '.main-order h3')).toBe('20–25-minute easy walk');
    expect(text(element, '.main-order__guidance')).toBe('Check readiness before training.');
    expect(
      Array.from(element.querySelectorAll('.watch h3'), (h3) => h3.textContent?.trim()),
    ).toEqual(['Morning Watch', 'Evening Watch']);
    expect(text(element, '.hearth__text p')).toContain('make this week easier');
    expect(element.querySelector<HTMLAnchorElement>('.hearth__link')?.getAttribute('href')).toBe(
      '/field-manual/lessons/lead-yourself-first?from=keep',
    );
  });

  it('names a midweek start as a lead-in and keeps Week 1 Hearth work', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-09-10',
      trialTargetDate: '2026-10-12',
      scheduleVersion: 3,
    });
    state.today.set('2026-09-11');
    const element = await render(state);

    expect(
      Array.from(element.querySelectorAll('.keep-band__counts dd'), (dd) => dd.textContent?.trim()),
    ).toEqual(['2', '31']);
    expect(text(element, '.keep-band__note')).toBe('Lead-in through Sunday. Week 1 begins Monday.');
    expect(text(element, '.main-order h3')).toBe('20–25-minute easy walk');
    expect(text(element, '.hearth__text p')).toContain('make this week easier');
    expect(element.querySelector<HTMLAnchorElement>('.hearth__link')?.getAttribute('href')).toBe(
      '/field-manual/lessons/lead-yourself-first?from=keep',
    );
  });

  it('links the Hearth mission to the current weekly lesson', async () => {
    const state = fakeState(campaign);
    state.today.set('2026-09-29');
    const element = await render(state);

    expect(text(element, '.hearth__text p')).toContain('recurring household responsibility');
    expect(element.querySelector<HTMLAnchorElement>('.hearth__link')?.getAttribute('href')).toBe(
      '/field-manual/lessons/keep-small-promises?from=keep',
    );
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

  it('keeps Week 4’s dated orders through Sunday after an older early pass', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-10-05',
      trialTargetDate: '2026-11-02',
    });
    state.today.set('2026-11-01');
    const element = await render(state, [], [completedTrial]);

    expect(text(element, '.main-order h3')).toBe('Rest and worship');
    expect(text(element, '.keep-band__counts div:last-child dd')).toBe('Done');
    expect(text(element, '.keep-band__note')).toBe(
      'Gate Trial passed. Chapter II begins Mon, Nov 2. What changed this chapter',
    );
    expect(element.querySelector('.mission-cta')).not.toBeNull();
    expect(element.querySelector('.chapter-complete')).toBeNull();
  });

  it('counts down to the Monday attempt, holds the check-in that day, and marks a pass', async () => {
    const yellow: ReadinessCheck = {
      id: 'yellow-trial-day',
      date: '2026-11-02',
      checkedAt: '2026-11-02T11:00:00.000Z',
      sleepHours: 6,
      poorSleep: true,
      energy: 3,
      backPain: 1,
      shoulderPain: 0,
      neckPain: 0,
      redFlags: {
        significantSymptomIncrease: false,
        newNeurologicalOrRadiatingSymptoms: false,
        illness: false,
        otherConcerningSymptoms: false,
      },
      status: 'yellow',
    };
    const state = fakeState(
      { ...campaign, startDate: '2026-10-05', trialTargetDate: '2026-11-02' },
      yellow,
    );
    state.today.set('2026-10-31');
    const saturday = await render(state);
    expect(text(saturday, '.keep-band__counts div:last-child dd')).toBe('2');
    expect(text(saturday, '.keep-band__note')).toBe(
      'Gate Trial on the Monday after Week 4. If it doesn’t go, try again Thursday.',
    );
    expect(text(saturday, '.main-order h3')).toBe('30-minute easy walk');

    // Day 29: the monthly check-in is due, but not on top of the trial.
    TestBed.resetTestingModule();
    state.today.set('2026-11-02');
    const pending = await render(state);
    expect(text(pending, '.keep-band__counts div:last-child dd')).toBe('0');
    expect(text(pending, '.keep-band__note')).toBe(
      'Gate Trial today if you’re Green; otherwise Thu, Nov 5.',
    );
    expect(text(pending, '.main-order h3')).toBe('Gate Trial waits for Green');
    expect(pending.querySelector('.reminder')).toBeNull();

    TestBed.resetTestingModule();
    const passed = await render(state, [], [{ ...completedTrial, date: '2026-11-02' }]);
    expect(text(passed, '.main-order h3')).toBe('Gate Trial');
    expect(text(passed, '.main-order__guidance')).toBe(
      'Passed. Your result is saved on this device.',
    );
    expect(text(passed, '.keep-band__counts div:last-child dd')).toBe('Done');
    expect(text(passed, '.keep-band__note')).toBe(
      'Gate Trial passed. Chapter II begins Tue, Nov 3. What changed this chapter',
    );
    expect(passed.querySelector('.keep-band__note a')?.getAttribute('href')).toBe(
      '/road/gate-trial#chapter-summary',
    );
    expect(passed.querySelector('.reminder')).toBeNull();

    // Chapter II begins the day after a Monday pass, counting that Monday as Week 5.
    TestBed.resetTestingModule();
    state.today.set('2026-11-03');
    const nextDay = await render(state, [], [{ ...completedTrial, date: '2026-11-02' }]);
    expect(text(nextDay, 'h1')).toBe('The Road');
    expect(text(nextDay, '.keep-band__chapter-line')).toBe('Chapter II · Weeks 5–8');
    expect(text(nextDay, '.keep-band__counts div:last-child dt')).toBe(
      'Days until Three-Mile Trial',
    );
    expect(text(nextDay, '.keep-band__counts div:last-child dd')).toBe('27');
    expect(text(nextDay, '.main-order h3')).toBe('30-minute continuous walk');
    expect(nextDay.querySelector('.chapter-complete')).toBeNull();
    expect(text(nextDay, '.reminder strong')).toBe('Monthly check-in');
  });

  it('starts Chapter II on the first attempt day after an older early pass', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-10-05',
      trialTargetDate: '2026-10-31',
    });
    state.today.set('2026-11-02');
    const element = await render(state, [], [completedTrial]);

    expect(text(element, 'h1')).toBe('The Road');
    expect(text(element, '.main-order h3')).toBe('Forge A');
    expect(text(element, '.keep-band__counts div:last-child dd')).toBe('28');
    expect(text(element, '.keep-band__note')).toBe(
      'Three-Mile Trial on the Monday after Week 8. If it doesn’t go, try again Thursday.',
    );
  });

  it('acknowledges Chapter II after four full weeks and a Three-Mile Trial pass while retaining reminders', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-10-05',
      trialTargetDate: '2026-11-02',
    });
    // The Gate Trial passed on Nov 2 (Chapter II from Nov 3); the Three-Mile Trial passed on its
    // first attempt, Monday, Nov 30, so Chapter III begins Dec 1, and it is not in the app yet.
    state.today.set('2026-12-01');
    const element = await render(
      state,
      [],
      [
        { ...completedTrial, date: '2026-11-02' },
        { ...completedTrial, id: 'three-mile-1', trialId: 'three-mile-trial', date: '2026-11-30' },
      ],
    );

    expect(text(element, '#chapter-complete-title')).toBe('Chapter II complete');
    expect(text(element, '.keep-band__counts div:last-child dd')).toBe('Done');
    expect(text(element, '.keep-band__note')).toContain('Chapter II complete');
    expect(element.querySelector('.chapter-complete a')?.getAttribute('href')).toBe(
      '/road/three-mile-trial',
    );
    expect(element.querySelector('.orders')).toBeNull();
    expect(element.querySelector('.mission-cta')).toBeNull();
    expect(text(element, '.reminder strong')).toBe('Monthly check-in');
  });

  it('repeats Week 4’s easy days between attempts while the trial is pending', async () => {
    const state = fakeState({
      ...campaign,
      startDate: '2026-10-05',
      trialTargetDate: '2026-11-02',
    });
    state.today.set('2026-11-03');
    const element = await render(state);

    expect(text(element, '.main-order h3')).toBe('30-minute easy walk');
    expect(text(element, '.keep-band__counts div:last-child dd')).toBe('2');
    expect(text(element, '.keep-band__note')).toBe('Next Gate Trial attempt: Thu, Nov 5.');
    expect(element.querySelector('.chapter-complete')).toBeNull();
  });
});
