import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type {
  TrialAttempt,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
} from '../../../core/domain/models';
import {
  CARRY_DIFFICULTIES,
  THREE_MILE_CARRY_POUNDS,
  THREE_MILE_CARRY_SECONDS,
} from '../../../core/domain/three-mile-trial';
import type { SavedTrialResult } from '../../../core/domain/trial';
import { trialPhaseComplete, type TrialPainAction } from '../../../core/domain/trial-draft';
import { threeMileTrialDefinition } from '../../../core/program/chapter-two-trial.seed';
import { getExerciseGuide, getQuickHelpSteps } from '../../../core/program/exercise-guides';
import { getTrialWindow } from '../../../core/program/trial-window';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

const GREEN = 'Green · Ready';
const PHYSICAL_PHASES = 3;

/** An error that belongs to one field, so the page can mark and focus it. */
class FieldError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

function numeric(value: string, integer = false): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(
      integer ? 'Enter a whole number at or above zero.' : 'Enter a number at or above zero.',
    );
  }
  return parsed;
}

function shown(value: unknown): string {
  return typeof value === 'number' ? String(value) : '';
}

function blankModel() {
  return {
    fullWalk: false,
    walkMinutes: '',
    walkRpe: '',
    heartRate: '',
    splits: '',
    knee: '',
    back: '',
    recovery: '',
    load: String(THREE_MILE_CARRY_POUNDS),
    rightSeconds: '',
    leftSeconds: '',
    grip: '',
    core: '',
    posture: '',
    fullStairs: false,
    breathlessness: '',
    attentive: '',
    behavior: '',
    prayer: false,
  };
}

/** Records the Three-Mile Trial part by part; every entry is saved on this device as it goes. */
@Component({
  imports: [FormField, Icon, NgTemplateOutlet, RouterLink],
  selector: 'app-three-mile-trial-active-page',
  styleUrl: '../gate-trial-active-page/gate-trial-active-page.css',
  templateUrl: './three-mile-trial-active-page.html',
})
export class ThreeMileTrialActivePage implements OnInit, OnDestroy {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly trial = threeMileTrialDefinition;
  protected readonly shortDate = formatShortDate;
  protected readonly greenWords = GREEN;
  protected readonly carrySeconds = THREE_MILE_CARRY_SECONDS;
  protected readonly difficulties = CARRY_DIFFICULTIES;
  protected readonly carryGuide = getExerciseGuide('suitcase-carry');
  protected readonly carrySteps = getQuickHelpSteps('suitcase-carry') ?? [];
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly draft = signal<TrialDraft | null>(null);
  protected readonly otherDraft = signal<TrialDraft | null>(null);
  protected readonly completed = signal<SavedTrialResult | null>(null);
  protected readonly stopped = signal<TrialAttempt | null>(null);
  protected readonly phaseIndex = signal(0);
  protected readonly painOpen = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly confirmingStop = signal(false);
  protected readonly invalidField = signal<string | null>(null);
  protected readonly clock = signal(Date.now());
  private readonly campaignTrials = signal<TrialResult[]>([]);

  protected readonly model = signal(blankModel());
  protected readonly fields = form(this.model);
  protected readonly painModel = signal({
    bodyArea: '',
    otherArea: '',
    severity: '',
    actionTaken: '',
  });
  protected readonly painFields = form(this.painModel);
  protected readonly levels = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly painLevels = Array.from({ length: 11 }, (_, level) => level);
  protected readonly painAreas = ['Back', 'Shoulder', 'Neck', 'Knee'];
  protected readonly painActions: { id: TrialPainAction; label: string }[] = [
    { id: 'continue', label: 'Continue' },
    { id: 'reduce', label: 'Reduce' },
    { id: 'substitute', label: 'Substitute' },
    { id: 'end-exercise', label: 'End exercise' },
  ];

  private autosave?: ReturnType<typeof setTimeout>;
  private ticker?: ReturnType<typeof setInterval>;
  private writes: Promise<unknown> = Promise.resolve();

