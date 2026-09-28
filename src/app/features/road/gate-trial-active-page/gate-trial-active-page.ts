import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type {
  TrialAttempt,
  TrialCircuitMovement,
  TrialCircuitMovementResult,
  TrialDraft,
  TrialPhaseResult,
} from '../../../core/domain/models';
import type { SavedGateTrialResult } from '../../../core/domain/trial';
import { gateTrialPhaseComplete, type TrialPainAction } from '../../../core/domain/trial-draft';
import { getChapterOneExerciseGuide } from '../../../core/program/chapter-one-exercise-guides';
import { getChapterOneQuickHelpSteps } from '../../../core/program/chapter-one-quick-help';
import { gateTrialDefinition } from '../../../core/program/chapter-one-trial.seed';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

type Station = { round: number; index: number };

function numeric(value: string, integer = false): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(integer ? 'Enter a whole number at or above zero.' : 'Enter a number at or above zero.');
  }
  return parsed;
}

function displayNumber(value: unknown): string {
  return typeof value === 'number' ? String(value) : '';
}

@Component({
  imports: [FormField, Icon, RouterLink],
  selector: 'app-gate-trial-active-page',
  styleUrl: './gate-trial-active-page.css',
  templateUrl: './gate-trial-active-page.html',
})
export class GateTrialActivePage implements OnInit, OnDestroy {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  protected readonly trial = gateTrialDefinition;
  protected readonly circuit = gateTrialDefinition.phases[1].circuit!;
  protected readonly shortDate = formatShortDate;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly draft = signal<TrialDraft | null>(null);
  protected readonly completed = signal<SavedGateTrialResult | null>(null);
  protected readonly stopped = signal<TrialAttempt | null>(null);
  protected readonly phaseIndex = signal(0);
  protected readonly station = signal<Station | null>(null);
  protected readonly helpOpen = signal(false);
  protected readonly painOpen = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly clock = signal(Date.now());

