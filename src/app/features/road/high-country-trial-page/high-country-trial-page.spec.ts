import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  TrialAttempt,
  TrialDraft,
} from '../../../core/domain/models';
import { createTrialDraft } from '../../../core/domain/trial-draft';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { HighCountryTrialPage } from './high-country-trial-page';

const hikeDay = '2026-12-29';
const passes = [
  { id: 'gate', trialId: 'gate-trial', date: '2026-11-02', phaseResults: [], reflection: '' },
  { id: 'tm', trialId: 'three-mile-trial', date: '2026-11-30', phaseResults: [], reflection: '' },
];
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-3',
  status: 'active',
};
const green: ReadinessCheck = {
  id: 'green',
  date: hikeDay,
  checkedAt: `${hikeDay}T10:00:00.000Z`,
  sleepHours: 7,
  poorSleep: false,
  energy: 4,
  backPain: 0,
  shoulderPain: 0,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
  status: 'green',
};

async function render(draft?: TrialDraft, attempts: TrialAttempt[] = []) {
  TestBed.configureTestingModule({
    imports: [HighCountryTrialPage],
    providers: [
      provideRouter([]),
      {
        provide: CampaignState,
        useValue: {
          campaign: signal<Campaign | null>(campaign),
          readiness: signal<ReadinessCheck | null>(green),
          today: signal(hikeDay),
          loading: signal(false),
          error: signal<string | null>(null),
          beforeDayOne: computed(() => false),
          initialize: vi.fn(async () => undefined),
        },
      },
      {
        provide: TrialHistory,
        useValue: {
          activeDraft: vi.fn(async () => draft),
          forTrial: vi.fn(async (id: string) => passes.filter((pass) => pass.trialId === id)),
          stoppedForTrial: vi.fn(async () => attempts),
          recoveries: vi.fn(async () => []),
        },
      },
      {
        provide: ProgressionHistory,
        useValue: {
          load: vi.fn(async () => ({ sessions: [], readinessById: new Map(), dayOf: () => null })),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(HighCountryTrialPage);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => expect(root.textContent).not.toContain('Opening campaign'));
  return root;
}

describe('High Country Trial plan', () => {
  it('shows the two pieces, the stand-in and the weather rule, and opens the hike', async () => {
    const root = await render();
    expect(root.querySelector('#pieces-title')?.textContent).toBe('Two days, two pieces');
    expect(root.textContent).toContain('Winter stand-in');
    expect(root.textContent).toContain('A postponement is not a failed attempt');
    expect(root.querySelectorAll('.hc-stations li')).toHaveLength(5);
    const action = root.querySelector('.station-dock a');
    expect(action?.textContent).toContain('Begin the hike');
    expect(action?.getAttribute('href')).toBe('/road/high-country-trial/active');
  });

  it('marks the hike done and waits for a later day, and lists a postponement apart', async () => {
    const draft = createTrialDraft(
      'high-country-trial',
      hikeDay,
      green,
      `${hikeDay}T10:30:00.000Z`,
      'hc',
    );
    draft.pieces![0].completedAt = `${hikeDay}T15:00:00.000Z`;
    const postponed: TrialAttempt = {
      ...createTrialDraft(
        'high-country-trial',
        '2026-12-28',
        { ...green, date: '2026-12-28', checkedAt: '2026-12-28T10:00:00.000Z' },
        '2026-12-28T10:30:00.000Z',
        'hc-old',
      ),
      outcome: 'postponed-for-weather',
      stoppedAt: '2026-12-28T11:00:00.000Z',
      weatherReason: 'Thunder',
    };
    const root = await render(draft, [postponed]);
    expect(root.querySelector('.hc-pieces li.is-done')?.textContent).toContain('Done Tue, Dec 29');
    expect(root.querySelector('.station-dock')?.textContent).toContain(
      'Circuit on a later Green day',
    );
    const history = root.querySelector('.station-history')?.textContent ?? '';
    expect(history).toContain('Postponed · Mon, Dec 28');
    expect(history).toContain('Not a failed attempt');
    expect(history).not.toContain('Stopped');
  });
});
