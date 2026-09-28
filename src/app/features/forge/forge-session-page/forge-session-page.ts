import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  CompletedSet,
  DeepReadonly,
  ExercisePrescription,
  WorkoutDraft,
  WorkoutSession,
  WorkoutStep,
} from '../../../core/domain/models';
import type { PreviousWorkoutLoad } from '../../../core/domain/workout';
import { getChapterOneExerciseGuide } from '../../../core/program/chapter-one-exercise-guides';
import { getChapterOneQuickHelpSteps } from '../../../core/program/chapter-one-quick-help';
import {
  chapterOneWorkoutsForDate,
  chapterOneWorkoutIsPlanned,
} from '../../../core/program/chapter-one-workout-access';
import { getChapterOneSchedule } from '../../../core/program/campaign';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import {
  chapterOneWorkoutWeekNote,
  loadChapterOneWorkout,
} from '../../../core/program/chapter-one-workouts';
import { CampaignState } from '../../../core/state/campaign-state';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

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

@Component({
  imports: [FormField, Icon, RouterLink],
  selector: 'app-forge-session-page',
  styleUrl: './forge-session-page.css',
  templateUrl: './forge-session-page.html',
})
export class ForgeSessionPage implements OnInit, OnDestroy {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(WorkoutHistory);
  private readonly route = inject(ActivatedRoute);
  protected readonly workoutId = this.route.snapshot.paramMap.get('workoutId') ?? '';
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly draft = signal<WorkoutDraft | null>(null);
  protected readonly otherDraft = signal<WorkoutDraft | null>(null);
  protected readonly savedSession = signal<WorkoutSession | null>(null);
  protected readonly panel = signal<Panel>(null);
  protected readonly recordingSet = signal(false);
  protected readonly helpExerciseId = signal<string | null>(null);
  protected readonly restSeconds = signal(0);
  protected readonly previousLoad = signal<PreviousWorkoutLoad | null>(null);
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

  protected readonly definition = computed(() => loadChapterOneWorkout(this.workoutId));
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
  protected readonly currentName = computed(
    () =>
      getChapterOneExerciseGuide(this.currentPrescription()?.exerciseId ?? '')?.name ?? 'Movement',
  );
  protected readonly helpGuide = computed(() =>
    getChapterOneExerciseGuide(
      this.helpExerciseId() ?? this.currentPrescription()?.exerciseId ?? '',
    ),
  );
  protected readonly helpSteps = computed(
    () =>
      getChapterOneQuickHelpSteps(
        this.helpExerciseId() ?? this.currentPrescription()?.exerciseId ?? '',
      ) ?? [],
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
    const campaign = this.state.campaign();
    if (!campaign) return undefined;
    const schedule = getChapterOneSchedule(campaign.startDate, this.state.today());
    return schedule ? chapterOneWorkoutWeekNote(this.workoutId, schedule.contentWeek) : undefined;
  });
  protected readonly planned = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? chapterOneWorkoutIsPlanned(campaign.startDate, this.state.today(), this.workoutId)
      : false;
  });
  protected readonly allowed = computed(() => {
    const campaign = this.state.campaign();
    return Boolean(
      campaign &&
      campaign.currentChapterId === chapterOneDefinition.id &&
      chapterOneWorkoutsForDate(campaign.startDate, this.state.today()).includes(this.workoutId),
    );
  });
  protected readonly isRestoration = this.workoutId === 'chapter-1-restoration';
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
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const active = await this.history.active();
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

  protected async start(): Promise<void> {
    const definition = this.definition();
    const campaign = this.state.campaign();
    if (!definition || !campaign || !this.allowed() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const schedule = getChapterOneSchedule(campaign.startDate, this.state.today());
      const note = this.weekNote();
      const reduced = schedule?.contentWeek === 4 && !this.isRestoration;
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
    return `${getChapterOneExerciseGuide(step.prescription.exerciseId)?.name ?? step.prescription.exerciseId} · ${this.dose(step.prescription)}`;
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
    return getChapterOneExerciseGuide(exerciseId)?.name ?? exerciseId;
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
    if (!draft || this.saving() || this.blocked()) return;
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
      this.draft.set(null);
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
      this.draft.set(null);
    } catch (error) {
      this.showError(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected restLabel(): string {
    const total = this.restSeconds();
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  private async save(edit: (draft: WorkoutDraft) => void): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
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
    void this.loadPreviousLoad(draft.exerciseResults[draft.currentExerciseIndex]?.exerciseId);
  }

  private async loadPreviousLoad(exerciseId?: string): Promise<void> {
    this.previousLoad.set(null);
    if (!exerciseId) return;
    try {
      const load = await this.history.previousLoad(exerciseId);
      if (
        this.draft()?.exerciseResults[this.draft()!.currentExerciseIndex]?.exerciseId === exerciseId
      ) {
        this.previousLoad.set(load ?? null);
      }
    } catch {
      // Prior load is context only. A storage error will surface on the next edit.
    }
  }

  private updateRest(): void {
    const started = this.draft()?.restStartedAt;
    this.restSeconds.set(
      started ? Math.max(0, Math.floor((Date.now() - Date.parse(started)) / 1000)) : 0,
    );
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