  protected readonly readiness = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check : null;
  });
  private readonly window = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? getTrialWindow(campaign.startDate, this.state.today(), this.campaignTrials(), this.trial.id)
      : null;
  });
  protected readonly closedMessage = computed(() => {
    const window = this.window();
    if (!window || this.state.beforeDayOne()) return null;
    if (window.pass)
      return `You passed the Three-Mile Trial on ${formatLongDate(window.pass.date)}.`;
    if (!window.chapter)
      return 'The Three-Mile Trial opens on the Monday after Chapter II’s Week 8.';
    if (window.attemptToday) return null;
    return `The next attempt is ${formatLongDate(window.nextAttempt ?? this.state.today())}. Attempts fall on Mondays and Thursdays until you pass.`;
  });
  protected readonly canStart = computed(() =>
    Boolean(
      this.state.campaign() &&
      !this.state.beforeDayOne() &&
      !this.closedMessage() &&
      !this.otherDraft() &&
      this.readiness()?.status === 'green',
    ),
  );
  protected readonly phase = computed(() => this.trial.phases[this.phaseIndex()]);
  protected readonly staleDate = computed(() => {
    const draft = this.draft();
    return !!draft && draft.date !== this.state.today();
  });
  protected readonly painBlocks = computed(
    () =>
      this.draft()?.painEvents.some(
        (event) => event.severity >= 3 || event.actionTaken !== 'continue',
      ) ?? false,
  );
  protected readonly physicalBlocked = computed(
    () =>
      this.phaseIndex() < PHYSICAL_PHASES &&
      (this.staleDate() || this.readiness()?.status !== 'green' || this.painBlocks()),
  );
  protected readonly holdMessage = computed(() => {
    const kept = 'Your partial work stays saved.';
    const draft = this.draft();
    if (draft && this.staleDate()) {
      return `This attempt began on ${formatShortDate(draft.date)}, so it can’t be completed on a later day. ${kept}`;
    }
    if (this.painBlocks()) {
      return `Pain or a reduced response changed this attempt, so the full trial waits for another Green day. ${kept}`;
    }
    const status = this.readiness()?.status;
    if (status === 'yellow' || status === 'red') {
      return `Today’s latest readiness check is ${status === 'yellow' ? 'Yellow · Reduce' : 'Red · Restore'}, so the full trial waits for a Green day. ${kept}`;
    }
    return `The full Three-Mile Trial waits for a same-day ${GREEN} check. ${kept}`;
  });
  protected readonly walkStart = computed(() => {
    const value = this.draft()?.phaseResults[0]?.metrics?.['walkStartedAt'];
    return typeof value === 'string' && Number.isFinite(Date.parse(value))
      ? Date.parse(value)
      : null;
  });
  protected readonly elapsed = computed(() => {
    const start = this.walkStart();
    const seconds = start === null ? 0 : Math.max(0, Math.floor((this.clock() - start) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });

  ngOnInit(): void {
    this.ticker = setInterval(() => this.clock.set(Date.now()), 1000);
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.ticker) clearInterval(this.ticker);
    if (this.autosave) {
      clearTimeout(this.autosave);
      if (this.draft()) void this.flush().catch(() => undefined);
    }
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const [draft, trials] = await Promise.all([
        this.history.activeDraft(),
        loadCampaignTrials(this.history),
      ]);
      this.campaignTrials.set(trials);
      if (draft?.trialId === this.trial.id) this.accept(draft);
      else this.otherDraft.set(draft ?? null);
    } catch {
      this.error.set('The trial could not open from local storage. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async retry(): Promise<void> {
    await this.state.retry();
    await this.load();
  }

  protected async start(): Promise<void> {
    if (!this.canStart() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      this.accept(await this.history.startDraft(this.state.today(), this.trial.id));
      this.revealPhase();
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected queueAutosave(): void {
    if (this.autosave) clearTimeout(this.autosave);
    if (this.invalidField()) {
      this.invalidField.set(null);
      this.error.set(null);
    }
    this.savedMessage.set('Saving progress…');
    this.autosave = setTimeout(() => void this.flush().catch((error) => this.fail(error)), 600);
  }

  protected invalid(field: string): 'true' | null {
    return this.invalidField() === field ? 'true' : null;
  }

  protected phaseComplete(index: number): boolean {
    const phase = this.draft()?.phaseResults[index];
    return !!phase && trialPhaseComplete(this.trial.id, phase, index);
  }

  protected metric(phase: TrialPhaseResult | undefined, key: string): string {
    const value = phase?.metrics?.[key];
    return value === undefined ? '—' : String(value);
  }

  protected response(phase: TrialPhaseResult | undefined, key: string): string {
    return phase?.responses?.[key] || '—';
  }

  protected async selectPhase(index: number): Promise<void> {
    const draft = this.draft();
    if (!draft || index < 0 || index > draft.currentPhaseIndex || index === this.phaseIndex())
      return;
    try {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      this.phaseIndex.set(index);
      this.reviewing.set(false);
      this.painOpen.set(false);
      this.confirmingStop.set(false);
      this.revealPhase();
    } catch (error) {
      this.fail(error);
    }
  }

  protected editRecord(): void {
    this.reviewing.set(false);
    this.confirmingStop.set(false);
    this.revealPhase();
  }

  protected async continuePhase(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.draft() || this.saving()) return;
    if (this.autosave) clearTimeout(this.autosave);
    this.saving.set(true);
    this.error.set(null);
    try {
      const index = this.phaseIndex();
      const partial = await this.flush();
      if (index < PHYSICAL_PHASES && this.physicalBlocked()) {
        throw new Error(
          'The full physical trial waits for a Green day. Stop and keep this attempt if needed.',
        );
      }
      if (!trialPhaseComplete(this.trial.id, partial.phaseResults[index], index)) {
        const gap = this.incomplete(index);
        throw gap ? new FieldError(gap.message, gap.field) : new Error('Finish this part first.');
      }
      if (index === this.trial.phases.length - 1) {
        this.reviewing.set(true);
      } else {
        await this.write((next) => {
          next.currentPhaseIndex = Math.max(next.currentPhaseIndex, index + 1);
          // The stair test ends the physical effort; the recovery check counts from here.
          if (
            index === PHYSICAL_PHASES - 1 &&
            !next.phaseResults[index].metrics?.['effortEndedAt']
          ) {
            next.phaseResults[index].metrics = {
              ...next.phaseResults[index].metrics,
              effortEndedAt: new Date().toISOString(),
            };
          }
        });
        this.phaseIndex.set(index + 1);
      }
      this.confirmingStop.set(false);
      this.savedMessage.set('Progress saved on this device.');
      this.revealPhase();
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmCompletion(): Promise<void> {
    const draft = this.draft();
    if (!draft || !this.reviewing() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      await this.writes;
      this.completed.set(await this.history.finishDraft(draft.id, 'completed'));
      this.draft.set(null);
      this.reveal('#completed-title', '.trial-back');
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected askStop(): void {
    this.painOpen.set(false);
    this.confirmingStop.set(true);
    this.reveal('#trial-stop-keep', '#trial-stop-keep', 'nearest');
  }

  protected cancelStop(): void {
    this.confirmingStop.set(false);
    this.reveal('#trial-stop-trigger', '#trial-stop-trigger', 'nearest');
  }

  protected async stop(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    if (this.autosave) clearTimeout(this.autosave);
    this.saving.set(true);
    this.error.set(null);
    try {
      try {
        await this.flush();
      } catch {
        // Stopping stays possible even when a typed field is invalid.
      }
      await this.writes;
      this.stopped.set(await this.history.finishDraft(draft.id, 'stopped'));
      this.draft.set(null);
      this.confirmingStop.set(false);
      this.reveal('#stopped-title', '.trial-back');
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async startTimer(): Promise<void> {
    if (this.phaseIndex() !== 0 || this.physicalBlocked()) return;
    try {
      await this.write((next) => {
        (next.phaseResults[0].metrics ??= {})['walkStartedAt'] = new Date().toISOString();
      });
      this.clock.set(Date.now());
    } catch (error) {
      this.fail(error);
    }
  }

  protected useElapsed(): void {
    const start = this.walkStart();
    if (start === null) return;
    const minutes = String(Math.max(0.1, Math.round((Date.now() - start) / 6000) / 10));
    this.model.update((value) => ({ ...value, walkMinutes: minutes }));
    this.queueAutosave();
  }

  protected openPain(): void {
    this.painOpen.set(true);
    this.confirmingStop.set(false);
    this.reveal('#trial-pain-title', '#trial-pain');
  }

  protected closePain(): void {
    this.painOpen.set(false);
    this.reveal('#trial-pain-trigger', '#trial-pain-trigger', 'nearest');
  }

  protected async recordPain(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    if (!draft || this.phaseIndex() >= PHYSICAL_PHASES) return;
    const values = this.painModel();
    const bodyArea = values.otherArea.trim() || values.bodyArea;
    try {
      const severity = numeric(values.severity, true);
      if (!bodyArea.trim()) throw new Error('Choose where you felt the pain, or name the place.');
      if (severity === undefined || severity > 10)
        throw new Error('Choose a pain level from 0 to 10.');
      if (!values.actionTaken) throw new Error('Choose what you did about the pain.');
      this.saving.set(true);
      if (this.autosave) clearTimeout(this.autosave);
      try {
        await this.flush();
      } catch {
        // A malformed unsaved field cannot delay an immediate pain record.
      }
      await this.history.recordPain(draft.id, {
        phaseId: this.trial.phases[this.phaseIndex()].id,
        bodyArea,
        severity,
        actionTaken: values.actionTaken as TrialPainAction,
      });
      const refreshed = await this.history.activeDraft();
      if (refreshed) this.draft.set(refreshed);
      this.painOpen.set(false);
      this.painModel.set({ bodyArea: '', otherArea: '', severity: '', actionTaken: '' });
      this.savedMessage.set('Pain note saved on this device.');
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  private flush(): Promise<TrialDraft> {
    const index = this.phaseIndex();
    return this.write((next) => {
      next.phaseResults[index] = this.phaseFromModel(next.phaseResults[index], index);
    });
  }

  private write(change: (draft: TrialDraft) => void): Promise<TrialDraft> {
    const operation = this.writes.then(async () => {
      const current = this.draft();
      if (!current) throw new Error('Begin the trial before saving.');
      const edited = structuredClone(current);
      change(edited);
      const saved = await this.history.saveDraft(edited);
      this.draft.set(saved);
      this.savedMessage.set('Progress saved on this device.');
      return saved;
    });
    this.writes = operation.catch(() => undefined);
    return operation;
  }

  private phaseFromModel(previous: TrialPhaseResult, index: number): TrialPhaseResult {
    const value = this.model();
    const kept = (key: string) => {
      const saved = previous.metrics?.[key];
      return typeof saved === 'string' ? { [key]: saved } : {};
    };
    const set = (key: string, number: number | undefined) =>
      number === undefined ? {} : { [key]: number };
    switch (index) {
      case 0:
        return {
          ...previous,
          metrics: {
            ...kept('walkStartedAt'),
            ...(value.fullWalk ? { distanceMiles: 3 } : {}),
            ...set('durationMinutes', numeric(value.walkMinutes)),
            ...set('rpe', numeric(value.walkRpe, true)),
            ...set('averageHeartRate', numeric(value.heartRate)),
          },
          responses: {
            knee: value.knee,
            back: value.back,
            recoveryAfterFiveMinutes: value.recovery,
            ...(value.splits.trim() ? { splits: value.splits } : {}),
          },
        };
      case 1:
        return {
          ...previous,
          metrics: {
            ...set('loadPounds', numeric(value.load)),
            ...set('rightSeconds', numeric(value.rightSeconds)),
            ...set('leftSeconds', numeric(value.leftSeconds)),
          },
          responses: { grip: value.grip, core: value.core, posture: value.posture },
        };
      case 2:
        return {
          ...previous,
          metrics: {
            ...kept('effortEndedAt'),
            ...(value.fullStairs ? { flights: 3 } : {}),
            ...set('breathlessness', numeric(value.breathlessness, true)),
          },
        };
      case 3:
        return { ...previous, responses: { attentive: value.attentive, behavior: value.behavior } };
      case 4:
        return { ...previous, metrics: { confirmed: value.prayer } };
      default:
        return previous;
    }
  }

  private accept(draft: TrialDraft): void {
    this.draft.set(draft);
    this.phaseIndex.set(draft.currentPhaseIndex);
    const [walk, carry, stairs, leadership, prayer] = draft.phaseResults;
    this.model.set({
      fullWalk: walk.metrics?.['distanceMiles'] === 3,
      walkMinutes: shown(walk.metrics?.['durationMinutes']),
      walkRpe: shown(walk.metrics?.['rpe']),
      heartRate: shown(walk.metrics?.['averageHeartRate']),
      splits: walk.responses?.['splits'] ?? '',
      knee: walk.responses?.['knee'] ?? '',
      back: walk.responses?.['back'] ?? '',
      recovery: walk.responses?.['recoveryAfterFiveMinutes'] ?? '',
      load: shown(carry.metrics?.['loadPounds']) || String(THREE_MILE_CARRY_POUNDS),
      rightSeconds: shown(carry.metrics?.['rightSeconds']),
      leftSeconds: shown(carry.metrics?.['leftSeconds']),
      grip: carry.responses?.['grip'] ?? '',
      core: carry.responses?.['core'] ?? '',
      posture: carry.responses?.['posture'] ?? '',
      fullStairs: stairs.metrics?.['flights'] === 3,
      breathlessness: shown(stairs.metrics?.['breathlessness']),
      attentive: leadership.responses?.['attentive'] ?? '',
      behavior: leadership.responses?.['behavior'] ?? '',
      prayer: prayer.metrics?.['confirmed'] === true,
    });
  }

  /** Names the first missing entry in the shown part, so the error can point at its field. */
  private incomplete(index: number): { field: string; message: string } | undefined {
    const value = this.model();
    const amount = (text: string) => (text.trim() ? Number(text) : Number.NaN);
    const rpe = amount(value.walkRpe);
    const breath = amount(value.breathlessness);
    const gaps: [boolean, string, string][][] = [
      [
        [!value.fullWalk, 'trial-full-walk', 'Confirm you walked the full 3 continuous miles.'],
        [
          !(amount(value.walkMinutes) > 0),
          'trial-walk-minutes',
          'Enter your walk time in minutes.',
        ],
        [
          !(Number.isInteger(rpe) && rpe >= 1 && rpe <= 10),
          'trial-rpe-1',
          'Choose your effort from 1 to 10.',
        ],
        [
          !!value.heartRate.trim() && !(amount(value.heartRate) > 0),
          'trial-heart-rate',
          'Enter your average heart rate, or leave it blank.',
        ],
        [!value.knee.trim(), 'trial-knee', 'Describe any knee discomfort, or write “none”.'],
        [!value.back.trim(), 'trial-back', 'Describe any back discomfort, or write “none”.'],
        [!value.recovery.trim(), 'trial-recovery', 'Describe your recovery after 5 minutes.'],
      ],
      [
        [
          !(amount(value.load) >= THREE_MILE_CARRY_POUNDS),
          'trial-carry-load',
          `The carry is written at ${THREE_MILE_CARRY_POUNDS} lb.`,
        ],
        [
          !(amount(value.rightSeconds) >= THREE_MILE_CARRY_SECONDS),
          'trial-carry-right',
          `Carry ${THREE_MILE_CARRY_SECONDS} seconds in your right hand.`,
        ],
        [
          !(amount(value.leftSeconds) >= THREE_MILE_CARRY_SECONDS),
          'trial-carry-left',
          `Carry ${THREE_MILE_CARRY_SECONDS} seconds in your left hand.`,
        ],
        [!value.grip, 'trial-grip-easy', 'Choose how hard the carry was on your grip.'],
        [!value.core, 'trial-core-easy', 'Choose how hard the carry was on your core.'],
        [!value.posture, 'trial-posture-easy', 'Choose how hard it was to hold your posture.'],
      ],
      [
        [
          !value.fullStairs,
          'trial-full-stairs',
          'Confirm you climbed three flights at a steady pace.',
        ],
        [
          !(Number.isInteger(breath) && breath >= 1 && breath <= 10),
          'trial-breath-1',
          'Rate your breathlessness from 1 to 10.',
        ],
      ],
      [
        [!value.attentive.trim(), 'trial-attentive', 'Answer the attentiveness question.'],
        [!value.behavior.trim(), 'trial-behavior', 'Name one behavior to change.'],
      ],
      [[!value.prayer, 'trial-prayer', 'Confirm you read Psalm 121 and prayed for your family.']],
    ];
    const gap = gaps[index]?.find(([missing]) => missing);
    return gap ? { field: gap[1], message: gap[2] } : undefined;
  }

  private revealPhase(): void {
    this.reveal(this.reviewing() ? '#review-title' : '.trial-phase h2', '.trial-progress');
  }

  private reveal(
    focusSelector: string,
    scrollSelector = focusSelector,
    block: ScrollLogicalPosition = 'start',
  ): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const reduced =
          typeof matchMedia === 'function' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches;
        root
          .querySelector<HTMLElement>(scrollSelector)
          ?.scrollIntoView?.({ block, behavior: reduced ? 'auto' : 'smooth' });
        root.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  private fail(error: unknown): void {
    this.error.set(
      error instanceof Error ? error.message : 'The trial could not be saved. Try again.',
    );
    this.savedMessage.set(null);
    this.invalidField.set(error instanceof FieldError ? error.field : null);
    if (error instanceof FieldError) this.reveal(`#${error.field}`, `#${error.field}`, 'center');
  }
}
