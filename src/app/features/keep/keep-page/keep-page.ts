import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MissionInstance, ReadinessStatus, TrialResult } from '../../../core/domain/models';
import { needsBackOnTrack, previousTwoDays } from '../../../core/program/back-on-track';
import { resolveCampaignPosition } from '../../../core/program/campaign-position';
import {
  getActivityChoices,
  getDayOrders,
  getHearthMission,
  getHearthMissionParts,
  type TodayOrder,
} from '../../../core/program/chapter-orders';
import { getLeadershipLessonForWeek } from '../../../core/program/field-manual.seed';
import { chapterPrograms, formatChapterNumeral } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionHistory } from '../../../core/state/mission-history';
import { DayProgress, recordLabel } from '../../../core/state/day-progress';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate } from '../../../shared/format-date';
import { DoneMark } from '../../../shared/done-mark/done-mark';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { BackupReminder } from '../backup-reminder/backup-reminder';
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
  imports: [
    BackupReminder,
    CheckInReminder,
    DoneMark,
    GateTrialRecoveryReminder,
    Icon,
    KeepBand,
    RouterLink,
    StartDay,
  ],
  selector: 'app-keep-page',
  styleUrl: './keep-page.css',
  templateUrl: './keep-page.html',
})
export class KeepPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly trialHistory = inject(TrialHistory);
  protected readonly progress = inject(DayProgress);
  private readonly schedule = inject(ScheduleHistory);
  private readonly missionHistory = inject(MissionHistory);
  private readonly recentRecords = signal<MissionInstance[] | null>(null);
  protected readonly trialLoading = signal(true);
  protected readonly trialError = signal(false);
  private readonly completedTrials = signal<TrialResult[]>([]);

  /** Today's chapter and week, from Day 1 and the saved trial passes. */
  protected readonly position = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? resolveCampaignPosition(campaign.startDate, this.state.today(), this.completedTrials())
      : null;
  });
  /** Today's chapter; Chapter I before Day 1. */
  protected readonly program = computed(
    () => this.position()?.chapter.program ?? chapterPrograms[0],
  );
  protected readonly chapterComplete = computed(() => !!this.position()?.awaitingNextChapter);
  /** The chapter's trial pass, if there is one: its date sets when the next chapter begins. */
  protected readonly trialPass = computed(() => this.position()?.chapter.pass);
  /** An attempt day, or the day of the pass: no check-in tests on top of the trial. */
  protected readonly trialDay = computed(() => !!this.position()?.chapter.attemptDay);
  protected readonly longDate = formatLongDate;
  protected readonly numeral = formatChapterNumeral;

  /** Today's chapter day, with a missed Forge session moved here when the rule calls for it. */
  private readonly scheduledDay = computed(() => {
    const campaign = this.state.campaign();
    const today = this.state.today();
    return campaign && this.position()
      ? this.schedule.dayFor(campaign.startDate, today, today, this.completedTrials())
      : null;
  });

  private readonly orders = computed<TodayOrder[]>(() => {
    const day = this.scheduledDay();
    return day ? getDayOrders(day, this.state.readiness()?.status) : [];
  });

  /** Once the trial is passed, that day's order says so instead of asking for it again. */
  protected readonly mainOrder = computed(() => {
    const order = this.orders().find((item) => item.kind === 'weekly');
    return order?.missionType === 'trial' && this.trialPass()
      ? {
          ...order,
          title: this.program().trialName,
          guidance: 'Passed. Your result is saved on this device.',
        }
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

  /** Today's main order is marked once something is recorded for it (or its trial is passed). */
  protected readonly mainLabel = computed(() => {
    const chapter = this.scheduledDay();
    if (!chapter) return null;
    if (this.trialPass()?.date === this.state.today()) return 'Done';
    const ids = getActivityChoices(chapter).map((choice) => choice.id);
    return recordLabel(this.progress.recordFor(ids));
  });

  /** A calm note after two ordered days in a row went unrecorded; gone once today is recorded. */
  protected readonly backOnTrack = computed(() => {
    const campaign = this.state.campaign();
    const recent = this.recentRecords();
    if (!campaign || !recent || this.mainLabel() || this.chapterComplete()) return false;
    return needsBackOnTrack(
      campaign.startDate,
      this.state.today(),
      this.completedTrials(),
      (date) => recent.filter((record) => record.date === date),
    );
  });

  protected readonly readinessStatus = computed(() => this.state.readiness()?.status ?? 'pending');
  protected readonly readinessCopy = computed(() => READINESS_COPY[this.readinessStatus()]);

  protected readonly hearthMission = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? getHearthMission(chapter) : '';
  });
  protected readonly hearthParts = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? getHearthMissionParts(chapter) : [];
  });

  /** The week's leadership lesson in the Field Manual, when it has one. */
  protected readonly hearthLessonId = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? (getLeadershipLessonForWeek(chapter.contentWeek)?.id ?? null) : null;
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
      this.completedTrials.set(await loadCampaignTrials(this.trialHistory));
      await Promise.all([this.progress.refresh(this.state.today()), this.schedule.refresh()]);
      try {
        const days = previousTwoDays(this.state.today());
        this.recentRecords.set(
          (await Promise.all(days.map((day) => this.missionHistory.forDate(day)))).flat(),
        );
      } catch {
        // The note is a courtesy; without history it simply stays away.
      }
    } catch {
      this.trialError.set(true);
    } finally {
      this.trialLoading.set(false);
    }
  }
}
