import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  ReadinessStatus,
  TrialAttempt,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
} from '../../../core/domain/models';
import { addDays } from '../../../core/program/calendar';
import { threeMileTrialDefinition } from '../../../core/program/chapter-two-trial.seed';
import { getTrialWindow } from '../../../core/program/trial-window';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

const READINESS_GUIDANCE: Record<ReadinessStatus, string> = {
  green: 'Green · Ready. Complete the physical parts with steady effort and stable symptoms.',
  yellow: 'Yellow · Reduce. Wait for a Green day before the full Three-Mile Trial.',
  red: 'Red · Restore. Do not attempt the physical trial today.',
};

/** The Three-Mile Trial's plan, today's status, and its recorded attempts. */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-three-mile-trial-page',
  styleUrl: '../gate-trial-page/gate-trial-page.css',
  templateUrl: './three-mile-trial-page.html',
})
export class ThreeMileTrialPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  protected readonly trial = threeMileTrialDefinition;
  protected readonly shortDate = formatShortDate;
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal(false);
  protected readonly activeDraft = signal<TrialDraft | null>(null);
  protected readonly completedResults = signal<TrialResult[]>([]);
  protected readonly stoppedAttempts = signal<TrialAttempt[]>([]);
  private readonly campaignTrials = signal<TrialResult[]>([]);

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
  /** A draft of this trial in progress, never another trial's. */
  protected readonly ownDraft = computed(() => {
    const draft = this.activeDraft();
    return draft?.trialId === this.trial.id ? draft : null;
  });
  protected readonly waitingMessage = computed(() => {
    const window = this.window();
    if (!window || this.state.beforeDayOne() || this.ownDraft()) return null;
    if (window.pass) return `Passed ${formatShortDate(window.pass.date)}`;
    if (!window.chapter) return 'Opens after Chapter II';
    if (window.attemptToday) return null;
    return window.nextAttempt && window.firstAttempt && this.state.today() < window.firstAttempt
      ? `First attempt ${formatShortDate(window.nextAttempt)}`
      : `Next attempt ${formatShortDate(window.nextAttempt ?? this.state.today())}`;
  });
  protected readonly guidance = computed(() => {
    if (this.state.loading()) return 'Opening your campaign…';
    if (this.state.error()) {
      return 'Local storage is unavailable. Check browser storage settings, then try again.';
    }
    const window = this.window();
    if (!window) return 'Choose Day 1 to start the campaign.';
    if (this.state.beforeDayOne()) return 'Day 1 has not arrived yet. Review the plan now.';
    if (window.pass)
      return `You passed the Three-Mile Trial on ${formatLongDate(window.pass.date)}.`;
    if (!window.chapter) {
      return 'The Three-Mile Trial ends Chapter II. It opens on the Monday after Week 8. Review the plan now.';
    }
    if (!window.attemptToday && !this.ownDraft()) {
      const next = window.nextAttempt ?? this.state.today();
      return window.firstAttempt && this.state.today() < window.firstAttempt
        ? `The first attempt is ${formatLongDate(next)}, the Monday after Week 8. Review the plan now.`
        : `The next attempt is ${formatLongDate(next)}. Attempts fall on Mondays and Thursdays until you pass.`;
    }
    const status = this.readiness()?.status;
    if (status && status !== 'green') {
      const after =
        window.chapter &&
        getTrialWindow(
          this.state.campaign()!.startDate,
          addDays(this.state.today(), 1),
          this.campaignTrials(),
          this.trial.id,
        ).nextAttempt;
      return `${READINESS_GUIDANCE[status]}${after ? ` The next attempt is ${formatLongDate(after)}.` : ''}`;
    }
    return status ? READINESS_GUIDANCE[status] : 'Check readiness before the physical parts.';
  });
  protected readonly actionLink = computed(() =>
    !this.state.campaign() || this.state.beforeDayOne()
      ? '/keep'
      : this.ownDraft() || this.readiness()?.status === 'green'
        ? '/road/three-mile-trial/active'
        : '/readiness',
  );
  protected readonly actionLabel = computed(() =>
    !this.state.campaign() || this.state.beforeDayOne()
      ? 'Go to Keep'
      : this.ownDraft()
        ? 'Resume saved trial'
        : this.readiness()?.status === 'green'
          ? 'Begin the Three-Mile Trial'
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

  protected metric(phase: TrialPhaseResult | undefined, key: string): string {
    const value = phase?.metrics?.[key];
    return value === undefined ? '—' : String(value);
  }

  protected response(phase: TrialPhaseResult | undefined, key: string): string {
    return phase?.responses?.[key] || '—';
  }

  protected attemptPhase(attempt: TrialAttempt): string {
    return attempt.definitionSnapshot.phases[attempt.currentPhaseIndex]?.title ?? 'the trial';
  }

  private async load(retry = false): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      if (retry) await this.state.retry();
      else await this.state.initialize();
      if (this.state.error()) return;
      const [draft, completed, stopped, trials] = await Promise.all([
        this.history.activeDraft(),
        this.history.forTrial(this.trial.id),
        this.history.stoppedForTrial(this.trial.id),
        loadCampaignTrials(this.history),
      ]);
      this.activeDraft.set(draft ?? null);
      this.completedResults.set(completed);
      this.stoppedAttempts.set(stopped);
      this.campaignTrials.set(trials);
    } catch {
      this.historyError.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }
}
