import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  PostMissionFunction,
  ReadinessStatus,
  TrialAttempt,
  TrialCircuitMovement,
  TrialCircuitMovementResult,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
} from '../../../core/domain/models';
import { RECOVERY_AREAS, recoveryOpensAt, recoveryWord } from '../../../core/domain/post-mission-function';
import type { RecordedTrialPainEvent } from '../../../core/domain/trial-draft';
import { getExerciseGuide } from '../../../core/program/exercise-guides';
import {
  addDays,
  getGateTrialTargetDate,
  getNextGateTrialAttempt,
  isGateTrialAttemptDay,
} from '../../../core/program/campaign';
import { getChapterOneTrialPass } from '../../../core/program/chapter-one-completion';
import { gateTrialDefinition } from '../../../core/program/chapter-one-trial.seed';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { formatLongDate, formatMinutes, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

const READINESS_GUIDANCE: Record<ReadinessStatus, string> = {
  green: 'Green · Ready. Complete the physical parts with controlled effort and stable symptoms.',
  yellow: 'Yellow · Reduce. Wait for a Green day before the full Gate Trial.',
  red: 'Red · Restore. Do not attempt the physical trial today.',
};

@Component({
  imports: [Icon, RouterLink],
  selector: 'app-gate-trial-page',
  styleUrl: './gate-trial-page.css',
  templateUrl: './gate-trial-page.html',
})
export class GateTrialPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  protected readonly trial = gateTrialDefinition;
  protected readonly shortDate = formatShortDate;
  protected readonly minutes = formatMinutes;
  protected readonly recoveryWord = recoveryWord;
  protected readonly recoveryOpensAt = recoveryOpensAt;
  protected readonly recoveryAreas = RECOVERY_AREAS;
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal(false);
  protected readonly activeDraft = signal<TrialDraft | null>(null);
  protected readonly completedResults = signal<TrialResult[]>([]);
  protected readonly recoveries = signal<Record<string, PostMissionFunction>>({});
  protected readonly stoppedAttempts = signal<TrialAttempt[]>([]);
  protected readonly painByAttempt = signal<Record<string, RecordedTrialPainEvent[]>>({});
  protected readonly walk = gateTrialDefinition.phases[0];
  protected readonly circuit = gateTrialDefinition.phases.find(
    (phase) => phase.id === 'controlled-circuit',
  )!.circuit!;

  protected readonly readiness = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check : null;
  });
  protected readonly pass = computed(() =>
    getChapterOneTrialPass(this.state.campaign(), this.completedResults()),
  );
  protected readonly attemptToday = computed(() => {
    const campaign = this.state.campaign();
    return !!campaign && isGateTrialAttemptDay(campaign.startDate, this.state.today());
  });
  /** On a day the trial is not open, when it opens next, or that it is passed. */
  protected readonly waitingMessage = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || this.state.beforeDayOne() || this.activeDraft()) return null;
    const pass = this.pass();
    if (pass) return `Passed ${formatShortDate(pass.date)}`;
    if (this.attemptToday()) return null;
    const today = this.state.today();
    const next = getNextGateTrialAttempt(campaign.startDate, today);
    return today < getGateTrialTargetDate(campaign.startDate)
      ? `First attempt ${formatShortDate(next)}`
      : `Next attempt ${formatShortDate(next)}`;
  });
  protected readonly readinessGuidance = computed(() => {
    if (this.state.loading()) return 'Opening your campaign…';
    if (this.state.error())
      return 'Local storage is unavailable. Check browser storage settings, then try again.';
    const campaign = this.state.campaign();
    if (!campaign) return 'Choose Day 1 to start the campaign.';
    if (this.state.beforeDayOne()) return 'Day 1 has not arrived yet. Review the plan now.';
    const pass = this.pass();
    if (pass) return `You passed the Gate Trial on ${formatLongDate(pass.date)}.`;
    if (!this.attemptToday() && !this.activeDraft()) {
      const today = this.state.today();
      const next = getNextGateTrialAttempt(campaign.startDate, today);
      return today < getGateTrialTargetDate(campaign.startDate)
        ? `The first attempt is ${formatLongDate(next)}, the Monday after Week 4. Review the plan now.`
        : `The next attempt is ${formatLongDate(next)}. Attempts fall on Mondays and Thursdays until you pass.`;
    }
    const status = this.readiness()?.status;
    if (status && status !== 'green') {
      const after = getNextGateTrialAttempt(campaign.startDate, addDays(this.state.today(), 1));
      return `${READINESS_GUIDANCE[status]} The next attempt is ${formatLongDate(after)}.`;
    }
    return status ? READINESS_GUIDANCE[status] : 'Check readiness before the physical parts.';
  });
  protected readonly readinessLink = computed(() =>
    !this.state.campaign() || this.state.beforeDayOne()
      ? '/keep'
      : this.activeDraft() || this.readiness()?.status === 'green'
        ? '/road/gate-trial/active'
        : '/readiness',
  );
  protected readonly readinessAction = computed(() =>
    !this.state.campaign() || this.state.beforeDayOne()
      ? 'Go to Keep'
      : this.activeDraft()
        ? 'Resume saved trial'
        : this.readiness()?.status === 'green'
          ? 'Begin the Gate Trial'
          : this.readiness()
            ? 'Review readiness'
            : 'Check readiness',
  );

  ngOnInit(): void {
    void this.load();
  }

  protected retry(): void {
    void this.load(true);
  }

  private async load(retry = false): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      if (retry) await this.state.retry();
      else await this.state.initialize();
      if (this.state.error()) return;
      const [draft, completed, stopped, recoveries] = await Promise.all([
        this.history.activeDraft(),
        this.history.forTrial(this.trial.id),
        this.history.stoppedForTrial(this.trial.id),
        this.history.recoveries(),
      ]);
      this.activeDraft.set(draft ?? null);
      this.completedResults.set(completed);
      this.recoveries.set(Object.fromEntries(recoveries.map((entry) => [entry.trialResultId, entry])));
      this.stoppedAttempts.set(stopped);
      const painRows = await Promise.all(
        completed.map(async (result) => [result.id, await this.history.painForAttempt(result.id)] as const),
      );
      this.painByAttempt.set(Object.fromEntries(painRows));
    } catch {
      this.historyError.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }

  protected movementLabel(movement: TrialCircuitMovement): string {
    const name = getExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId;
    const dose =
      movement.reps !== undefined ? `${movement.reps} reps` : `${movement.durationSeconds} seconds`;
    return `${name} · ${dose}${movement.perSide ? ' per side' : ''}`;
  }

  protected recordedMovement(movement: TrialCircuitMovementResult): string {
    const name = getExerciseGuide(movement.exerciseId)?.name ?? movement.exerciseId;
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
      name,
      amount,
      ...(movement.setup ? [movement.setup] : []),
      ...(movement.loadPounds !== undefined ? [`${movement.loadPounds} lb`] : []),
    ].join(' · ');
  }

  protected metric(phase: TrialPhaseResult | undefined, key: string): string {
    const value = phase?.metrics?.[key];
    return value === undefined ? '—' : String(value);
  }

  protected response(phase: TrialPhaseResult | undefined, key: string): string {
    return phase?.responses?.[key] || '—';
  }

  protected attemptPhase(attempt: TrialAttempt): string {
    return attempt.definitionSnapshot.phases[attempt.currentPhaseIndex]?.title ?? 'The Gate Trial';
  }
}
