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
  TrialCircuitMovement,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
  TrialSkillOutcome,
  TrialSkillPart,
  TrialSkillPartResult,
} from '../../../core/domain/models';
import { PLAN_FIELDS, STAND_IN_MINUTES } from '../../../core/domain/high-country-trial';
import type { SavedTrialResult } from '../../../core/domain/trial';
import {
  nextTrialPiece,
  openTrialPiece,
  trialPhaseComplete,
  type TrialPainAction,
} from '../../../core/domain/trial-draft';
import {
  SKILL_PARTS_PHASE_ID,
  skillPartDose,
  skillPartsComplete,
  skillPartsForTrial,
  stepPainGated,
} from '../../../core/domain/trial-skill-parts';
import { highCountryTrialDefinition } from '../../../core/program/chapter-three-trial.seed';
import { getExerciseGuide, getQuickHelpSteps } from '../../../core/program/exercise-guides';
import { trackStepOf } from '../../../core/program/skill-tracks';
import { getTrialWindow } from '../../../core/program/trial-window';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { exerciseName, skillOutcomeWords } from '../skill-part-words';

const GREEN = 'Green · Ready';
const CIRCUIT = 4;
const ESTIMATES = [1, 2, 3] as const;

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
    standIn: false,
    weatherReason: '',
    direction: '',
    junctions: '',
    expectedDistance: '',
    expectedElevation: '',
    turnaroundPoint: '',
    turnaroundTime: '',
    hikeMinutes: '',
    distance: '',
    gain: '',
    rpe: '',
    knee: '',
    back: '',
    terrain: '',
    estimate1: '',
    actual1: '',
    estimate2: '',
    actual2: '',
    estimate3: '',
    actual3: '',
    quietDone: false,
    reflection: '',
  };
}

type Model = ReturnType<typeof blankModel>;

/** The pre-start plan's questions, worded for the hike or for the stand-in's paper map. */
const PLAN_LABELS: Record<(typeof PLAN_FIELDS)[number], [string, string]> = {
  direction: ['Direction', 'Route on the map'],
  junctions: ['Major junctions', 'Junctions'],
  expectedDistance: ['Expected distance', 'Expected distance'],
  expectedElevation: ['Expected elevation', 'Expected gain'],
  turnaroundPoint: ['Turnaround point', 'Turnaround point'],
  turnaroundTime: ['Turnaround time', 'Turnaround time'],
};

type Ending =
  | { kind: 'completed'; result: SavedTrialResult }
  | { kind: 'stopped'; attempt: TrialAttempt; hikeKept: boolean }
  | { kind: 'postponed'; attempt: TrialAttempt };

/**
 * Records the High Country Trial piece by piece: the hike on one Green day, the circuit (and
 * any skill parts) on a later one. Every entry is saved on this device as it goes.
 */
@Component({
  imports: [FormField, Icon, NgTemplateOutlet, RouterLink],
  selector: 'app-high-country-trial-active-page',
  styleUrls: [
    '../gate-trial-active-page/gate-trial-active-page.css',
    './high-country-trial-active-page.css',
  ],
  templateUrl: './high-country-trial-active-page.html',
})
export class HighCountryTrialActivePage implements OnInit, OnDestroy {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  private readonly progression = inject(ProgressionHistory);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly trial = highCountryTrialDefinition;
  protected readonly movements = highCountryTrialDefinition.phases[CIRCUIT].circuit!.movements;
  protected readonly rounds = [1, 2] as const;
  protected readonly estimates = ESTIMATES;
  protected readonly planFields = PLAN_FIELDS;
  protected readonly standInMinutes = STAND_IN_MINUTES;
  protected readonly shortDate = formatShortDate;
  protected readonly greenWords = GREEN;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly draft = signal<TrialDraft | null>(null);
  protected readonly otherDraft = signal<TrialDraft | null>(null);
  protected readonly ending = signal<Ending | null>(null);
  protected readonly phaseIndex = signal(0);
  protected readonly painOpen = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly confirmingStop = signal(false);
  protected readonly postponing = signal(false);
  protected readonly postponeReason = signal('');
  protected readonly invalidField = signal<string | null>(null);
  private readonly campaignTrials = signal<TrialResult[]>([]);
  protected readonly skillView = signal(false);
  protected readonly previewParts = signal<TrialSkillPart[]>([]);
  protected readonly skillParts = computed(() => this.draft()?.definitionSnapshot.skillParts ?? []);
  protected readonly skillDone = computed(() => {
    const draft = this.draft();
    return !!draft && skillPartsComplete(draft.skillResults, draft.definitionSnapshot);
  });

