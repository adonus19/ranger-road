import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReadinessStatus } from '../../../core/domain/models';
import {
  getChapterOneSchedule,
  getTodaysOrders,
  type TodayOrder,
} from '../../../core/program/campaign';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import { getChapterOneWeekContent } from '../../../core/program/chapter-one-daily.seed';
import { loadChapterSeed } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { CheckInReminder } from '../check-in-reminder/check-in-reminder';
import { GateTrialRecoveryReminder } from '../gate-trial-recovery-reminder/gate-trial-recovery-reminder';
import { KeepBand } from '../keep-band/keep-band';
import { StartDay } from '../start-day/start-day';

/** Pictograms for the documented weekday slots. Presentation only; the orders come from the seed. */
const WEEKDAY_ICONS: Readonly<Record<string, IconName>> = {
  'weekday-1': 'anvil',
  'weekday-2': 'footprints',
  'weekday-3': 'renew',
  'weekday-4': 'anvil',
  'weekday-5': 'footprints',
  'weekday-6': 'footprints',
  'weekday-7': 'book-open',
};

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

  protected readonly mainOrder = computed(() =>
    this.orders().find((order) => order.kind === 'weekly'),
  );
  protected readonly watches = computed(() =>
    this.orders().filter((order) => order.kind === 'watch'),
  );

  protected readonly mainOrderIcon = computed<IconName>(() => {
    const order = this.mainOrder();
    if (!order) {
      return 'footprints';
    }
    const restoring = this.state.readiness()?.status === 'red' && order.id !== 'weekday-7';
    return restoring ? 'renew' : (WEEKDAY_ICONS[order.id] ?? 'footprints');
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

  ngOnInit(): void {
    void this.state.initialize();
  }

  protected watchIcon(order: TodayOrder): IconName {
    return WATCH_ICONS[order.id] ?? 'sunrise';
  }

  protected retry(): void {
    void this.state.retry();
  }
}
