import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  CompletedSet,
  DeepReadonly,
  ExercisePrescription,
  TrialResult,
  WorkoutDraft,
  WorkoutSession,
  WorkoutStep,
} from '../../../core/domain/models';
import { getExerciseGuide, getQuickHelpSteps } from '../../../core/program/exercise-guides';
import { resolveCampaignPosition } from '../../../core/program/campaign-position';
import { getWorkoutChoices, isWorkoutPlanned } from '../../../core/program/chapter-orders';
import {
  compareWithLastTime,
  exerciseProgress,
  type ProgressionContext,
} from '../../../core/program/progression';
import {
  FIRST_TIME_LINE,
  NO_LOAD_LINE,
  type ProgressLine,
  compareLines,
  easierLine,
  hintCopy,
  lastTimeTitle,
  setLabel,
} from '../../../core/program/progression-copy';
import {
  chapterPrograms,
  formatChapterNumeral,
  isRestorationWorkout,
  loadWorkout,
} from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { formatShortDate } from '../../../shared/format-date';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { MissionRecorder, type RecordedMission } from '../../../core/state/mission-recorder';
import { Icon } from '../../../shared/icon/icon';
import { ProgressRows } from '../../../shared/progress-rows/progress-rows';
import { REST_LENGTHS, RestClock, formatRest, restLengthLabel } from './rest-clock';

type Panel = 'help' | 'pain' | 'substitute' | null;

function numericValue(value: string, label: string, integer: boolean, min = 0): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return number;
}

function firstPending(draft: WorkoutDraft): { exercise: number; set: number } {
  for (let exercise = 0; exercise < draft.exerciseResults.length; exercise++) {
    const set = draft.exerciseResults[exercise].sets.findIndex(
      (item) => item.completed === undefined,
    );
    if (set !== -1) return { exercise, set };
  }
  return { exercise: draft.exerciseResults.length, set: 0 };
}

const REST_LENGTH_KEY = 'rangers-road.rest-length';

function readRestLength(): number {
  try {
    const value = Number(localStorage.getItem(REST_LENGTH_KEY));
    return (REST_LENGTHS as readonly number[]).includes(value) ? value : 0;
  } catch {
    return 0;
  }
}

@Component({
  imports: [FormField, Icon, ProgressRows, RouterLink],
  selector: 'app-forge-session-page',
  styleUrl: './forge-session-page.css',
  templateUrl: './forge-session-page.html',
})
export class ForgeSessionPage implements OnInit, OnDestroy {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(WorkoutHistory);
  private readonly trialHistory = inject(TrialHistory);
  private readonly route = inject(ActivatedRoute);
  protected readonly workoutId = this.route.snapshot.paramMap.get('workoutId') ?? '';
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly draft = signal<WorkoutDraft | null>(null);
  protected readonly otherDraft = signal<WorkoutDraft | null>(null);
  protected readonly savedSession = signal<WorkoutSession | null>(null);
  protected readonly missionRecorded = signal<RecordedMission | null>(null);
  private readonly recorder = inject(MissionRecorder);
  private readonly schedule = inject(ScheduleHistory);
  private readonly completedTrials = signal<TrialResult[]>([]);
  protected readonly panel = signal<Panel>(null);
  protected readonly recordingSet = signal(false);
  protected readonly helpExerciseId = signal<string | null>(null);
  protected readonly restSeconds = signal(0);
  protected readonly restPaused = signal(false);
  protected readonly restHidden = signal(false);
  protected readonly restLength = signal(readRestLength());
  protected readonly restLengths = REST_LENGTHS;
  protected readonly restLengthLabel = restLengthLabel;
  private readonly restClock = new RestClock();
  private restChimed = false;
  private audio: AudioContext | null = null;
  private readonly progressionHistory = inject(ProgressionHistory);
  /** Saved sessions behind Last time and the hint; unset until loaded, and context only. */
  private readonly progressionContext = signal<ProgressionContext | null>(null);
  protected readonly effortLevels = Array.from({ length: 10 }, (_, index) => String(index + 1));
  protected readonly effortNotes: Readonly<Record<string, string>> = {
    '1': 'easy',
    '7': '2–3 reps left',
    '10': 'nothing left',
  };
  /** "Compared with last time" for the session just saved; empty until there is something to say. */
  protected readonly comparison = signal<ProgressLine[]>([]);
  protected readonly noLoadLine = NO_LOAD_LINE;
  protected readonly firstTimeLine = FIRST_TIME_LINE;
  protected readonly shortDate = formatShortDate;
  private restInterval?: ReturnType<typeof setInterval>;
  private panelTrigger: HTMLElement | null = null;

