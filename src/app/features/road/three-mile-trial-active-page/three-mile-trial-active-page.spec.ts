import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Campaign,
  ReadinessCheck,
  TrialDraft,
  TrialSkillPart,
  WorkoutSession,
} from '../../../core/domain/models';
import { createTrialDraft } from '../../../core/domain/trial-draft';
import { campaignDayResolver } from '../../../core/program/campaign-day';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory } from '../../../core/state/trial-history';
import { ThreeMileTrialActivePage } from './three-mile-trial-active-page';

// Day 1 is Monday, Oct 5; the Gate Trial passed Monday, Nov 2, so Monday, Nov 30 is the first
// Three-Mile Trial attempt.
const date = '2026-11-30';
const gatePass = {
  id: 'gate-pass',
  trialId: 'gate-trial',
  date: '2026-11-02',
  phaseResults: [],
  reflection: '',
};
const campaign: Campaign = {
  id: 'primary',
  startDate: '2026-10-05',
  currentChapterId: 'chapter-2',
  status: 'active',
};
function check(changes: Partial<ReadinessCheck> = {}): ReadinessCheck {
  return {
    id: 'today',
    date,
    checkedAt: `${date}T10:00:00.000Z`,
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
    ...changes,
  };
}

const pike: TrialSkillPart = {
  trackId: 'push',
  stepExerciseId: 'pike-push-up',
  stepBelowExerciseId: 'push-up',
  passedOn: '2026-11-19',
};

/** A draft whose walk, carry and stairs are finished, still on the stairs. */
function draftAtStairs(parts: TrialSkillPart[], readiness = check()): TrialDraft {
  const draft = createTrialDraft(
    'three-mile-trial',
    date,
    readiness,
    `${date}T10:30:00.000Z`,
    'tm-draft',
    parts,
  );
  draft.currentPhaseIndex = 2;
  draft.phaseResults[0] = {
    phaseId: 'three-mile-walk',
    metrics: { distanceMiles: 3, durationMinutes: 52, rpe: 6 },
    responses: { knee: 'Fine', back: 'Fine', recoveryAfterFiveMinutes: 'Settled' },
  };
  draft.phaseResults[1] = {
    phaseId: 'suitcase-carry',
    metrics: { loadPounds: 30, rightSeconds: 60, leftSeconds: 60 },
    responses: { grip: 'easy', core: 'easy', posture: 'easy' },
  };
  draft.phaseResults[2] = { phaseId: 'stair-test', metrics: { flights: 3, breathlessness: 4 } };
  return draft;
}

function pikeSession(): WorkoutSession {
  return {
    id: 'pike',
    date: '2026-11-19',
    workoutDefinitionId: 'chapter-2-forge-b',
    readinessId: 'old',
    outcome: 'completed',
    completedAt: '2026-11-19T09:00:00.000Z',
    definitionSnapshot: {
      id: 'chapter-2-forge-b',
      title: 'Forge B',
      exercises: [{ exerciseId: 'pike-push-up', sets: 3, reps: '8–12' }],
    },
    exerciseResults: [
      {
        exerciseId: 'pike-push-up',
        painEvents: [],
        sets: [1, 2, 3].map((set) => ({
          completed: true,
          reps: 10,
          ...(set === 3 ? { rpe: 6 } : {}),
        })),
      },
    ],
  };
}

async function render(options: { draft?: TrialDraft; readiness?: ReadinessCheck } = {}) {
  const state = {
    campaign: signal<Campaign | null>(campaign),
    readiness: signal<ReadinessCheck | null>(options.readiness ?? check()),
    today: signal(date),
    loading: signal(false),
    error: signal<string | null>(null),
    beforeDayOne: computed(() => false),
    initialize: vi.fn(async () => undefined),
  };
  const history = {
    activeDraft: vi.fn(async () => options.draft),
    forTrial: vi.fn(async (id: string) => (id === 'gate-trial' ? [gatePass] : [])),
    startDraft: vi.fn(),
    saveDraft: vi.fn(async (edited: TrialDraft) => ({ ...edited, revision: edited.revision + 1 })),
    recordPain: vi.fn(async () => undefined),
    finishDraft: vi.fn(),
  };
  const progression = {
    load: vi.fn(async () => ({
      sessions: [pikeSession()],
      readinessById: new Map(),
      dayOf: campaignDayResolver(campaign.startDate, [gatePass]),
    })),
  };
  TestBed.configureTestingModule({
    imports: [ThreeMileTrialActivePage],
    providers: [
      provideRouter([]),
      { provide: CampaignState, useValue: state },
      { provide: TrialHistory, useValue: history },
      { provide: ProgressionHistory, useValue: progression },
    ],
  });
  const fixture = TestBed.createComponent(ThreeMileTrialActivePage);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Opening the Three-Mile Trial');
  });
  return { fixture, root, history };
}

function button(root: HTMLElement, text: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(text),
  );
  if (!found) throw new Error(`No button "${text}"`);
  return found as HTMLButtonElement;
}

describe('Three-Mile Trial skill parts', () => {
  it('names the skill parts before the attempt begins', async () => {
    const { root } = await render();
    expect(root.textContent).toContain('Six parts, in order');
    expect(root.querySelector('.skill-preview')?.textContent).toContain('Pike Push-Up');
  });

  it('shows the skill part after the stairs and saves the outcome', async () => {
    const { root, fixture, history } = await render({ draft: draftAtStairs([pike]) });
    expect(root.querySelectorAll('.trial-progress button')).toHaveLength(6);
    button(root, 'Save and continue').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('#skill-parts-title')?.textContent).toContain('Skill part');
    });
    const part = root.querySelector('.skill-part')!;
    expect(part.querySelector('h3')?.textContent).toContain('Pike Push-Up');
    expect(part.textContent).toContain('3 × 10 pike push-ups');
    expect(part.textContent).toContain('Demonstrated the step below (Push-Up)');
    expect(part.textContent).not.toContain('Set aside for pain');
    expect(part.querySelector('details summary')?.textContent).toContain('How to do');

    button(root, 'Save and continue').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.textContent).toContain('Record how Pike Push-Up went.');
    });

    const below = part.querySelectorAll<HTMLInputElement>('.skill-choice input')[1];
    below.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelectorAll('.skill-part__set-fields input')).toHaveLength(3);
    });
    const saved = history.saveDraft.mock.calls.at(-1)![0] as TrialDraft;
    expect(saved.skillResults?.[0]).toMatchObject({
      outcome: 'step-below',
      exerciseIdDone: 'push-up',
    });
    expect(saved.currentPhaseIndex).toBe(2);
  });

  it('offers "Set aside for pain" only when the step’s gate is met', async () => {
    const sore = check({ neckPain: 2 });
    const gated: TrialSkillPart = {
      trackId: 'push',
      stepExerciseId: 'feet-elevated-pike-push-up',
      stepBelowExerciseId: 'pike-push-up',
      passedOn: '2026-11-19',
    };
    const { root, fixture } = await render({
      draft: draftAtStairs([gated], sore),
      readiness: sore,
    });
    button(root, 'Save and continue').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('.skill-part')?.textContent).toContain('Set aside for pain');
    });
  });

  it('leaves a trial without skill parts at five parts', async () => {
    const { root, fixture } = await render({ draft: draftAtStairs([]) });
    expect(root.querySelectorAll('.trial-progress button')).toHaveLength(5);
    button(root, 'Save and continue').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.textContent).toContain('Leadership reflection');
    });
    expect(root.querySelector('.skill-part')).toBeNull();
  });
});
