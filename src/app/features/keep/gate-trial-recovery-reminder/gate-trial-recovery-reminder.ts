import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PostMissionFunction, TrialResult } from '../../../core/domain/models';
import { pendingRecovery, recoveryOpensAt } from '../../../core/domain/post-mission-function';
import { chapterPrograms } from '../../../core/program/program-catalog';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatClockTime } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

/** A quiet timed prompt after a completed physical chapter trial. */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-gate-trial-recovery-reminder',
  styleUrl: './gate-trial-recovery-reminder.css',
  templateUrl: './gate-trial-recovery-reminder.html',
})
export class GateTrialRecoveryReminder implements OnInit, OnDestroy {
  private readonly history = inject(TrialHistory);
  private readonly results = signal<TrialResult[]>([]);
  private readonly recoveries = signal<PostMissionFunction[]>([]);
  private readonly now = signal(Date.now());
  private ticker?: ReturnType<typeof setInterval>;

  protected readonly clock = formatClockTime;
  protected readonly pending = computed(() =>
    pendingRecovery(
      this.results(),
      this.recoveries(),
      this.now(),
    ),
  );
  protected readonly trialName = computed(
    () =>
      chapterPrograms.find((program) => program.trial.id === this.pending()?.trialId)?.trialName ??
      'Trial',
  );
  protected readonly recoveryLink = computed(() => {
    const program = chapterPrograms.find((item) => item.trial.id === this.pending()?.trialId);
    return [`${program?.trialRoute ?? '/road/gate-trial'}/recovery`, this.pending()?.id ?? ''];
  });
  protected readonly opensAt = computed(() => {
    const result = this.pending();
    return result ? recoveryOpensAt(result) : null;
  });
  protected readonly ready = computed(() => {
    const opensAt = this.opensAt();
    return opensAt !== null && this.now() >= opensAt;
  });

  async ngOnInit(): Promise<void> {
    this.ticker = setInterval(() => this.now.set(Date.now()), 30_000);
    try {
      const [results, recoveries] = await Promise.all([
        loadCampaignTrials(this.history),
        this.history.recoveries(),
      ]);
      this.results.set(results);
      this.recoveries.set(recoveries);
      this.now.set(Date.now());
    } catch {
      // Trial history remains available from Road if this quiet prompt cannot load.
    }
  }

  ngOnDestroy(): void {
    if (this.ticker) clearInterval(this.ticker);
  }
}