  protected readonly model = signal<Model>(blankModel());
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
    if (window.pass) {
      return `You passed the High Country Trial on ${formatLongDate(window.pass.date)}.`;
    }
    if (!window.chapter) {
      return 'The High Country Trial opens after Chapter III’s Week 12, on any day you choose.';
    }
    if (window.attemptToday) return null;
    return `The High Country Trial opens ${formatLongDate(window.firstAttempt ?? this.state.today())}, after Week 12, on any day you choose.`;
  });
  protected readonly green = computed(() => this.readiness()?.status === 'green');
  protected readonly open = computed(() => {
    const draft = this.draft();
    return draft ? openTrialPiece(draft) : null;
  });
  /** The piece waiting to start, once the earlier one is finished (or a postponed hike). */
  protected readonly next = computed(() => {
    const draft = this.draft();
    return draft ? nextTrialPiece(draft) : null;
  });
  protected readonly hikeDoneOn = computed(
    () =>
      this.draft()?.pieces?.find((piece) => piece.pieceId === 'hike' && piece.completedAt)?.date ??
      null,
  );
  /** Whether the next piece can start today: a later day than the hike, Green, trial open. */
  protected readonly nextWaitMessage = computed(() => {
    const next = this.next();
    if (!next) return null;
    const hike = this.hikeDoneOn();
    if (next.id === 'circuit' && hike && this.state.today() <= hike) {
      return 'The hike is saved and stays done. Take the circuit on a later Green day. Within 48 hours is the target, not a rule.';
    }
    if (this.closedMessage()) return this.closedMessage();
    if (!this.green()) {
      return `${next.title} waits for a same-day ${GREEN} check.`;
    }
    return null;
  });
  protected readonly canStart = computed(() =>
    Boolean(
      this.state.campaign() &&
      !this.state.beforeDayOne() &&
      !this.closedMessage() &&
      !this.otherDraft() &&
      this.green(),
    ),
  );
  protected readonly phase = computed(() => this.trial.phases[this.phaseIndex()]);
  protected readonly standIn = computed(() => this.model().standIn);
  protected readonly staleDate = computed(() => {
    const open = this.open();
    return !!open && open.record.date !== this.state.today();
  });
  /** On the trail the turnaround is at pain 4; in the circuit the usual 3. */
  protected readonly painLimit = computed(() => this.open()?.piece.painLimit ?? 3);
  protected readonly painBlocks = computed(() => {
    const open = this.open();
    if (!open) return false;
    return (this.draft()?.painEvents ?? []).some((event) => {
      const index = this.trial.phases.findIndex((phase) => phase.id === event.trialPhaseId);
      const inPiece =
        (index >= open.piece.firstPhase && index <= open.piece.lastPhase) ||
        (event.trialPhaseId === SKILL_PARTS_PHASE_ID && open.piece.id === 'circuit');
      return (
        inPiece && (event.severity >= open.piece.painLimit || event.actionTaken !== 'continue')
      );
    });
  });
  protected readonly physicalBlocked = computed(
    () => this.staleDate() || !this.green() || this.painBlocks(),
  );
  protected readonly holdMessage = computed(() => {
    const kept = 'Your entries stay saved.';
    const open = this.open();
    if (open && this.staleDate()) {
      return `${open.piece.title} began on ${formatShortDate(open.record.date)}, so it can’t be finished on a later day. ${kept}`;
    }
    if (this.painBlocks()) {
      return open?.piece.id === 'hike'
        ? `Pain reached 4 or more, or changed how you moved. Turn back; this hike waits for another Green day. ${kept}`
        : `Pain or a reduced response changed the circuit, so it waits for another Green day. ${kept}`;
    }
    const status = this.readiness()?.status;
    if (status === 'yellow' || status === 'red') {
      return `Today’s latest readiness check is ${status === 'yellow' ? 'Yellow · Reduce' : 'Red · Restore'}, so this piece waits for a Green day. ${kept}`;
    }
    return `This piece waits for a same-day ${GREEN} check. ${kept}`;
  });

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.autosave) {
      clearTimeout(this.autosave);
      if (this.open()) void this.flush().catch(() => undefined);
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
      if (!draft) await this.loadPreview();
    } catch {
      this.error.set('The trial could not open from local storage. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPreview(): Promise<void> {
    try {
      this.previewParts.set(skillPartsForTrial(this.trial.id, await this.progression.load()));
    } catch {
      this.previewParts.set([]);
    }
  }

  protected planLabel(field: (typeof PLAN_FIELDS)[number]): string {
    return PLAN_LABELS[field][this.standIn() ? 1 : 0];
  }

  protected planId(field: string): string {
    return `trial-plan-${field}`;
  }

  protected outcomeWords(result: TrialSkillPartResult | undefined): string {
    return skillOutcomeWords(result);
  }

  protected exerciseName(id: string | undefined): string {
    return exerciseName(id);
  }

  protected passedWhen(id: string | undefined): string {
    const found = id ? trackStepOf(id) : undefined;
    return found?.track.steps[found.index].passedWhen ?? '';
  }

  protected helpSteps(id: string): string[] {
    return getQuickHelpSteps(id) ?? [];
  }

  protected hasPictures(id: string): boolean {
    const guide = getExerciseGuide(id);
    return !!guide && !guide.textOnly;
  }

  protected dose(movement: TrialCircuitMovement): string {
    const amount = movement.reps ?? movement.durationSeconds ?? 0;
    const unit = movement.reps !== undefined ? '' : ' seconds';
    return `${amount}${unit}${movement.perSide ? ' per side' : ''}`;
  }

  protected stationDone(round: number, exerciseId: string): boolean {
    return !!this.draft()
      ?.phaseResults[CIRCUIT]?.circuitRounds?.find((item) => item.round === round)
      ?.movements.some((movement) => movement.exerciseId === exerciseId);
  }

  protected roundDone(round: number): boolean {
    return this.movements.every((movement) => this.stationDone(round, movement.exerciseId));
  }

  /** Marks one station of one round done as written, or clears it. */
  protected async toggleStation(round: number, movement: TrialCircuitMovement): Promise<void> {
    if (this.saving()) return;
    const done = !this.stationDone(round, movement.exerciseId);
    try {
      await this.write((next) => {
        const phase = next.phaseResults[CIRCUIT];
        const rounds = structuredClone(phase.circuitRounds ?? []);
        let entry = rounds.find((item) => item.round === round);
        if (!entry) {
          entry = { round, movements: [] };
          rounds.push(entry);
        }
        entry.movements = entry.movements.filter((item) => item.exerciseId !== movement.exerciseId);
        if (done) {
          entry.movements.push({
            exerciseId: movement.exerciseId,
            ...(movement.reps !== undefined
              ? movement.perSide
                ? { repsBySide: { left: movement.reps, right: movement.reps } }
                : { reps: movement.reps }
              : movement.perSide
                ? {
                    durationSecondsBySide: {
                      left: movement.durationSeconds,
                      right: movement.durationSeconds,
                    },
                  }
                : { durationSeconds: movement.durationSeconds }),
          });
          // Keep stations in the written order.
          entry.movements.sort(
            (a, b) =>
              this.movements.findIndex((item) => item.exerciseId === a.exerciseId) -
              this.movements.findIndex((item) => item.exerciseId === b.exerciseId),
          );
        }
        phase.circuitRounds = rounds
          .filter((item) => item.movements.length)
          .sort((a, b) => a.round - b.round);
      });
    } catch (error) {
      this.fail(error);
    }
  }

  protected skillResult(index: number): TrialSkillPartResult | undefined {
    return this.draft()?.skillResults?.[index];
  }

  protected canSetAside(part: TrialSkillPart): boolean {
    return stepPainGated(part.stepExerciseId, this.readiness());
  }

  protected doseFor(index: number): { sets: number[]; unit: 'reps' | 'seconds' } | null {
    const done = this.skillResult(index)?.exerciseIdDone;
    const dose = done ? skillPartDose(done) : undefined;
    return dose
      ? { sets: Array.from({ length: dose.sets }, (_, set) => set), unit: dose.unit }
      : null;
  }

  protected setValue(index: number, set: number, unit: 'reps' | 'seconds'): string {
    const value = this.skillResult(index)?.sets?.[set]?.[unit];
    return value === undefined ? '' : String(value);
  }

  protected async chooseSkillOutcome(index: number, outcome: TrialSkillOutcome): Promise<void> {
    const part = this.skillParts()[index];
    if (!part) return;
    const done =
      outcome === 'demonstrated'
        ? part.stepExerciseId
        : outcome === 'step-below'
          ? part.stepBelowExerciseId
          : undefined;
    try {
      await this.write((next) => {
        const previous = next.skillResults![index];
        next.skillResults![index] = {
          trackId: part.trackId,
          stepExerciseId: part.stepExerciseId,
          outcome,
          ...(done ? { exerciseIdDone: done } : {}),
          ...(done && previous.exerciseIdDone === done && previous.sets
            ? { sets: previous.sets }
            : {}),
        };
      });
    } catch (error) {
      this.fail(error);
    }
  }

  protected async recordSkillSet(
    index: number,
    set: number,
    unit: 'reps' | 'seconds',
    event: Event,
  ): Promise<void> {
    const text = (event.target as HTMLInputElement).value;
    try {
      const value = numeric(text, true);
      const sets = this.doseFor(index)?.sets.length ?? 0;
      await this.write((next) => {
        const result = next.skillResults![index];
        const list = Array.from({ length: sets }, (_, item) => ({ ...result.sets?.[item] }));
        if (value === undefined) delete list[set][unit];
        else list[set][unit] = value;
        result.sets = list;
      });
    } catch (error) {
      this.fail(error);
    }
  }

  protected async retry(): Promise<void> {
    await this.state.retry();
    await this.load();
  }

  /** Begin the trial with the hike today. */
  protected async start(): Promise<void> {
    if (!this.canStart() || this.saving()) return;
    await this.busy(async () => {
      this.accept(await this.history.startDraft(this.state.today(), this.trial.id));
      this.revealPhase();
    });
  }

  /** Begin the next piece today: the circuit after the hike, or a postponed hike again. */
  protected async startNext(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.nextWaitMessage() || this.saving()) return;
    await this.busy(async () => {
      this.accept(await this.history.startPiece(draft.id, this.state.today()));
      this.revealPhase();
    });
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

  protected chooseStandIn(standIn: boolean): void {
    this.model.update((value) => ({ ...value, standIn }));
    this.queueAutosave();
  }

  protected invalid(field: string): 'true' | null {
    return this.invalidField() === field ? 'true' : null;
  }

  protected phaseComplete(index: number): boolean {
    const phase = this.draft()?.phaseResults[index];
    return !!phase && trialPhaseComplete(this.trial.id, phase, index);
  }

  /** A part can be opened when it belongs to the open piece and has been reached. */
  protected canSelect(index: number): boolean {
    const open = this.open();
    const draft = this.draft();
    return (
      !!open &&
      !!draft &&
      index >= open.piece.firstPhase &&
      index <= open.piece.lastPhase &&
      index <= draft.currentPhaseIndex
    );
  }

  protected async selectPhase(index: number): Promise<void> {
    if (!this.canSelect(index) || (index === this.phaseIndex() && !this.skillView())) return;
    try {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      this.phaseIndex.set(index);
      this.skillView.set(false);
      this.closePanels();
      this.revealPhase();
    } catch (error) {
      this.fail(error);
    }
  }

  protected async openSkill(): Promise<void> {
    if (!this.skillParts().length || !this.phaseComplete(CIRCUIT) || this.skillView()) return;
    try {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      this.phaseIndex.set(CIRCUIT);
      this.skillView.set(true);
      this.closePanels();
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
    const open = this.open();
    if (!this.draft() || !open || this.saving()) return;
    if (this.autosave) clearTimeout(this.autosave);
    await this.busy(async () => {
      const index = this.phaseIndex();
      const partial = await this.flush();
      if (index > 0 && this.physicalBlocked()) {
        throw new Error('This piece waits for a Green day. Postpone or stop it if needed.');
      }
      if (!trialPhaseComplete(this.trial.id, partial.phaseResults[index], index)) {
        const gap = this.incomplete(index);
        throw gap ? new FieldError(gap.message, gap.field) : new Error('Finish this part first.');
      }
      if (index === open.piece.lastPhase && open.piece.id === 'hike') {
        if (this.physicalBlocked()) throw new Error(this.holdMessage());
        this.accept(await this.history.completePiece(partial.id));
        this.savedMessage.set('The hike is saved. It stays done.');
        this.reveal('#hike-saved-title', '.trial-back');
        return;
      }
      if (index === CIRCUIT) {
        if (this.skillParts().length && !this.skillView()) {
          this.skillView.set(true);
        } else {
          if (this.skillParts().length && !this.skillDone()) {
            const missing = this.skillParts().findIndex(
              (_, item) => !this.skillResult(item)?.outcome,
            );
            throw new FieldError(
              `Record how ${this.exerciseName(this.skillParts()[missing]?.stepExerciseId)} went.`,
              `trial-skill-${missing}-demonstrated`,
            );
          }
          // The end of physical effort: the recovery check counts from here.
          await this.write((next) => {
            const metrics = next.phaseResults[CIRCUIT].metrics ?? {};
            if (!metrics['effortEndedAt']) {
              next.phaseResults[CIRCUIT].metrics = {
                ...metrics,
                effortEndedAt: new Date().toISOString(),
              };
            }
          });
          this.reviewing.set(true);
        }
      } else {
        await this.write((next) => {
          next.currentPhaseIndex = Math.max(next.currentPhaseIndex, index + 1);
        });
        this.phaseIndex.set(index + 1);
      }
      this.confirmingStop.set(false);
      this.savedMessage.set('Progress saved on this device.');
      this.revealPhase();
    });
  }

  protected async confirmCompletion(): Promise<void> {
    const draft = this.draft();
    if (!draft || !this.reviewing() || this.saving()) return;
    await this.busy(async () => {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      await this.writes;
      const result = await this.history.finishDraft(draft.id, 'completed');
      this.ending.set({ kind: 'completed', result });
      this.draft.set(null);
      this.reveal('#completed-title', '.trial-back');
    });
  }

  protected askStop(): void {
    this.painOpen.set(false);
    this.postponing.set(false);
    this.confirmingStop.set(true);
    this.reveal('#trial-stop-keep', '#trial-stop-keep', 'nearest');
  }

  protected askPostpone(): void {
    this.painOpen.set(false);
    this.confirmingStop.set(false);
    this.postponing.set(true);
    this.reveal('#trial-postpone-title', '#trial-postpone', 'nearest');
  }

  protected cancelStop(): void {
    this.confirmingStop.set(false);
    this.postponing.set(false);
    this.reveal('#trial-stop-trigger', '#trial-stop-trigger', 'nearest');
  }

  protected async stop(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    const hikeKept = !!this.hikeDoneOn();
    await this.busy(async () => {
      await this.settle();
      const attempt = await this.history.finishDraft(draft.id, 'stopped');
      this.ending.set({ kind: 'stopped', attempt, hikeKept });
      this.draft.set(hikeKept ? ((await this.history.activeDraft()) ?? null) : null);
      this.closePanels();
      this.reveal('#stopped-title', '.trial-back');
    });
  }

  protected async postpone(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    await this.busy(async () => {
      await this.settle();
      const attempt = await this.history.postponePiece(draft.id, this.postponeReason());
      this.ending.set({ kind: 'postponed', attempt });
      this.draft.set((await this.history.activeDraft()) ?? null);
      this.postponeReason.set('');
      this.closePanels();
      this.reveal('#postponed-title', '.trial-back');
    });
  }

  /** Leave an ending screen and return to the open draft, such as a circuit to try again. */
  protected dismissEnding(): void {
    const draft = this.draft();
    this.ending.set(null);
    if (draft) this.accept(draft);
  }

  protected openPain(): void {
    this.painOpen.set(true);
    this.confirmingStop.set(false);
    this.postponing.set(false);
    this.reveal('#trial-pain-title', '#trial-pain');
  }

  protected closePain(): void {
    this.painOpen.set(false);
    this.reveal('#trial-pain-trigger', '#trial-pain-trigger', 'nearest');
  }

  protected async recordPain(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    if (!draft || !this.open()) return;
    const values = this.painModel();
    const bodyArea = values.otherArea.trim() || values.bodyArea;
    try {
      const severity = numeric(values.severity, true);
      if (!bodyArea.trim()) throw new Error('Choose where you felt the pain, or name the place.');
      if (severity === undefined || severity > 10) {
        throw new Error('Choose a pain level from 0 to 10.');
      }
      if (!values.actionTaken) throw new Error('Choose what you did about the pain.');
      this.saving.set(true);
      if (this.autosave) clearTimeout(this.autosave);
      try {
        await this.flush();
      } catch {
        // A malformed unsaved field cannot delay an immediate pain record.
      }
      await this.history.recordPain(draft.id, {
        phaseId: this.skillView() ? SKILL_PARTS_PHASE_ID : this.trial.phases[this.phaseIndex()].id,
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

  protected metric(phase: TrialPhaseResult | undefined, key: string): string {
    const value = phase?.metrics?.[key];
    return value === undefined ? '—' : String(value);
  }

  protected response(phase: TrialPhaseResult | undefined, key: string): string {
    return phase?.responses?.[key] || '—';
  }

  private async busy(work: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  /** Save what can be saved before an attempt ends; an invalid field never blocks stopping. */
  private async settle(): Promise<void> {
    if (this.autosave) clearTimeout(this.autosave);
    try {
      await this.flush();
    } catch {
      // Stopping stays possible even when a typed field is invalid.
    }
    await this.writes;
  }

  private closePanels(): void {
    this.reviewing.set(false);
    this.painOpen.set(false);
    this.confirmingStop.set(false);
    this.postponing.set(false);
  }

  private flush(): Promise<TrialDraft> {
    const index = this.phaseIndex();
    if (!this.open()) return Promise.resolve(this.draft()!);
    return this.write((next) => {
      next.phaseResults[index] = this.phaseFromModel(next.phaseResults[index], index);
      // The stand-in choice belongs to the hike, wherever it was made.
      if (index === 0) {
        next.phaseResults[1] = this.phaseFromModel(next.phaseResults[1], 1);
      }
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
    const set = (key: string, number: number | undefined) =>
      number === undefined ? {} : { [key]: number };
    const text = (key: string, entry: string) => (entry.trim() ? { [key]: entry } : {});
    switch (index) {
      case 0:
        return {
          ...previous,
          responses: Object.fromEntries(PLAN_FIELDS.map((field) => [field, value[field]])),
        };
      case 1:
        return {
          ...previous,
          metrics: {
            ...(value.standIn ? { standIn: true } : {}),
            ...set('durationMinutes', numeric(value.hikeMinutes)),
            ...set('distanceMiles', numeric(value.distance)),
            ...set('elevationGainFeet', numeric(value.gain)),
            ...set('rpe', numeric(value.rpe, true)),
          },
          responses: {
            knee: value.knee,
            back: value.back,
            ...(value.standIn ? text('terrain', value.terrain) : {}),
            ...(value.standIn ? text('weatherReason', value.weatherReason) : {}),
          },
        };
      case 2:
        return {
          ...previous,
          responses: Object.fromEntries(
            ESTIMATES.flatMap((n) => [
              [`estimate-${n}`, value[`estimate${n}`]],
              [`actual-${n}`, value[`actual${n}`]],
            ]).filter(([, entry]) => entry.trim()),
          ),
        };
      case 3:
        return {
          ...previous,
          metrics: { quietMinutesDone: value.quietDone },
          responses: { reflection: value.reflection },
        };
      default:
        return previous;
    }
  }

  private accept(draft: TrialDraft): void {
    this.draft.set(draft);
    const open = openTrialPiece(draft);
    this.phaseIndex.set(
      open ? Math.max(draft.currentPhaseIndex, open.piece.firstPhase) : draft.currentPhaseIndex,
    );
    this.skillView.set(false);
    this.closePanels();
    const [plan, hike, estimates, high] = draft.phaseResults;
    const responses = plan.responses ?? {};
    this.model.set({
      ...blankModel(),
      standIn: hike.metrics?.['standIn'] === true,
      weatherReason: hike.responses?.['weatherReason'] ?? '',
      ...Object.fromEntries(PLAN_FIELDS.map((field) => [field, responses[field] ?? ''])),
      hikeMinutes: shown(hike.metrics?.['durationMinutes']),
      distance: shown(hike.metrics?.['distanceMiles']),
      gain: shown(hike.metrics?.['elevationGainFeet']),
      rpe: shown(hike.metrics?.['rpe']),
      knee: hike.responses?.['knee'] ?? '',
      back: hike.responses?.['back'] ?? '',
      terrain: hike.responses?.['terrain'] ?? '',
      estimate1: estimates.responses?.['estimate-1'] ?? '',
      actual1: estimates.responses?.['actual-1'] ?? '',
      estimate2: estimates.responses?.['estimate-2'] ?? '',
      actual2: estimates.responses?.['actual-2'] ?? '',
      estimate3: estimates.responses?.['estimate-3'] ?? '',
      actual3: estimates.responses?.['actual-3'] ?? '',
      quietDone: high.metrics?.['quietMinutesDone'] === true,
      reflection: high.responses?.['reflection'] ?? '',
    });
  }

  /** Names the first missing entry in the shown part, so the error can point at its field. */
  private incomplete(index: number): { field: string; message: string } | undefined {
    const value = this.model();
    const amount = (entry: string) => (entry.trim() ? Number(entry) : Number.NaN);
    const rpe = amount(value.rpe);
    const gaps: [boolean, string, string][][] = [
      PLAN_FIELDS.map((field) => [
        !value[field].trim(),
        this.planId(field),
        `Write down the ${this.planLabel(field).toLowerCase()} before you set out.`,
      ]),
      [
        [
          !(amount(value.hikeMinutes) >= (value.standIn ? STAND_IN_MINUTES : Number.EPSILON)),
          'trial-hike-minutes',
          value.standIn
            ? `The stand-in is one continuous walk of at least ${STAND_IN_MINUTES} minutes.`
            : 'Enter your hike time in minutes.',
        ],
        [!(amount(value.distance) > 0), 'trial-hike-distance', 'Enter the distance in miles.'],
        [
          !!value.gain.trim() && !(amount(value.gain) >= 0),
          'trial-hike-gain',
          'Enter the elevation gain in feet, or leave it blank.',
        ],
        [
          !(Number.isInteger(rpe) && rpe >= 1 && rpe <= 10),
          'trial-rpe-1',
          'Choose your effort from 1 to 10.',
        ],
        [!value.knee.trim(), 'trial-knee', 'Describe how your knees responded, or write “fine”.'],
        [!value.back.trim(), 'trial-back', 'Describe how your back responded, or write “fine”.'],
        [
          value.standIn && !value.terrain,
          'trial-terrain-outdoor',
          'Choose where you walked: outdoors or an indoor track.',
        ],
      ],
      [
        [
          !value.estimate1.trim(),
          'trial-estimate-1',
          'Write where you think you are before checking your phone.',
        ],
      ],
      [
        [!value.quietDone, 'trial-quiet', 'Confirm the 5 quiet minutes.'],
        [!value.reflection.trim(), 'trial-reflection', 'Write your answer to the question.'],
      ],
      [[true, 'trial-round-1', 'Mark each station of both rounds as you finish it.']],
    ];
    const gap = gaps[index]?.find(([missing]) => missing);
    return gap ? { field: gap[1], message: gap[2] } : undefined;
  }

  private revealPhase(): void {
    this.reveal(
      this.reviewing()
        ? '#review-title'
        : this.skillView()
          ? '#skill-parts-title'
          : '.trial-phase h2',
      '.trial-progress',
    );
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
