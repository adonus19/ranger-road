import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  MissionInstance,
  ReadinessCheck,
  TrialResult,
} from '../../../core/domain/models';
import { createMissionRecord } from '../../../core/domain/mission';
import { getCampaignDay } from '../../../core/program/campaign';
import { getChapterOneMissionsForDate } from '../../../core/program/chapter-one-missions';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionHistory } from '../../../core/state/mission-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { MissionPage } from './mission-page';

const date = '2026-09-21';
const wednesday = '2026-09-23';
const skillWednesday = '2026-10-07';
const friday = '2026-09-25';

const campaign: Campaign = {
  id: 'primary',
  startDate: date,
  currentChapterId: 'chapter-1',
  status: 'active',
};

function readiness(status: 'green' | 'yellow' | 'red', checkDate = date): ReadinessCheck {
  return {
    id: `readiness-${status}`,
    date: checkDate,
    checkedAt: '2026-09-21T11:00:00.000Z',
    sleepHours: 7,
    poorSleep: false,
    energy: 3,
    backPain: status === 'red' ? 5 : status === 'yellow' ? 3 : 0,
    shoulderPain: 0,
    neckPain: 0,
    redFlags: {
      significantSymptomIncrease: false,
      newNeurologicalOrRadiatingSymptoms: false,
      illness: false,
      otherConcerningSymptoms: false,
    },
    status,
  };
}

function setup(check: ReadinessCheck | null, today = date, initialRecords: MissionInstance[] = []) {
  const state = {
    campaign: signal(campaign),
    readiness: signal(check),
    today: signal(today),
    loading: signal(false),
    error: signal<string | null>(null),
    initialize: vi.fn(async () => undefined),
  };
  const forDate = vi.fn(async (_date: string): Promise<MissionInstance[]> => initialRecords);
  const add = vi.fn(async (_record: MissionInstance): Promise<void> => undefined);
  const forTrial = vi.fn(async (_trialId: string): Promise<TrialResult[]> => []);

  TestBed.configureTestingModule({
    imports: [MissionPage],
    providers: [
      provideRouter([]),
      {
        provide: CampaignState,
        useValue: {
          ...state,
          needsStartDate: computed(() => !state.campaign()),
          beforeDayOne: computed(
            () => getCampaignDay(state.campaign().startDate, state.today()) < 1,
          ),
        },
      },
      { provide: MissionHistory, useValue: { forDate, add } },
      { provide: TrialHistory, useValue: { forTrial } },
    ],
  });

  const fixture = TestBed.createComponent(MissionPage);
  return { fixture, state, forDate, add, forTrial };
}

async function ready(fixture: ReturnType<typeof setup>['fixture']): Promise<HTMLElement> {
  await fixture.whenStable();
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function option(root: HTMLElement, value: string): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>(`.outcomes input[type="radio"][value="${value}"]`);
}

function choose(root: HTMLElement, title: string): void {
  const input = [...root.querySelectorAll<HTMLLabelElement>('app-activity-choice label')]
    .find((label) => label.querySelector('strong')?.textContent?.trim() === title)
    ?.querySelector<HTMLInputElement>('input[type="radio"]');
  if (!input) throw new Error(`Activity choice missing: ${title}`);
  input.click();
}

async function saveMission(
  root: HTMLElement,
  fixture: ReturnType<typeof setup>['fixture'],
): Promise<void> {
  root.querySelector<HTMLButtonElement>('.save-button')!.click();
  await fixture.whenStable();
}

