import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  PostMissionFunction,
  ReadinessStatus,
  TrialAttempt,
  TrialDraft,
  TrialPhaseResult,
  TrialResult,
  TrialSkillPart,
  TrialSkillPartResult,
} from '../../../core/domain/models';
import {
  RECOVERY_AREAS,
  recoveryOpensAt,
  recoveryWord,
} from '../../../core/domain/post-mission-function';
import { openTrialPiece } from '../../../core/domain/trial-draft';
import { skillPartsForTrial } from '../../../core/domain/trial-skill-parts';
import { highCountryTrialDefinition } from '../../../core/program/chapter-three-trial.seed';
import { getTrialWindow } from '../../../core/program/trial-window';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate, formatMinutes, formatShortDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { ChapterSummarySection } from '../../forge/chapter-summary/chapter-summary';
import { exerciseName, skillOutcomeWords } from '../skill-part-words';

const READINESS_GUIDANCE: Record<ReadinessStatus, string> = {
  green: 'Green · Ready. Take each piece at a steady effort with stable symptoms.',
  yellow: 'Yellow · Reduce. Each piece of the High Country Trial waits for a Green day.',
  red: 'Red · Restore. Do not take a physical piece today.',
};

/** The High Country Trial's plan, where its pieces stand, and its recorded attempts. */
@Component({
  imports: [ChapterSummarySection, Icon, RouterLink],
  selector: 'app-high-country-trial-page',
  styleUrls: ['../gate-trial-page/gate-trial-page.css', './high-country-trial-page.css'],
  templateUrl: './high-country-trial-page.html',
})
export class HighCountryTrialPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(TrialHistory);
  private readonly progression = inject(ProgressionHistory);
  protected readonly trial = highCountryTrialDefinition;
  protected readonly plan = highCountryTrialDefinition.phases[0];
  protected readonly hike = highCountryTrialDefinition.phases[1];
  protected readonly circuit = highCountryTrialDefinition.phases[4];
  protected readonly exerciseName = exerciseName;
  protected readonly shortDate = formatShortDate;
  protected readonly minutes = formatMinutes;
  protected readonly recoveryWord = recoveryWord;
  protected readonly recoveryOpensAt = recoveryOpensAt;
  protected readonly recoveryAreas = RECOVERY_AREAS;
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal(false);
  protected readonly activeDraft = signal<TrialDraft | null>(null);
  protected readonly completedResults = signal<TrialResult[]>([]);
  protected readonly attempts = signal<TrialAttempt[]>([]);
  protected readonly recoveries = signal<Record<string, PostMissionFunction>>({});
  private readonly campaignTrials = signal<TrialResult[]>([]);
  private readonly previewParts = signal<TrialSkillPart[]>([]);

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
  protected readonly skillParts = computed(
    () => this.ownDraft()?.definitionSnapshot.skillParts ?? this.previewParts(),
  );
  /** The hike's day once it is finished and kept in the open draft. */
  protected readonly hikeDoneOn = computed(
    () =>
      this.ownDraft()?.pieces?.find((piece) => piece.pieceId === 'hike' && piece.completedAt)
        ?.date ?? null,
  );
  private readonly openPiece = computed(() => {
    const draft = this.ownDraft();
    return draft ? openTrialPiece(draft) : null;
  });

  protected readonly waitingMessage = computed(() => {
    const window = this.window();
    if (!window || this.state.beforeDayOne() || this.openPiece()) return null;
    if (window.pass) return `Passed ${formatShortDate(window.pass.date)}`;
    if (!window.chapter) return 'Opens after Chapter III';
    if (!window.attemptToday)
      return `Opens ${formatShortDate(window.firstAttempt ?? this.state.today())}`;
    if (this.hikeDoneOn() === this.state.today()) return 'Circuit on a later Green day';
    return null;
  });

  protected readonly guidance = computed(() => {
    if (this.state.loading()) return 'Opening your campaign…';
    if (this.state.error()) {
      return 'Local storage is unavailable. Check browser storage settings, then try again.';
    }
    const window = this.window();
    if (!window) return 'Choose Day 1 to start the campaign.';
    if (this.state.beforeDayOne()) return 'Day 1 has not arrived yet. Review the plan now.';
    if (window.pass) {
      return `You passed the High Country Trial on ${formatLongDate(window.pass.date)}.`;
    }
    if (!window.chapter) {
      return 'The High Country Trial ends Chapter III. It opens after Week 12, on any day you choose. Review the plan now.';
    }
    if (!window.attemptToday) {
      return `The High Country Trial opens ${formatLongDate(window.firstAttempt ?? this.state.today())}, after Week 12, and you can take it on any day you choose from then. Review the plan now.`;
    }
    const open = this.openPiece();
    if (open) {
      return `${open.piece.title} is in progress from ${formatLongDate(open.record.date)}. Your entries are saved on this device.`;
    }
    const hike = this.hikeDoneOn();
    if (hike === this.state.today()) {
      return 'The hike is done and stays done. Take the circuit on a later Green day. Within 48 hours is the target, not a rule.';
    }
    const status = this.readiness()?.status;
    if (status && status !== 'green') {
      return `${READINESS_GUIDANCE[status]} You can take it on any day you’re Green.`;
    }
    if (hike) {
      return status
        ? `The hike is done (${formatShortDate(hike)}). ${READINESS_GUIDANCE[status]}`
        : `The hike is done (${formatShortDate(hike)}). Check readiness before the circuit.`;
    }
    return status ? READINESS_GUIDANCE[status] : 'Check readiness before the hike.';
  });

  protected readonly actionLink = computed(() => {
    if (!this.state.campaign() || this.state.beforeDayOne()) return '/keep';
    if (this.openPiece() || this.readiness()?.status === 'green') {
      return '/road/high-country-trial/active';
    }
    return '/readiness';
  });
  protected readonly actionLabel = computed(() => {
    if (!this.state.campaign() || this.state.beforeDayOne()) return 'Go to Keep';
    const open = this.openPiece();
    if (open) return open.piece.id === 'hike' ? 'Resume the hike' : 'Resume the circuit';
    if (this.readiness()?.status === 'green') {
      return this.hikeDoneOn() ? 'Begin the circuit' : 'Begin the hike';
    }
    return this.readiness() ? 'Review readiness' : 'Check readiness';
  });

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

  protected outcomeWords(result: TrialSkillPartResult | undefined): string {
    return skillOutcomeWords(result);
  }

  protected standIn(phases: readonly TrialPhaseResult[]): boolean {
    return phases[1]?.metrics?.['standIn'] === true;
  }

  protected pieceDate(record: TrialResult | TrialAttempt, pieceId: string): string {
    const piece = record.pieces?.find((item) => item.pieceId === pieceId);
    return piece ? formatShortDate(piece.date) : '—';
  }

  /** Which piece an attempt ended in, in words. */
  protected attemptPiece(attempt: TrialAttempt): string {
    const open = attempt.pieces?.find((piece) => !piece.completedAt);
    return open?.pieceId === 'circuit' ? 'the circuit' : 'the hike';
  }

  private async load(retry = false): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      if (retry) await this.state.retry();
      else await this.state.initialize();
      if (this.state.error()) return;
      const [draft, completed, attempts, trials, recoveries] = await Promise.all([
        this.history.activeDraft(),
        this.history.forTrial(this.trial.id),
        this.history.stoppedForTrial(this.trial.id),
        loadCampaignTrials(this.history),
        this.history.recoveries(),
      ]);
      this.activeDraft.set(draft ?? null);
      this.completedResults.set(completed);
      this.attempts.set(attempts);
      this.campaignTrials.set(trials);
      this.recoveries.set(
        Object.fromEntries(recoveries.map((entry) => [entry.trialResultId, entry])),
      );
      if (!completed.length) {
        const context = await this.progression.load();
        this.previewParts.set(skillPartsForTrial(this.trial.id, context));
      }
    } catch {
      this.historyError.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }
}