  protected readonly model = signal({
    fullWalk: false,
    walkMinutes: '', walkRpe: '', heartRate: '', knee: '', back: '', recovery: '',
    restMinutes: '', circuitMinutes: '',
    body: '', character: '', family: '',
    psalmAndPrayer: false, prayerMinutes: '', identity: '', oath: '',
  });
  protected readonly fields = form(this.model);
  protected readonly stationModel = signal({ amount: '', left: '', right: '', setup: '', load: '' });
  protected readonly stationFields = form(this.stationModel);
  protected readonly painModel = signal({ bodyArea: '', severity: '', actionTaken: '' });
  protected readonly painFields = form(this.painModel);
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
  protected readonly canStart = computed(() =>
    Boolean(this.state.campaign() && !this.state.beforeDayOne() && this.readiness()?.status === 'green'),
  );
  protected readonly phase = computed(() => this.trial.phases[this.phaseIndex()]);
  protected readonly movement = computed(() => {
    const cursor = this.station();
    return cursor ? this.circuit.movements[cursor.index] : null;
  });
  protected readonly guide = computed(() => {
    const movement = this.movement();
    return movement ? getChapterOneExerciseGuide(movement.exerciseId) : undefined;
  });
  protected readonly guideSteps = computed(() => {
    const movement = this.movement();
    return movement ? getChapterOneQuickHelpSteps(movement.exerciseId) ?? [] : [];
  });
  protected readonly guideBase = computed(() => {
    const movement = this.movement();
    return movement ? `/images/exercises/${movement.exerciseId}` : '';
  });
  protected readonly staleDate = computed(() => {
    const draft = this.draft();
    return !!draft && draft.date !== this.state.today();
  });
  protected readonly painBlocks = computed(() =>
    this.draft()?.painEvents.some((event) => event.severity >= 3 || event.actionTaken !== 'continue') ?? false,
  );
  protected readonly physicalBlocked = computed(() =>
    this.phaseIndex() < 2 && (this.staleDate() || this.readiness()?.status !== 'green' || this.painBlocks()),
  );
  protected readonly recordedStations = computed(() =>
    this.draft()?.phaseResults[1].circuitRounds?.reduce((count, round) => count + round.movements.length, 0) ?? 0,
  );
  protected readonly timerStart = computed(() => {
    const key = this.phaseIndex() === 0
      ? 'walkStartedAt'
      : this.phaseIndex() === 1
        ? 'circuitStartedAt'
        : this.phaseIndex() === 3
          ? 'prayerStartedAt'
          : null;
    if (!key) return null;
    const value = this.draft()?.phaseResults[this.phaseIndex()]?.metrics?.[key];
    return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
  });
  protected readonly elapsed = computed(() => {
    const start = this.timerStart();
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
      const draft = await this.history.activeDraft();
      if (draft) this.accept(draft);
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
      this.accept(await this.history.startDraft(this.state.today()));
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected queueAutosave(): void {
    if (this.autosave) clearTimeout(this.autosave);
    this.savedMessage.set('Saving progress…');
    this.autosave = setTimeout(() => void this.flush().catch((error) => this.fail(error)), 600);
  }

  protected async selectPhase(index: number): Promise<void> {
    const draft = this.draft();
    if (!draft || index < 0 || index > draft.currentPhaseIndex || index === this.phaseIndex()) return;
    try {
      if (this.autosave) clearTimeout(this.autosave);
      await this.flush();
      this.phaseIndex.set(index);
      this.reviewing.set(false);
      this.helpOpen.set(false);
      this.painOpen.set(false);
    } catch (error) {
      this.fail(error);
    }
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
      if (index < 2 && this.physicalBlocked()) {
        throw new Error('The full physical trial waits for a Green day. Stop and keep this attempt if needed.');
      }
      if (!gateTrialPhaseComplete(partial.phaseResults[index], index)) {
        throw new Error(this.phaseError(index));
      }
      if (index === 4) {
        this.reviewing.set(true);
      } else {
        const saved = await this.write((next) => {
          next.currentPhaseIndex = Math.max(next.currentPhaseIndex, index + 1);
        });
        this.phaseIndex.set(index + 1);
        this.selectFirstMissing(saved);
      }
      this.savedMessage.set('Progress saved on this device.');
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
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async stop(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving()) return;
    if (this.autosave) clearTimeout(this.autosave);
    this.saving.set(true);
    this.error.set(null);
    try {
      // Stopping must remain possible even if a partially typed field is invalid.
      try { await this.flush(); } catch { /* keep the last valid saved draft */ }
      await this.writes;
      this.stopped.set(await this.history.finishDraft(draft.id, 'stopped'));
      this.draft.set(null);
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async startTimer(): Promise<void> {
    if (![0, 1, 3].includes(this.phaseIndex()) || (this.phaseIndex() < 2 && this.physicalBlocked())) return;
    try {
      const index = this.phaseIndex();
      if (index === 1 && (numeric(this.model().restMinutes) ?? 0) < 5) {
        throw new Error('Rest at least 5 minutes after the walk before starting the circuit.');
      }
      await this.write((next) => {
        const key = index === 0 ? 'walkStartedAt' : index === 1 ? 'circuitStartedAt' : 'prayerStartedAt';
        (next.phaseResults[index].metrics ??= {})[key] = new Date().toISOString();
      });
      this.clock.set(Date.now());
    } catch (error) {
      this.fail(error);
    }
  }

  protected useElapsed(): void {
    const start = this.timerStart();
    if (start === null) return;
    const minutes = String(Math.max(0.1, Math.round((Date.now() - start) / 6000) / 10));
    this.model.update((value) => this.phaseIndex() === 0
      ? { ...value, walkMinutes: minutes }
      : this.phaseIndex() === 1
        ? { ...value, circuitMinutes: minutes }
        : { ...value, prayerMinutes: minutes });
    this.queueAutosave();
  }

  protected chooseStation(round: number, index: number): void {
    if (!this.draft() || round < 1 || round > this.circuit.rounds || index < 0 || index >= this.circuit.movements.length) return;
    this.station.set({ round, index });
    this.syncStation(this.draft()!);
    this.helpOpen.set(false);
    this.error.set(null);
  }

  protected stationName(movement: TrialCircuitMovement): string {
    return getChapterOneExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId;
  }

  protected stationDose(movement: TrialCircuitMovement): string {
    return `${movement.reps ?? movement.durationSeconds} ${movement.reps !== undefined ? 'reps' : 'seconds'}${movement.perSide ? ' per side' : ''}`;
  }

  protected stationSaved(round: number, exerciseId: string): boolean {
    return !!this.draft()?.phaseResults[1].circuitRounds?.find((item) => item.round === round)?.movements.some((item) => item.exerciseId === exerciseId);
  }

  protected phaseComplete(index: number): boolean {
    const phase = this.draft()?.phaseResults[index];
    return !!phase && gateTrialPhaseComplete(phase, index);
  }

  protected metric(phase: TrialPhaseResult | undefined, key: string): string {
    const value = phase?.metrics?.[key];
    return value === undefined ? '—' : String(value);
  }

  protected response(phase: TrialPhaseResult | undefined, key: string): string {
    return phase?.responses?.[key] || '—';
  }

  protected recordedMovement(movement: TrialCircuitMovementResult): string {
    const amount = movement.repsBySide
      ? `${movement.repsBySide.left} left / ${movement.repsBySide.right} right reps`
      : movement.durationSecondsBySide
        ? `${movement.durationSecondsBySide.left} left / ${movement.durationSecondsBySide.right} right seconds`
        : movement.reps !== undefined
          ? `${movement.reps} reps`
          : movement.durationSeconds !== undefined
            ? `${movement.durationSeconds} seconds`
            : 'Recorded';
    return [
      this.stationName({ exerciseId: movement.exerciseId }), amount,
      ...(movement.setup ? [movement.setup] : []),
      ...(movement.loadPounds !== undefined ? [`${movement.loadPounds} lb`] : []),
    ].join(' · ');
  }

  protected async saveStation(event: Event): Promise<void> {
    event.preventDefault();
    const cursor = this.station();
    const movement = this.movement();
    if (!cursor || !movement || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.physicalBlocked()) throw new Error('Wait for a Green readiness day before more circuit work.');
      if ((numeric(this.model().restMinutes) ?? 0) < 5) {
        throw new Error('Rest at least 5 minutes after the walk before starting the circuit.');
      }
      await this.flush();
      const actual = this.stationActual(movement);
      const saved = await this.write((next) => {
        const rounds = (next.phaseResults[1].circuitRounds ??= []);
        let round = rounds.find((item) => item.round === cursor.round);
        if (!round) {
          round = { round: cursor.round, movements: [] };
          rounds.push(round);
          rounds.sort((a, b) => a.round - b.round);
        }
        const prior = round.movements.findIndex((item) => item.exerciseId === movement.exerciseId);
        if (prior < 0) round.movements.push(actual);
        else round.movements[prior] = actual;
        round.movements.sort((a, b) => this.circuit.movements.findIndex((item) => item.exerciseId === a.exerciseId) - this.circuit.movements.findIndex((item) => item.exerciseId === b.exerciseId));
      });
      this.selectFirstMissing(saved);
      this.helpOpen.set(false);
      this.savedMessage.set(this.meetsTarget(movement, actual)
        ? 'Station saved on this device.'
        : 'Station saved. This is below the full trial prescription; stop and keep this attempt if needed.');
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected toggleHelp(): void {
    this.helpOpen.update((open) => !open);
    if (this.helpOpen()) {
      this.painOpen.set(false);
      queueMicrotask(() => document.getElementById('trial-help-title')?.focus());
    }
  }

  protected openPain(): void {
    this.painOpen.set(true);
    this.helpOpen.set(false);
    queueMicrotask(() => document.getElementById('trial-pain-title')?.focus());
  }

  protected async recordPain(event: Event): Promise<void> {
    event.preventDefault();
    const draft = this.draft();
    if (!draft || this.phaseIndex() > 1) return;
    const values = this.painModel();
    try {
      const severity = numeric(values.severity, true);
      if (severity === undefined || severity > 10 || !values.bodyArea.trim() || !values.actionTaken) {
        throw new Error('Choose a pain area, level from 0 to 10, and what you did.');
      }
      this.saving.set(true);
      if (this.autosave) clearTimeout(this.autosave);
      // A malformed unsaved field cannot delay an immediate pain record.
      try { await this.flush(); } catch { /* keep the last valid saved draft */ }
      await this.history.recordPain(draft.id, {
        phaseId: this.phaseIndex() === 0 ? 'brisk-walk' : 'controlled-circuit',
        bodyArea: values.bodyArea, severity,
        actionTaken: values.actionTaken as TrialPainAction,
        ...(this.phaseIndex() === 1 && this.movement() ? { exerciseId: this.movement()!.exerciseId } : {}),
      });
      const refreshed = await this.history.activeDraft();
      if (refreshed) this.draft.set(refreshed);
      this.painOpen.set(false);
      this.painModel.set({ bodyArea: '', severity: '', actionTaken: '' });
      this.savedMessage.set('Pain note saved on this device.');
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  private flush(): Promise<TrialDraft> {
    const index = this.phaseIndex();
    return this.write((next) => { next.phaseResults[index] = this.phaseFromModel(next, index); });
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

  private phaseFromModel(draft: TrialDraft, index: number): TrialPhaseResult {
    const previous = draft.phaseResults[index];
    const value = this.model();
    switch (index) {
      case 0: {
        const minutes = numeric(value.walkMinutes);
        const rpe = numeric(value.walkRpe, true);
        const heartRate = numeric(value.heartRate);
        const timerStart = previous.metrics?.['walkStartedAt'];
        return { ...previous,
          metrics: {
            ...(typeof timerStart === 'string' ? { walkStartedAt: timerStart } : {}),
            ...(value.fullWalk ? { distanceMiles: 2 } : {}),
            ...(minutes !== undefined ? { durationMinutes: minutes } : {}),
            ...(rpe !== undefined ? { rpe } : {}),
            ...(heartRate !== undefined ? { averageHeartRate: heartRate } : {}),
          },
          responses: { knee: value.knee, back: value.back, recoveryAfterFiveMinutes: value.recovery },
        };
      }
      case 1: {
        const rest = numeric(value.restMinutes);
        const minutes = numeric(value.circuitMinutes);
        const timerStart = previous.metrics?.['circuitStartedAt'];
        return { ...previous,
          metrics: {
            ...(typeof timerStart === 'string' ? { circuitStartedAt: timerStart } : {}),
            ...(rest !== undefined ? { restAfterWalkMinutes: rest } : {}),
            ...(minutes !== undefined ? { durationMinutes: minutes } : {}),
            roundsCompleted: previous.circuitRounds?.length ?? 0,
          },
        };
      }
      case 2:
        return { ...previous, responses: { body: value.body, character: value.character, family: value.family } };
      case 3: {
        const minutes = numeric(value.prayerMinutes);
        const timerStart = previous.metrics?.['prayerStartedAt'];
        return { ...previous,
          metrics: {
            ...(typeof timerStart === 'string' ? { prayerStartedAt: timerStart } : {}),
            confirmed: value.psalmAndPrayer,
            ...(minutes !== undefined ? { prayerMinutes: minutes } : {}),
          },
          responses: { identity: value.identity },
        };
      }
      case 4:
        return { ...previous, notes: value.oath };
      default:
        return previous;
    }
  }

  private stationActual(planned: TrialCircuitMovement): TrialCircuitMovementResult {
    const value = this.stationModel();
    const actual: TrialCircuitMovementResult = { exerciseId: planned.exerciseId };
    if (planned.perSide) {
      const left = numeric(value.left, planned.reps !== undefined);
      const right = numeric(value.right, planned.reps !== undefined);
      if (left === undefined || right === undefined) throw new Error('Enter the result for both sides.');
      if (planned.reps !== undefined) actual.repsBySide = { left, right };
      else actual.durationSecondsBySide = { left, right };
    } else {
      const amount = numeric(value.amount, planned.reps !== undefined);
      if (amount === undefined) throw new Error('Enter what you completed at this station.');
      if (planned.reps !== undefined) actual.reps = amount;
      else actual.durationSeconds = amount;
    }
    const load = numeric(value.load);
    if (load !== undefined) actual.loadPounds = load;
    if (value.setup.trim()) actual.setup = value.setup.trim();
    return actual;
  }

  private meetsTarget(planned: TrialCircuitMovement, actual: TrialCircuitMovementResult): boolean {
    if (planned.reps !== undefined) {
      return planned.perSide
        ? (actual.repsBySide?.left ?? 0) >= planned.reps && (actual.repsBySide?.right ?? 0) >= planned.reps
        : (actual.reps ?? 0) >= planned.reps;
    }
    const seconds = planned.durationSeconds ?? 0;
    return planned.perSide
      ? (actual.durationSecondsBySide?.left ?? 0) >= seconds && (actual.durationSecondsBySide?.right ?? 0) >= seconds
      : (actual.durationSeconds ?? 0) >= seconds;
  }

  private accept(draft: TrialDraft): void {
    this.draft.set(draft);
    this.phaseIndex.set(draft.currentPhaseIndex);
    this.sync(draft);
  }

  private sync(draft: TrialDraft): void {
    const walk = draft.phaseResults[0];
    const circuit = draft.phaseResults[1];
    const mind = draft.phaseResults[2];
    const spirit = draft.phaseResults[3];
    this.model.set({
      fullWalk: walk.metrics?.['distanceMiles'] === 2,
      walkMinutes: displayNumber(walk.metrics?.['durationMinutes']),
      walkRpe: displayNumber(walk.metrics?.['rpe']),
      heartRate: displayNumber(walk.metrics?.['averageHeartRate']),
      knee: walk.responses?.['knee'] ?? '', back: walk.responses?.['back'] ?? '',
      recovery: walk.responses?.['recoveryAfterFiveMinutes'] ?? '',
      restMinutes: displayNumber(circuit.metrics?.['restAfterWalkMinutes']),
      circuitMinutes: displayNumber(circuit.metrics?.['durationMinutes']),
      body: mind.responses?.['body'] ?? '', character: mind.responses?.['character'] ?? '',
      family: mind.responses?.['family'] ?? '',
      psalmAndPrayer: spirit.metrics?.['confirmed'] === true,
      prayerMinutes: displayNumber(spirit.metrics?.['prayerMinutes']),
      identity: spirit.responses?.['identity'] ?? '', oath: draft.phaseResults[4].notes ?? '',
    });
    this.selectFirstMissing(draft);
  }

  private selectFirstMissing(draft: TrialDraft): void {
    for (let round = 1; round <= this.circuit.rounds; round++) {
      const saved = draft.phaseResults[1].circuitRounds?.find((item) => item.round === round);
      for (let index = 0; index < this.circuit.movements.length; index++) {
        if (!saved?.movements.some((item) => item.exerciseId === this.circuit.movements[index].exerciseId)) {
          this.station.set({ round, index });
          this.syncStation(draft);
          return;
        }
      }
    }
    this.station.set(null);
  }

  private syncStation(draft: TrialDraft): void {
    const cursor = this.station();
    if (!cursor) return;
    const planned = this.circuit.movements[cursor.index];
    const saved = draft.phaseResults[1].circuitRounds?.find((item) => item.round === cursor.round)?.movements.find((item) => item.exerciseId === planned.exerciseId);
    this.stationModel.set({
      amount: displayNumber(saved?.reps ?? saved?.durationSeconds),
      left: displayNumber(saved?.repsBySide?.left ?? saved?.durationSecondsBySide?.left),
      right: displayNumber(saved?.repsBySide?.right ?? saved?.durationSecondsBySide?.right),
      setup: saved?.setup ?? '', load: displayNumber(saved?.loadPounds),
    });
  }

  private phaseError(index: number): string {
    return [
      'Record the full 2-mile walk, time, RPE, knee and back response, and recovery after 5 minutes.',
      'Record at least 5 minutes of rest, the prescribed work at all 18 stations, and the circuit time.',
      'Write what you learned about your body, character, and family.',
      'Confirm Psalm 121 and prayer, record at least 10 quiet minutes, and answer the husband and father prompt.',
      'Write your personal Ranger’s Oath before reviewing the trial.',
    ][index];
  }

  private fail(error: unknown): void {
    this.error.set(error instanceof Error ? error.message : 'The trial could not be saved. Try again.');
    this.savedMessage.set(null);
  }
}