describe('MissionPage', () => {
  it('shows the Week 1 book before a Friday path is chosen', async () => {
    const { fixture, state } = setup(null, '2026-09-11');
    state.campaign.set({ ...campaign, startDate: '2026-09-07' });
    const root = await ready(fixture);

    expect(root.querySelector('.plan-note cite')?.textContent).toBe('Habits of the Household');
    expect(root.textContent).toContain('for 10 minutes');
    expect(root.querySelector<HTMLAnchorElement>('.reading-link')?.getAttribute('href')).toBe(
      '/field-manual/reading?from=mission',
    );
    expect(root.textContent).toContain('Choose a path to record today’s mission.');
  });

  it('links the documented fieldcraft days to their card or knot practice plan', async () => {
    const weekTwoWednesday = setup(null, '2026-09-30');
    const wednesdayRoot = await ready(weekTwoWednesday.fixture);
    expect(wednesdayRoot.querySelector('.fieldcraft-link')).toBeNull();
    choose(wednesdayRoot, 'Tool inspection');
    await weekTwoWednesday.fixture.whenStable();
    expect(
      wednesdayRoot.querySelector<HTMLAnchorElement>('.fieldcraft-link')?.getAttribute('href'),
    ).toBe('/field-manual/cards/tool-inspection?from=mission');
    choose(wednesdayRoot, 'Restoration');
    await weekTwoWednesday.fixture.whenStable();
    expect(wednesdayRoot.querySelector('.fieldcraft-link')).toBeNull();

    TestBed.resetTestingModule();
    const weekTwoSaturday = setup(null, '2026-10-03');
    const saturdayRoot = await ready(weekTwoSaturday.fixture);
    expect(
      saturdayRoot.querySelector<HTMLAnchorElement>('.fieldcraft-link')?.getAttribute('href'),
    ).toBe('/field-manual/cards/tool-inspection?from=mission');

    TestBed.resetTestingModule();
    const weekThreeWednesday = setup(null, skillWednesday);
    const knotRoot = await ready(weekThreeWednesday.fixture);
    choose(knotRoot, 'Knot practice');
    await weekThreeWednesday.fixture.whenStable();
    expect(
      knotRoot.querySelector<HTMLAnchorElement>('.fieldcraft-link')?.getAttribute('href'),
    ).toBe('/field-manual/practice/3?from=mission');
  });

  it('allows a reduced Yellow mission and saves an immutable definition snapshot', async () => {
    const { fixture, forDate, add } = setup(readiness('yellow'));
    const root = await ready(fixture);

    expect(forDate).toHaveBeenCalledWith(date);
    expect(root.querySelector('#order-title')?.textContent).toBe('Forge A');
    expect(root.textContent).toContain('Yellow · Reduce');
    expect(option(root, 'full')).toBeNull();
    expect(root.querySelector('.outcome-option--unavailable')?.textContent).toContain(
      'Unavailable on Yellow',
    );
    expect(option(root, 'reduced')).not.toBeNull();

    option(root, 'reduced')!.click();
    const notes = root.querySelector<HTMLTextAreaElement>('#mission-notes')!;
    notes.value = 'Reduced volume and kept the movement controlled.';
    notes.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();

    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date,
      status: 'completed',
      reduced: true,
      notes: 'Reduced volume and kept the movement controlled.',
      definitionSnapshot: {
        title: 'Forge A',
        missionType: 'strength',
      },
    });
    expect(root.textContent).toContain('Recorded today');
    expect(root.textContent).toContain('Reduced mission');
  });

  it('limits a Red strength day to restoration or rest', async () => {
    const { fixture } = setup(readiness('red'));
    const root = await ready(fixture);

    expect(root.textContent).toContain('Red · Restore');
    expect(option(root, 'full')).toBeNull();
    expect(option(root, 'reduced')).toBeNull();
    expect(option(root, 'restoration')).not.toBeNull();
    expect(option(root, 'rest')).not.toBeNull();
  });

  it('requires readiness before physical work and a reason when recording rest', async () => {
    const { fixture, add } = setup(null);
    const root = await ready(fixture);

    expect(root.textContent).toContain('A check is needed before physical training.');
    expect(option(root, 'full')).toBeNull();
    expect(option(root, 'reduced')).toBeNull();
    expect(option(root, 'restoration')).toBeNull();
    expect(option(root, 'rest')).not.toBeNull();

    option(root, 'rest')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();
    expect(add).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Record a reason for rest.');

    const notes = root.querySelector<HTMLTextAreaElement>('#mission-notes')!;
    notes.value = 'Pain made rest the right choice.';
    notes.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.save-button')!.click();
    await fixture.whenStable();

    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date,
      status: 'rest',
      reduced: false,
      notes: 'Pain made rest the right choice.',
    });
  });

  it('records Wednesday skill practice without readiness using a fieldcraft snapshot', async () => {
    const { fixture, add } = setup(null, skillWednesday);
    const root = await ready(fixture);

    expect(root.textContent).toContain('Choose today’s path');
    choose(root, 'Knot practice');
    await fixture.whenStable();

    expect(root.querySelector<HTMLLabelElement>('label[for="mission-notes"]')?.textContent).toBe(
      'What did you practice?',
    );
    expect(option(root, 'full')).not.toBeNull();
    expect(option(root, 'reduced')).not.toBeNull();
    expect(option(root, 'restoration')).toBeNull();

    option(root, 'full')!.click();
    const notes = root.querySelector<HTMLTextAreaElement>('#mission-notes')!;
    notes.value = 'Practiced basic knots.';
    notes.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await saveMission(root, fixture);

    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date: skillWednesday,
      status: 'completed',
      reduced: false,
      notes: 'Practiced basic knots.',
      definitionSnapshot: {
        title: 'Knot practice',
        missionType: 'fieldcraft',
        requiresReadiness: false,
      },
    });
  });

  it('requires a same-day readiness check for Wednesday restoration', async () => {
    const { fixture, state, add } = setup(readiness('green'), skillWednesday);
    const root = await ready(fixture);

    choose(root, 'Restoration');
    await fixture.whenStable();
    expect(option(root, 'full')).toBeNull();
    expect(option(root, 'reduced')).toBeNull();
    expect(option(root, 'rest')).not.toBeNull();

    state.readiness.set(readiness('green', skillWednesday));
    await fixture.whenStable();
    expect(option(root, 'full')).not.toBeNull();
    option(root, 'full')!.click();
    await fixture.whenStable();
    await saveMission(root, fixture);

    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0][0]).toMatchObject({
      date: skillWednesday,
      status: 'completed',
      definitionSnapshot: { title: 'Restoration', missionType: 'restoration' },
    });
  });

  it('keeps distinct definition snapshots for Friday conditioning and restoration', async () => {
    const { fixture, add } = setup(readiness('green', friday), friday);
    const root = await ready(fixture);

    choose(root, '20–25-minute easy walk');
    await fixture.whenStable();
    option(root, 'full')!.click();
    await fixture.whenStable();
    await saveMission(root, fixture);

    choose(root, 'Restoration');
    await fixture.whenStable();
    option(root, 'full')!.click();
    await fixture.whenStable();
    await saveMission(root, fixture);

    expect(add).toHaveBeenCalledTimes(2);
    const [conditioning, restoration] = add.mock.calls.map(([record]) => record);
    expect(conditioning.definitionId).not.toBe(restoration.definitionId);
    expect(conditioning.definitionSnapshot).toMatchObject({
      title: '20–25-minute easy walk',
      missionType: 'conditioning',
    });
    expect(restoration.definitionSnapshot).toMatchObject({
      title: 'Restoration',
      missionType: 'restoration',
    });
  });

  it('clears an unsaved outcome and note when switching paths', async () => {
    const { fixture, add } = setup(null, skillWednesday);
    const root = await ready(fixture);

    choose(root, 'Knot practice');
    await fixture.whenStable();
    option(root, 'full')!.click();
    const notes = root.querySelector<HTMLTextAreaElement>('#mission-notes')!;
    notes.value = 'Practiced knots.';
    notes.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(option(root, 'full')?.checked).toBe(true);

    choose(root, 'Restoration');
    await fixture.whenStable();
    expect(option(root, 'full')).toBeNull();
    expect(option(root, 'rest')?.checked).toBe(false);
    expect(root.querySelector<HTMLTextAreaElement>('#mission-notes')?.value).toBe('');

    choose(root, 'Knot practice');
    await fixture.whenStable();
    expect(option(root, 'full')?.checked).toBe(false);
    expect(root.querySelector<HTMLTextAreaElement>('#mission-notes')?.value).toBe('');
    expect(add).not.toHaveBeenCalled();
  });

  it('shows the saved title from a legacy definition snapshot', async () => {
    const legacyDefinition = getChapterOneMissionsForDate(campaign.startDate, wednesday)[1]!;
    const legacyRecord: MissionInstance = {
      id: 'older-wednesday-record',
      definitionId: legacyDefinition.id,
      date: wednesday,
      status: 'completed',
      reduced: false,
      completedAt: '2026-09-23T14:00:00.000Z',
      definitionSnapshot: { ...legacyDefinition, title: 'Restoration or skill' },
    };
    const { fixture, forDate } = setup(null, wednesday, [legacyRecord]);
    const root = await ready(fixture);

    expect(forDate).toHaveBeenCalledWith(wednesday);
    expect(root.querySelector('.recorded__activity')?.textContent?.trim()).toBe(
      'Restoration or skill',
    );
    expect(root.textContent).toContain('Recorded today');
  });

  it('keeps an old midweek mission visible when its saved week ID no longer matches', async () => {
    const oldDefinition = getChapterOneMissionsForDate('2026-09-07', '2026-09-17')[1]!;
    const oldRecord: MissionInstance = {
      id: 'old-week-record',
      definitionId: oldDefinition.id,
      date: '2026-09-17',
      status: 'completed',
      reduced: false,
      completedAt: '2026-09-17T14:00:00.000Z',
      definitionSnapshot: { ...oldDefinition, title: 'Earlier Week 2 order' },
    };
    const { fixture, state } = setup(null, '2026-09-17', [oldRecord]);
    state.campaign.set({ ...campaign, startDate: '2026-09-10', scheduleVersion: 2 });
    const root = await ready(fixture);

    expect(root.textContent).toContain('Saved under an earlier plan');
    expect(root.textContent).toContain('Earlier Week 2 order');
    expect(root.textContent).toContain('Full mission');
    expect(root.querySelector('.recorded__activity')).toBeNull();
  });

  it('offers walk details after a conditioning outcome, carrying the mission date to the Road log', async () => {
    const { fixture } = setup(readiness('green', friday), friday);
    const root = await ready(fixture);

    choose(root, '20–25-minute easy walk');
    await fixture.whenStable();
    option(root, 'reduced')!.click();
    await fixture.whenStable();
    await saveMission(root, fixture);

    const link = root.querySelector<HTMLAnchorElement>('.walk-link');
    expect(link?.textContent?.trim()).toBe('Log walk details');
    expect(link?.getAttribute('href')).toBe(`/road/log?date=${friday}&from=mission`);

    choose(root, 'Restoration');
    await fixture.whenStable();
    option(root, 'full')!.click();
    await fixture.whenStable();
    await saveMission(root, fixture);
    expect(root.querySelector('.walk-link')).toBeNull();
  });

  it('does not offer walk details after a rest day on a conditioning order', async () => {
    const { fixture } = setup(null, friday);
    const root = await ready(fixture);

    choose(root, '20–25-minute easy walk');
    await fixture.whenStable();
    option(root, 'rest')!.click();
    const notes = root.querySelector<HTMLTextAreaElement>('#mission-notes')!;
    notes.value = 'Resting a sore knee.';
    notes.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await saveMission(root, fixture);

    expect(root.textContent).toContain('Recorded today');
    expect(root.querySelector('.walk-link')).toBeNull();
  });

  it('clears the old day’s records and unsaved outcome when the date changes in an open mission', async () => {
    const definition = getChapterOneMissionsForDate(campaign.startDate, date)[1]!;
    const oldRecord = createMissionRecord({
      id: 'yesterday-mission',
      definition,
      date,
      outcome: 'full',
      recordedAt: '2026-09-21T20:00:00.000Z',
      readiness: readiness('green'),
    });
    const { fixture, state, forDate } = setup(readiness('green'), date, [oldRecord]);
    forDate.mockImplementation(async (queriedDate) => (queriedDate === date ? [oldRecord] : []));
    const root = await ready(fixture);
    expect(root.textContent).toContain('Recorded today');

    state.today.set('2026-09-22');
    state.readiness.set(null);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(forDate).toHaveBeenCalledWith('2026-09-22');
    expect(root.querySelector('#order-title')?.textContent).toContain('25-minute walk');
    expect(root.textContent).not.toContain('Recorded today');
    expect(option(root, 'full')).toBeNull();
  });

  it('moves on to Chapter II’s orders once the Gate Trial is passed', async () => {
    // Passed on the first attempt, Monday, Oct 19; Chapter II continues from Tuesday.
    const { fixture, state, forTrial } = setup(null, '2026-10-20');
    forTrial.mockResolvedValue([{ trialId: 'gate-trial', date: '2026-10-19' } as TrialResult]);
    const root = await ready(fixture);

    expect(forTrial).toHaveBeenCalledWith('gate-trial');
    expect(forTrial).toHaveBeenCalledWith('three-mile-trial');
    expect(root.textContent).not.toContain('Chapter I complete');
    expect(root.textContent).toContain('30-minute continuous walk');
    expect(state.today()).toBe('2026-10-20');
  });

  it('shows Chapter II completion on the direct mission route once Chapter III’s first day arrives', async () => {
    // Gate Trial passed Oct 19 (Chapter II's Week 5 began that Monday); Three-Mile Trial passed
    // on its first attempt, Monday, Nov 16, so Chapter III's first day is Tuesday.
    const { fixture, state, forTrial } = setup(null, '2026-11-17');
    forTrial.mockResolvedValue([
      { trialId: 'gate-trial', date: '2026-10-19' },
      { trialId: 'three-mile-trial', date: '2026-11-16' },
    ] as TrialResult[]);
    const root = await ready(fixture);

    expect(root.textContent).toContain('Chapter II complete');
    expect(root.textContent).not.toContain('Record your outcome');
    expect(root.querySelector<HTMLAnchorElement>('.page-state a')?.getAttribute('href')).toBe(
      '/road',
    );
    expect(state.today()).toBe('2026-11-17');
  });

  it('does not claim completion or show repeated orders when Gate Trial history cannot load', async () => {
    const { fixture, forTrial } = setup(null, '2026-10-19');
    forTrial.mockRejectedValue(new Error('History unavailable'));
    const root = await ready(fixture);

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Gate Trial history is unavailable',
    );
    expect(root.textContent).not.toContain('Chapter I complete');
    expect(root.textContent).not.toContain('Record your outcome');
  });

  it('says a Friday path needs readiness only until a check is saved', async () => {
    const details = (root: HTMLElement) =>
      [...root.querySelectorAll('.activity-choice__copy > span')].map((span) =>
        span.textContent?.trim(),
      );
    const unchecked = setup(null, friday);
    expect(details(await ready(unchecked.fixture))).toEqual([
      'Check readiness first',
      'Check readiness first',
    ]);

    TestBed.resetTestingModule();
    const checked = setup(readiness('green', friday), friday);
    expect(details(await ready(checked.fixture))).toEqual([
      'Log the walk details after',
      'Gentle mobility and a 1-minute easy walk',
    ]);

    TestBed.resetTestingModule();
    const skill = setup(null, skillWednesday);
    expect(details(await ready(skill.fixture))).toContain('No readiness check needed');
  });

  it('drops a walk’s brisk intervals on a Red day and links the Restoration routine', async () => {
    const { fixture } = setup(readiness('red', '2026-10-06'), '2026-10-06');
    const root = await ready(fixture);

    expect(root.querySelector('#order-title')?.textContent).toContain(
      'Restoration or easy movement',
    );
    expect(root.textContent).not.toContain('5 rounds of 1 minute brisk');
    expect(root.querySelector('.workout-link')?.getAttribute('href')).toBe(
      '/forge/session/chapter-1-restoration',
    );
  });

  it('offers the Restoration routine as Week 4 Friday’s easy mobility', async () => {
    const { fixture } = setup(readiness('green', '2026-10-16'), '2026-10-16');
    const root = await ready(fixture);

    expect(root.querySelector('#order-title')?.textContent).toContain('Easy mobility or rest');
    expect(root.querySelector('.workout-link')?.getAttribute('href')).toBe(
      '/forge/session/chapter-1-restoration',
    );
  });

  it('offers the Gate Trial on an attempt day and names the next one', async () => {
    const { fixture } = setup(readiness('yellow', '2026-10-19'), '2026-10-19');
    const root = await ready(fixture);

    expect(root.querySelector('#order-title')?.textContent?.trim()).toBe(
      'Gate Trial waits for Green',
    );
    expect(root.textContent).toContain('Gate Trial today');
    expect(root.textContent).toContain('the next attempt is Thursday, October 22');
    expect(root.querySelector('.recorded a')?.getAttribute('href')).toBe('/road/gate-trial');
    expect(option(root, 'full')).toBeNull();
  });

  it('marks the attempt day’s order passed once the Gate Trial is saved', async () => {
    const { fixture, forTrial } = setup(readiness('yellow', '2026-10-19'), '2026-10-19');
    forTrial.mockResolvedValue([{ trialId: 'gate-trial', date: '2026-10-19' } as TrialResult]);
    const root = await ready(fixture);

    expect(root.querySelector('#order-title')?.textContent?.trim()).toBe('Gate Trial');
    expect(root.textContent).toContain('Gate Trial passed');
    expect(root.textContent).toContain('Chapter II begins Tuesday, October 20');
    expect(root.textContent).not.toContain('Gate Trial today');
    expect(root.textContent).not.toContain('Record the trial through its dedicated flow');
    expect(root.querySelector('.recorded a')?.getAttribute('href')).toBe('/road/gate-trial');
  });

  it('asks Week 4 Saturday to prepare for Monday only while the trial is pending', async () => {
    const pending = setup(readiness('green', '2026-10-17'), '2026-10-17');
    const root = await ready(pending.fixture);
    expect(root.querySelector('#order-title')?.textContent?.trim()).toBe('30-minute easy walk');
    expect(root.textContent).toContain('choose the 2-mile route');

    TestBed.resetTestingModule();
    const passed = setup(readiness('green', '2026-10-17'), '2026-10-17');
    passed.forTrial.mockResolvedValue([
      { trialId: 'gate-trial', date: '2026-10-15' } as TrialResult,
    ]);
    expect((await ready(passed.fixture)).textContent).not.toContain('choose the 2-mile route');
  });
});