  protected readonly setModel = signal({ reps: '', duration: '', load: '', rpe: '' });
  protected readonly setForm = form(this.setModel);
  protected readonly painModel = signal({ bodyArea: '', severity: '', actionTaken: '' });
  protected readonly painForm = form(this.painModel);
  protected readonly painAreas = ['Back', 'Shoulder', 'Neck', 'Knee'];
  protected readonly painLevels = Array.from({ length: 11 }, (_, level) => level);
  protected readonly painActions = ['Continue', 'Reduce mission', 'Substitute', 'End exercise'];
  protected readonly modificationModel = signal({ note: '' });
  protected readonly modificationForm = form(this.modificationModel);
  protected readonly finishModel = signal({ sessionRpe: '', notes: '' });
  protected readonly finishForm = form(this.finishModel);

  protected readonly definition = computed(() => loadWorkout(this.workoutId));
  /** Today's chapter and week, from Day 1 and the saved trial passes. */
  private readonly position = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? resolveCampaignPosition(campaign.startDate, this.state.today(), this.completedTrials())
      : null;
  });
  /** Today's orders with any make-up applied, so a Forge session moved here can start. */
  private readonly todayOrders = computed(() => {
    const campaign = this.state.campaign();
    const today = this.state.today();
    return campaign
      ? this.schedule.dayFor(campaign.startDate, today, today, this.completedTrials())
      : null;
  });
  /** The chapter day a saved draft was started on, or today. */
  private readonly sessionDay = computed(() => {
    const campaign = this.state.campaign();
    const date = this.draft()?.date ?? this.state.today();
    return campaign
      ? this.schedule.dayFor(campaign.startDate, date, this.state.today(), this.completedTrials())
      : null;
  });
  /** Today's chapter; Chapter I before Day 1. */
  protected readonly program = computed(
    () => this.position()?.chapter.program ?? chapterPrograms[0],
  );
  protected readonly chapterNumeral = computed(() =>
    formatChapterNumeral(this.program().chapter.number),
  );
  protected readonly currentPrescription = computed(() => {
    const draft = this.draft();
    return draft?.definitionSnapshot.exercises[draft.currentExerciseIndex] ?? null;
  });
  protected readonly currentResult = computed(() => {
    const draft = this.draft();
    return draft?.exerciseResults[draft.currentExerciseIndex] ?? null;
  });
  protected readonly currentSet = computed(() => {
    const draft = this.draft();
    return draft?.exerciseResults[draft.currentExerciseIndex]?.sets[draft.currentSetIndex] ?? null;
  });
  /** The final set of an exercise asks for the effort that next time's hint relies on. */
  protected readonly isFinalSet = computed(() => {
    const draft = this.draft();
    const result = this.currentResult();
    return !!draft && !!result && draft.currentSetIndex === result.sets.length - 1;
  });
  /** Last time, a step-up's easier version, and the hint for the exercise on screen. */
  protected readonly lastTime = computed(() => {
    const context = this.progressionContext();
    const prescription = this.currentPrescription();
    if (!context || !prescription) return null;
    const progress = exerciseProgress(
      prescription,
      { date: this.state.today(), readiness: this.readiness()?.status ?? null },
      context,
    );
    if (progress.kind === 'none') return null;
    const sets = (progress.last?.sets ?? []).map((set) => setLabel(set));
    return {
      title: lastTimeTitle(progress),
      date: progress.last?.date,
      sets,
      effort: progress.last?.finalEffort,
      easier: progress.easier ? easierLine(progress.easier) : undefined,
      hint: progress.hint ? hintCopy(progress.hint) : undefined,
      noLoad: progress.noLoadRecorded,
    };
  });
  protected readonly currentName = computed(
    () => getExerciseGuide(this.currentPrescription()?.exerciseId ?? '')?.name ?? 'Movement',
  );
  protected readonly helpGuide = computed(() =>
    getExerciseGuide(this.helpExerciseId() ?? this.currentPrescription()?.exerciseId ?? ''),
  );
  protected readonly helpSteps = computed(
    () =>
      getQuickHelpSteps(this.helpExerciseId() ?? this.currentPrescription()?.exerciseId ?? '') ??
      [],
  );
  protected readonly helpMediaBase = computed(() => {
    const id = this.helpExerciseId() ?? this.currentPrescription()?.exerciseId;
    return id ? `images/exercises/${id}` : '';
  });
  protected readonly readiness = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check : null;
  });
  protected readonly weekNote = computed(() => {
    const chapter = this.todayOrders();
    return chapter?.program.workoutPlan(this.workoutId, chapter.contentWeek).note;
  });
  /** A deload week's set guide, from the week the session was started in. */
  protected readonly volumeGuide = computed(() => {
    const chapter = this.sessionDay();
    return chapter?.program.workoutPlan(this.workoutId, chapter.contentWeek).volumeGuide;
  });
  protected readonly completedSets = computed(
    () =>
      this.draft()?.exerciseResults.reduce(
        (total, result) => total + result.sets.filter((set) => set.completed === true).length,
        0,
      ) ?? 0,
  );
  protected readonly skippedSets = computed(
    () =>
      this.draft()?.exerciseResults.reduce(
        (total, result) => total + result.sets.filter((set) => set.completed === false).length,
        0,
      ) ?? 0,
  );
  protected readonly planned = computed(() => {
    const chapter = this.todayOrders();
    return chapter ? isWorkoutPlanned(chapter, this.workoutId) : false;
  });
  protected readonly allowed = computed(() => {
    const chapter = this.todayOrders();
    return Boolean(
      chapter && !this.chapterComplete() && getWorkoutChoices(chapter).includes(this.workoutId),
    );
  });
  protected readonly chapterComplete = computed(() => !!this.position()?.awaitingNextChapter);
  protected readonly isRestoration = isRestorationWorkout(this.workoutId);
  protected readonly painLocked = computed(
    () =>
      !this.isRestoration &&
      Boolean(
        this.draft()?.exerciseResults.some((result) =>
          result.painEvents.some((event) => event.severity >= 5),
        ),
      ),
  );
  protected readonly blocked = computed(() => {
    const draft = this.draft();
    if (draft && draft.date !== this.state.today())
      return 'This session was started on another day. Save the partial work and start fresh today.';
    if (this.chapterComplete())
      return `Chapter ${this.chapterNumeral()} is complete. Save this session as partial work.`;
    if (!this.readiness()) return 'Check readiness today before training.';
    if (!this.isRestoration && this.readiness()?.status === 'red')
      return 'Red readiness means no strength work today.';
    if (this.painLocked())
      return 'Pain reached 5 or more. End this strength session; the work so far will be saved.';
    return null;
  });
  protected readonly allSetsMarked = computed(() =>
    Boolean(
      this.draft()?.exerciseResults.every((result) =>
        result.sets.every((set) => set.completed !== undefined),
      ),
    ),
  );

  ngOnInit(): void {
    void this.load();
    this.restInterval = setInterval(() => this.updateRest(), 1000);
  }

  ngOnDestroy(): void {
    if (this.restInterval) clearInterval(this.restInterval);
    void this.audio?.close().catch(() => undefined);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const [active, completedTrials] = await Promise.all([
        this.history.active(),
        loadCampaignTrials(this.trialHistory),
        this.schedule.refresh(),
      ]);
      this.completedTrials.set(completedTrials);
      await this.loadProgression();
      if (active?.workoutDefinitionId === this.workoutId) {
        this.draft.set(active);
        this.syncForms(active);
      } else {
        this.otherDraft.set(active ?? null);
      }
    } catch {
      this.error.set('This session could not open from local storage. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /** A stopped session is partial work, so only a finished one is set beside last time. */
  private async loadComparison(session: WorkoutSession): Promise<void> {
    this.comparison.set([]);
    if (session.outcome === 'stopped') return;
    try {
      const context = await this.progressionHistory.load();
      this.comparison.set(compareLines(compareWithLastTime(session, context.sessions)));
    } catch {
      // Reference only: the saved session stands without it.
    }
  }

  /** Last time and the hint are reference only: a storage error leaves the screen without them. */
  private async loadProgression(): Promise<void> {
    try {
      this.progressionContext.set(await this.progressionHistory.load());
    } catch {
      this.progressionContext.set(null);
    }
  }

  protected async start(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const definition = this.definition();
      const chapter = this.todayOrders();
      if (!definition || !chapter || !this.allowed()) return;
      const { note, reduced } = chapter.program.workoutPlan(this.workoutId, chapter.contentWeek);
      const draft = await this.history.start({
        date: this.state.today(),
        definition,
        reduced,
        sessionInstructions: note ? [note] : undefined,
      });
      this.draft.set(draft);
      this.syncForms(draft);
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected stepLabel(step: DeepReadonly<WorkoutStep>): string {
    if (step.kind === 'walk') return `${step.minutes} min easy walk`;
    return `${getExerciseGuide(step.prescription.exerciseId)?.name ?? step.prescription.exerciseId} · ${this.dose(step.prescription)}`;
  }

  protected dose(prescription: DeepReadonly<ExercisePrescription>): string {
    const dose =
      prescription.reps !== undefined
        ? `${prescription.reps} reps`
        : `${prescription.durationSeconds ?? prescription.duration} sec`;
    return `${dose}${prescription.perSide ? ' per side' : ''}`;
  }

  protected prescriptionLine(prescription: DeepReadonly<ExercisePrescription>): string {
    const pieces = [
      `${prescription.sets ?? 1} ${prescription.sets === 1 ? 'set' : 'sets'} × ${this.dose(prescription)}`,
    ];
    if (prescription.rpeTarget !== undefined) pieces.push(`at RPE about ${prescription.rpeTarget}`);
    if (prescription.notes) pieces.push(prescription.notes);
    return pieces.join(' · ');
  }

  protected getExerciseName(exerciseId: string): string {
    return getExerciseGuide(exerciseId)?.name ?? exerciseId;
  }

  protected countMarked(draft: WorkoutDraft, exerciseIndex: number): number {
    return (
      draft.exerciseResults[exerciseIndex]?.sets.filter((set) => set.completed !== undefined)
        .length ?? 0
    );
  }

  protected async finishWarmup(): Promise<void> {
    await this.save((draft) => {
      draft.warmupComplete = true;
    });
  }

  protected async selectSet(exercise: number, set: number): Promise<void> {
    if (this.blocked()) return;
    await this.save((draft) => {
      draft.currentExerciseIndex = exercise;
      draft.currentSetIndex = set;
      draft.restStartedAt = undefined;
    });
  }

  protected async markSet(completed: boolean): Promise<void> {
    if (this.restLength()) this.prepareAudio();
    const draft = this.draft();
    const prescription = this.currentPrescription();
    if (!draft || !prescription || this.blocked()) return;
    this.error.set(null);
    try {
      const values = this.setModel();
      const set: CompletedSet = { completed };
      if (completed) {
        if (prescription.reps !== undefined) {
          const reps = numericValue(values.reps, 'reps completed', true);
          if (reps === undefined)
            throw new Error('Enter the reps you completed, or skip this set.');
          set.reps = reps;
        }
        if (prescription.durationSeconds !== undefined || prescription.duration !== undefined) {
          const duration = numericValue(values.duration, 'seconds completed', false);
          if (duration === undefined)
            throw new Error('Enter the seconds you completed, or skip this set.');
          set.duration = duration;
        }
        set.load = numericValue(values.load, 'load in pounds', false);
        set.rpe = numericValue(values.rpe, 'effort from 1 to 10', true, 1);
        if (set.rpe !== undefined && set.rpe > 10) throw new Error('Effort must be from 1 to 10.');
      }
      await this.save((next) => {
        next.exerciseResults[draft.currentExerciseIndex].sets[draft.currentSetIndex] = set;
        if (!completed) next.reduced = true;
        const pending = firstPending(next);
        next.currentExerciseIndex = pending.exercise;
        next.currentSetIndex = pending.set;
        next.restStartedAt =
          completed && pending.exercise < next.exerciseResults.length
            ? new Date().toISOString()
            : undefined;
      });
    } catch (error) {
      this.showError(error);
    }
  }

  protected prepareSet(): void {
    if (this.recordingSet()) {
      void this.markSet(true);
      return;
    }
    const prescription = this.currentPrescription();
    if (!prescription) return;
    const values = this.setModel();
    this.setModel.set({
      ...values,
      reps: values.reps || (typeof prescription.reps === 'number' ? String(prescription.reps) : ''),
      duration:
        values.duration ||
        (typeof prescription.durationSeconds === 'number'
          ? String(prescription.durationSeconds)
          : typeof prescription.duration === 'number'
            ? String(prescription.duration)
            : ''),
    });
    this.recordingSet.set(true);
    requestAnimationFrame(() => {
      document.getElementById('actual-set')?.scrollIntoView({ block: 'center', behavior: 'auto' });
      // The final set opens on its effort scale, so a keyboard would only cover it.
      if (this.isFinalSet()) return;
      document.getElementById('set-reps')?.focus({ preventScroll: true });
      document.getElementById('set-duration')?.focus({ preventScroll: true });
    });
  }

  protected openHelp(exerciseId?: string): void {
    this.rememberPanelTrigger();
    this.helpExerciseId.set(exerciseId ?? this.currentPrescription()?.exerciseId ?? null);
    this.panel.set('help');
    this.focusPanel();
  }

  protected openPanel(panel: Panel): void {
    this.rememberPanelTrigger();
    this.helpExerciseId.set(this.currentPrescription()?.exerciseId ?? null);
    if (panel === 'substitute')
      this.modificationForm().reset({ note: this.currentResult()?.modificationNotes ?? '' });
    this.panel.set(panel);
    this.error.set(null);
    this.focusPanel();
  }

  protected closePanel(): void {
    this.panel.set(null);
    requestAnimationFrame(() => this.panelTrigger?.focus());
  }

  protected choosePainArea(area: string): void {
    this.painModel.update((value) => ({ ...value, bodyArea: area }));
  }

  protected choosePainLevel(level: number): void {
    this.painModel.update((value) => ({ ...value, severity: String(level) }));
  }

  protected choosePainAction(action: string): void {
    this.painModel.update((value) => ({ ...value, actionTaken: action }));
  }

  protected async recordPain(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    const exerciseId = this.helpExerciseId() ?? this.currentPrescription()?.exerciseId;
    if (!draft || !exerciseId || this.saving()) return;
    const values = this.painModel();
    try {
      const severity = numericValue(values.severity, 'pain level from 0 to 10', true);
      if (
        severity === undefined ||
        severity > 10 ||
        !values.bodyArea.trim() ||
        !values.actionTaken.trim()
      ) {
        throw new Error('Enter the pain area, level from 0 to 10, and what you did.');
      }
      this.saving.set(true);
      await this.history.recordPain(draft.id, {
        bodyArea: values.bodyArea,
        severity,
        exerciseId,
        actionTaken: values.actionTaken,
      });
      let updated = await this.history.active();
      this.draft.set(updated ?? null);
      if (
        updated &&
        values.actionTaken === 'End exercise' &&
        (severity < 5 || this.isRestoration)
      ) {
        const changed = structuredClone(updated);
        const index = changed.exerciseResults.findIndex(
          (result) => result.exerciseId === exerciseId,
        );
        if (index >= 0) {
          changed.exerciseResults[index].sets = changed.exerciseResults[index].sets.map((set) =>
            set.completed === undefined ? { completed: false } : set,
          );
          const pending = firstPending(changed);
          changed.currentExerciseIndex = pending.exercise;
          changed.currentSetIndex = pending.set;
          changed.reduced = true;
          updated = await this.history.saveDraft(changed);
        }
      }
      this.draft.set(updated ?? null);
      if (updated) this.syncForms(updated);
      this.painForm().reset({ bodyArea: '', severity: '', actionTaken: '' });
      if (values.actionTaken === 'Substitute' && severity < 5) {
        this.modificationForm().reset({
          note:
            updated?.exerciseResults.find((result) => result.exerciseId === exerciseId)
              ?.modificationNotes ?? '',
        });
        this.panel.set('substitute');
        this.focusPanel();
      } else {
        this.closePanel();
      }
      if (severity >= 5 && !this.isRestoration) {
        this.error.set(
          'Pain reached 5 or more. End this strength session and save the partial work.',
        );
      }
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveModification(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    if (!draft) return;
    const note = this.modificationModel().note.trim();
    if (!note) {
      this.error.set('Describe the change you made.');
      return;
    }
    const exerciseId = this.helpExerciseId() ?? this.currentPrescription()?.exerciseId;
    const index = draft.exerciseResults.findIndex((result) => result.exerciseId === exerciseId);
    if (index < 0) return;
    await this.save((next) => {
      next.exerciseResults[index].modificationNotes = note;
      next.reduced = true;
    });
    if (!this.error()) this.closePanel();
  }

  protected async markFinish(optional: boolean): Promise<void> {
    await this.save((draft) => {
      if (optional) draft.optionalFinishComplete = true;
      else draft.finishComplete = true;
    });
  }

  protected async complete(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    try {
      await this.state.initialize();
    } catch (error) {
      this.showError(error);
      return;
    }
    if (this.blocked()) return;
    if (!this.allSetsMarked()) {
      this.error.set('Mark each set done or skipped before finishing.');
      return;
    }
    try {
      const values = this.finishModel();
      const sessionRpe = numericValue(values.sessionRpe, 'session effort from 1 to 10', true, 1);
      if (sessionRpe !== undefined && sessionRpe > 10)
        throw new Error('Session effort must be from 1 to 10.');
      this.saving.set(true);
      const updated = await this.history.saveDraft({
        ...structuredClone(draft),
        sessionRpe,
        notes: values.notes.trim() || undefined,
      });
      const session = await this.history.complete(updated.id);
      this.savedSession.set(session);
      await this.recordMission(session);
      this.draft.set(null);
      void this.loadComparison(session);
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async stop(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const session = await this.history.stop(draft.id);
      this.savedSession.set(session);
      await this.recordMission(session);
      this.draft.set(null);
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  /** The work is already saved; recording today's mission is a courtesy that can fail quietly. */
  private async recordMission(session: WorkoutSession): Promise<void> {
    try {
      this.missionRecorded.set(
        await this.recorder.recordToday(
          { workoutId: session.workoutDefinitionId, restoration: this.isRestoration },
          { reduced: session.outcome === 'stopped' || !!session.reduced },
        ),
      );
    } catch {
      this.missionRecorded.set(null);
    }
  }

  protected restLabel(): string {
    return formatRest(this.restSeconds());
  }

  protected toggleRestPause(): void {
    if (this.restClock.paused) this.restClock.resume();
    else this.restClock.pause();
    if (this.restLength()) this.prepareAudio();
    this.restPaused.set(this.restClock.paused);
    this.updateRest();
  }

  protected resetRest(): void {
    this.restClock.reset();
    this.restChimed = false;
    if (this.restLength()) this.prepareAudio();
    this.updateRest();
  }

  protected setRestLength(value: string): void {
    const seconds = Number(value);
    this.restLength.set(seconds);
    this.restChimed = false;
    try {
      localStorage.setItem(REST_LENGTH_KEY, String(seconds));
    } catch {
      // The choice still applies for this session.
    }
    if (seconds) this.prepareAudio();
    this.updateRest();
  }

  private async save(edit: (draft: WorkoutDraft) => void): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      if (this.blocked()) return;
      const changed = structuredClone(draft);
      edit(changed);
      const saved = await this.history.saveDraft(changed);
      this.draft.set(saved);
      this.syncForms(saved);
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  private syncForms(draft: WorkoutDraft): void {
    const set = draft.exerciseResults[draft.currentExerciseIndex]?.sets[draft.currentSetIndex];
    this.recordingSet.set(set?.completed === true);
    this.setForm().reset({
      reps: set?.reps?.toString() ?? '',
      duration: set?.duration?.toString() ?? '',
      load: set?.load?.toString() ?? '',
      rpe: set?.rpe?.toString() ?? '',
    });
    this.finishForm().reset({
      sessionRpe: draft.sessionRpe?.toString() ?? '',
      notes: draft.notes ?? '',
    });
    this.updateRest();
  }

  private updateRest(): void {
    const started = this.draft()?.restStartedAt;
    this.restClock.sync(started);
    this.restSeconds.set(this.restClock.elapsed());
    this.restPaused.set(this.restClock.paused);
    const target = this.restLength();
    if (!started) {
      this.restChimed = false;
      this.restHidden.set(false);
    } else if (target && !this.restClock.paused && this.restSeconds() >= target) {
      if (!this.restChimed) this.chime();
      this.restChimed = true;
    } else if (target && this.restSeconds() < target) {
      this.restChimed = false;
    }
  }

  /**
   * Audio can only start from a tap, so the context is made when a set is marked. Phones
   * suspend an idle context (screen lock, other audio, a quiet minute), so every rest tap
   * wakes it again rather than only the first.
   */
  private prepareAudio(): void {
    try {
      if (!this.audio || this.audio.state === 'closed') {
        const Context =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        this.audio = Context ? new Context() : null;
      }
      if (this.audio && this.audio.state !== 'running')
        void this.audio.resume().catch(() => undefined);
    } catch {
      this.audio = null;
    }
  }

  /** A soft two-note chime; the screen still shows when the rest length is reached. */
  private chime(): void {
    const context = this.audio;
    if (!context || context.state === 'closed') return;
    if (context.state !== 'running') {
      context.resume().then(
        () => this.playChime(context),
        () => undefined,
      );
      return;
    }
    this.playChime(context);
  }

  private playChime(context: AudioContext): void {
    try {
      [523, 659].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.25;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.65);
      });
    } catch {
      // A chime is a courtesy.
    }
  }

  private showError(error: unknown): void {
    this.error.set(
      error instanceof Error ? error.message : 'This change could not be saved. Try again.',
    );
  }

  private rememberPanelTrigger(): void {
    this.panelTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private focusPanel(): void {
    requestAnimationFrame(() => {
      const panel = document.getElementById('session-panel');
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      panel?.scrollIntoView({ block: 'start', behavior });
      panel?.focus({ preventScroll: true });
    });
  }
}
