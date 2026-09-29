import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReadinessStatus, TrialResult } from '../../../core/domain/models';
import {
  getChapterOneTrialPass,
  getChapterTwoStartDate,
  isChapterOneComplete,
} from '../../../core/program/chapter-one-completion';
import {
  getChapterOneSchedule,
  getTodaysOrders,
  isGateTrialAttemptDay,
  type TodayOrder,
} from '../../../core/program/campaign';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { getChapterOneWeekContent } from '../../../core/program/chapter-one-daily.seed';
import { getLeadershipLessonForWeek } from '../../../core/program/field-manual.seed';
import { loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { TrialHistory } from '../../../core/state/trial-history';
import { formatLongDate } from '../../../shared/format-date';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { CheckInReminder } from '../check-in-reminder/check-in-reminder';
import { GateTrialRecoveryReminder } from '../gate-trial-recovery-reminder/gate-trial-recovery-reminder';
import { KeepBand } from '../keep-band/keep-band';
import { StartDay } from '../start-day/start-day';

const WATCH_ICONS: Readonly<Record<string, IconName>> = {
  'morning-watch': 'sunrise',
  'evening-watch': 'moon',
};

interface ReadinessCopy {
  status: string;
  help: string;
}

const READINESS_COPY: Readonly<Record<ReadinessStatus | 'pending', ReadinessCopy>> = {
  pending: {
    status: 'Not checked today',
    help: 'Check sleep, energy, and pain before training.',
  },
  green: {
    status: 'Green · Ready',
    help: 'Normal mission. Keep technique sound and symptoms stable.',
  },
  yellow: {
    status: 'Yellow · Reduce',
    help: 'Reduce volume about 25%. Do not increase load today.',
  },
  red: {
    status: 'Red · Restore',
    help: 'No strength mission. Restoration or easy movement only if appropriate. Seek medical evaluation if symptoms persist or worsen.',
  },
};

@Component({
  imports: [CheckInReminder, GateTrialRecoveryReminder, Icon, KeepBand, RouterLink, StartDay],
  selector: 'app-keep-page',
  styleUrl: './keep-page.css',
  templateUrl: './keep-page.html',
})
export class KeepPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly trialHistory = inject(TrialHistory);
  protected readonly trialLoading = signal(true);
  protected readonly trialError = signal(false);
  private readonly completedTrials = signal<TrialResult[]>([]);
  protected readonly chapterComplete = computed(() =>
    isChapterOneComplete(this.state.campaign(), this.state.today(), this.completedTrials()),
  );
  /** The Gate Trial pass, if there is one: its date sets when Chapter II begins. */
  protected readonly trialPass = computed(() =>
    getChapterOneTrialPass(this.state.campaign(), this.completedTrials()),
  );
  protected readonly chapterTwoStart = computed(
    () => getChapterTwoStartDate(this.state.campaign(), this.completedTrials()) ?? null,
  );
  /** An attempt day, or the day of the pass: no check-in tests on top of the trial. */
  protected readonly trialDay = computed(() => {
    const campaign = this.state.campaign();
    const pass = this.trialPass();
    const today = this.state.today();
    return (
      !!campaign &&
      isGateTrialAttemptDay(campaign.startDate, today) &&
      (!pass || pass.date === today)
    );
  });
  protected readonly longDate = formatLongDate;

  /** The current chapter's content; Chapter I before a campaign exists. */
  protected readonly seed = computed(() =>
    loadChapterSeed(this.state.campaign()?.currentChapterId ?? chapterOneDefinition.id),
  );

  private readonly orders = computed<TodayOrder[]>(() => {
    const campaign = this.state.campaign();
    return campaign
      ? getTodaysOrders(campaign.startDate, this.state.today(), this.state.readiness()?.status)
      : [];
  });

  /** Once the Gate Trial is passed, that day's order says so instead of asking for it again. */
  protected readonly mainOrder = computed(() => {
    const order = this.orders().find((item) => item.kind === 'weekly');
    return order?.missionType === 'trial' && this.trialPass()
      ? { ...order, title: 'Gate Trial', guidance: 'Passed. Your result is saved on this device.' }
      : order;
  });
  protected readonly watches = computed(() =>
    this.orders().filter((order) => order.kind === 'watch'),
  );

  /** Pictograms follow the order's kind, as on Today's Mission. Presentation only. */
  protected readonly mainOrderIcon = computed<IconName>(() => {
    const order = this.mainOrder();
    if (!order) return 'footprints';
    if (order.missionType === 'reflection') return 'book-open';
    if (order.missionType === 'restoration' || this.state.readiness()?.status === 'red') {
      return 'renew';
    }
    return order.missionType === 'strength' ? 'anvil' : 'footprints';
  });

  protected readonly readinessStatus = computed(() => this.state.readiness()?.status ?? 'pending');
  protected readonly readinessCopy = computed(() => READINESS_COPY[this.readinessStatus()]);

  protected readonly hearthMission = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || campaign.currentChapterId !== chapterOneDefinition.id) {
      return this.seed()?.leadership[0] ?? '';
    }
    const schedule = getChapterOneSchedule(campaign.startDate, this.state.today());
    if (!schedule) return '';
    const week = getChapterOneWeekContent(schedule.contentWeek);
    return week.hearthMission ?? week.leadershipMission ?? this.seed()?.leadership[0] ?? '';
  });

  protected readonly hearthLessonId = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || campaign.currentChapterId !== chapterOneDefinition.id) return null;
    const schedule = getChapterOneSchedule(campaign.startDate, this.state.today());
    return schedule ? (getLeadershipLessonForWeek(schedule.contentWeek)?.id ?? null) : null;
  });

  ngOnInit(): void {
    void this.load();
  }

  protected watchIcon(order: TodayOrder): IconName {
    return WATCH_ICONS[order.id] ?? 'sunrise';
  }

  protected retry(): void {
    void this.load(true);
  }

  private async load(retry = false): Promise<void> {
    this.trialLoading.set(true);
    this.trialError.set(false);
    try {
      if (retry) await this.state.retry();
      else await this.state.initialize();
      if (this.state.error()) return;
      if (!this.state.campaign() || this.state.beforeDayOne()) return;
      this.completedTrials.set(await this.trialHistory.forTrial(chapterOneDefinition.trialId));
    } catch {
      this.trialError.set(true);
    } finally {
      this.trialLoading.set(false);
    }
  }
}
