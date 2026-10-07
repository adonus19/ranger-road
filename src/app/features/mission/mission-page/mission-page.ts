import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import {
  allowedMissionOutcomes,
  createMissionRecord,
  missionNeedsReadiness,
  type MissionOutcome,
} from '../../../core/domain/mission';
import type {
  LocalDate,
  MissionInstance,
  ReadinessStatus,
  TrialResult,
} from '../../../core/domain/models';
import { addDays } from '../../../core/program/calendar';
import { getNextAttempt, resolveCampaignPosition } from '../../../core/program/campaign-position';
import {
  getActivityChoices,
  getDayContent,
  getDayMissions,
  getHearthMission,
  getDayOrders,
} from '../../../core/program/chapter-orders';
import { getWeeklyFieldcraft } from '../../../core/program/field-manual.seed';
import {
  chapterPrograms,
  formatChapterNumeral,
  loadWorkout,
} from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { DayProgress, recordLabel } from '../../../core/state/day-progress';
import { MissionHistory } from '../../../core/state/mission-history';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { describeRoadPain, roadSessionParts } from '../../road/road-session-summary';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { formatLongDate } from '../../../shared/format-date';
import { DoneMark } from '../../../shared/done-mark/done-mark';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { IntervalTimer } from '../../../shared/interval-timer/interval-timer';
import { ActivityChoice } from '../activity-choice/activity-choice';
import { ReadinessStrip } from '../readiness-strip/readiness-strip';

const READINESS_COPY: Record<ReadinessStatus, string> = {
  green: 'Normal mission. Keep technique sound and symptoms stable.',
  yellow: 'Reduce volume about 25%. Do not increase load.',
  red: 'No strength mission. Restoration or easy movement only if appropriate.',
};

const OUTCOME_LABELS: Record<MissionOutcome, string> = {
  full: 'Full mission',
  reduced: 'Reduced mission',
  restoration: 'Restoration only',
  rest: 'Rest',
};

const OUTCOME_OPTIONS: ReadonlyArray<{ value: MissionOutcome; label: string }> = [
  { value: 'full', label: 'Full mission' },
  { value: 'reduced', label: 'Reduced mission' },
  { value: 'restoration', label: 'Restoration only' },
  { value: 'rest', label: 'Rest — record reason' },
];

@Component({
  imports: [ActivityChoice, DoneMark, FormField, Icon, IntervalTimer, ReadinessStrip, RouterLink],
  selector: 'app-mission-page',
  styleUrl: './mission-page.css',
  templateUrl: './mission-page.html',
})
export class MissionPage {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(MissionHistory);
  private readonly trialHistory = inject(TrialHistory);
  private readonly roadHistory = inject(RoadHistory);
  protected readonly progress = inject(DayProgress);
  private readonly schedule = inject(ScheduleHistory);

  protected readonly records = signal<MissionInstance[]>([]);
  /** Walks logged today, newest first. */
  protected readonly walks = signal<SavedRoadSession[]>([]);
  protected readonly walkLines = (walk: SavedRoadSession) => {
    const [distance, duration, terrain, effort] = roadSessionParts(walk);
    return `${distance} · ${duration} · ${terrain} · ${effort}`;
  };
  protected readonly walkPain = describeRoadPain;
  protected readonly isWalkMission = computed(() => {
    const mission = this.definition();
    return mission?.missionType === 'conditioning' && !mission.plannedTrialId;
  });
  private readonly completedTrials = signal<TrialResult[]>([]);
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly recordAnother = signal(false);
  protected readonly selectedActivityId = signal<string | null>(null);
  protected readonly outcomeOptions = OUTCOME_OPTIONS;
  private loadedDate: LocalDate | null = null;
  private loadSequence = 0;

  /** Today's chapter and week, from Day 1 and the saved trial passes. */
  private readonly position = computed(() => {
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
  protected readonly trialPass = computed(() => this.position()?.chapter.pass);
  protected readonly trialPassed = computed(() => Boolean(this.trialPass()));
  protected readonly nextChapterStart = computed(() => this.position()?.chapter.nextStart);
  /** The attempt after today, for an attempt day that doesn't go. */
  protected readonly nextAttempt = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? getNextAttempt(chapter, addDays(this.state.today(), 1)) : null;
  });
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
  protected readonly makeupNote = computed(() => this.scheduledDay()?.makeup?.note ?? null);

  protected readonly activityChoices = computed(() => {
    const chapter = this.scheduledDay();
    return chapter ? getActivityChoices(chapter) : [];
  });

  protected readonly definition = computed(() => {
    const choices = this.activityChoices();
    if (choices.length === 1) return choices[0] ?? null;
    const selected = choices.find((choice) => choice.id === this.selectedActivityId());
    // A moved session leads its day; the optional orders beside it stay one tap away.
    return selected ?? (this.scheduledDay()?.makeup ? (choices[0] ?? null) : null);
  });

  /** The card or practice plan taught by a documented fieldcraft order. */
  protected readonly fieldcraftGuide = computed(() => {
    const chapter = this.position()?.chapter;
    if (!chapter) return null;
    const day = getDayContent(chapter);
    if (this.definition()?.missionType !== 'fieldcraft' && !day.activity.fieldcraftPractice) {
      return null;
    }
    const fieldcraft = getWeeklyFieldcraft(chapter.contentWeek);
    if (!fieldcraft) return null;
    return fieldcraft.cardIds.length === 1
      ? {
          label: `Open field card: ${fieldcraft.title}`,
          link: ['/field-manual/cards', fieldcraft.cardIds[0]],
        }
      : {
          label: `Open ${fieldcraft.title.toLowerCase()} cards`,
          link: ['/field-manual/practice', String(fieldcraft.week)],
        };
  });

  /** What today has so far: the main order, the watches, and the smaller Done-tap orders. */
  protected readonly mainLabel = computed(() => {
    if (this.trialPass()?.date === this.state.today()) return 'Done';
    const ids = this.activityChoices().map((choice) => choice.id);
    return recordLabel(
      this.records()
        .filter((r) => ids.includes(r.definitionId))
        .at(-1) ?? null,
    );
  });
  protected readonly hearthMission = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? getHearthMission(chapter) : '';
  });
  protected readonly familyQuest = computed(() => this.activityChoices()[0]?.optionalFamilyQuest);
  protected readonly readingOrder = computed(() => {
    const first = this.activityChoices()[0];
    if (!first?.readingMinutes) return null;
    return first.readingBookTitle
      ? `Read ${first.readingBookTitle} for ${first.readingMinutes} minutes`
      : `Read for ${first.readingMinutes} minutes`;
  });
  protected readonly doneError = signal<string | null>(null);

  protected async toggleDone(item: 'hearth' | 'reading' | 'family-quest'): Promise<void> {
    this.doneError.set(null);
    try {
      await this.progress.setDone(this.state.today(), item, !this.progress.isDone(item));
    } catch {
      this.doneError.set('That could not be saved. Try again.');
    }
  }

  protected readonly recordedActivityIds = computed(() =>
    this.records().map((record) => record.definitionId),
  );

  /** An older calendar or content revision may no longer offer a saved ID today. */
  protected readonly earlierPlanRecords = computed(() => {
    const currentIds = new Set(this.activityChoices().map((choice) => choice.id));
    return this.records().filter((record) => !currentIds.has(record.definitionId));
  });

  protected readonly originalOrderTitle = computed(() => {
    const chapter = this.position()?.chapter;
    return chapter ? (getDayMissions(chapter)[1]?.title ?? null) : null;
  });

  protected readonly mainOrder = computed(() => {
    const chapter = this.scheduledDay();
    if (!chapter) return null;
    const order =
      getDayOrders(chapter, this.readiness()?.status).find((item) => item.kind === 'weekly') ??
      null;
    // A passed trial no longer waits for a Green day.
    return order?.missionType === 'trial' && this.trialPassed()
      ? { ...order, title: chapter.program.trialName }
      : order;
  });

  protected readonly mainOrderIcon = computed<IconName>(() => {
    const planned = this.activityChoices()[0];
    if (!planned) return 'footprints';
    if (planned.missionType === 'reflection') return 'book-open';
    if (planned.missionType === 'restoration' || this.readiness()?.status === 'red') return 'renew';
    return planned.missionType === 'strength' ? 'anvil' : 'footprints';
  });

  protected readonly needsReadiness = computed(() => {
    const definition = this.definition();
    return definition ? missionNeedsReadiness(definition) : false;
  });

  /**
   * On Red, a walk's or workout's own instructions (such as brisk intervals) are not today's
   * plan, and a saved trial no longer needs its instructions for recording.
   */
  protected readonly showActivityDetails = computed(() => {
    const mission = this.definition();
    if (!mission) return true;
    if (mission.plannedTrialId && this.trialPassed()) return false;
    return !(
      this.readiness()?.status === 'red' &&
      this.needsReadiness() &&
      mission.missionType !== 'restoration'
    );
  });

  /** Restoration stays open on Red, and it serves as the easy mobility on a mobility day. */
  protected readonly restorationLink = computed(() => {
    const mission = this.definition();
    const check = this.readiness();
    if (!mission || !check || this.workoutId()) return false;
    return (
      mission.missionType === 'restoration' || (check.status === 'red' && this.needsReadiness())
    );
  });

  protected readonly workoutId = computed(
    () => this.definition()?.contentReferences.find((id) => Boolean(loadWorkout(id))) ?? null,
  );

  protected readonly readiness = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check : null;
  });

  protected readonly allowedOutcomes = computed(() => {
    const definition = this.definition();
    return definition
      ? allowedMissionOutcomes(definition, this.readiness(), this.state.today())
      : [];
  });

  protected readonly latestRecord = computed(() => {
    const definition = this.definition();
    return (
      this.records()
        .filter((item) => item.definitionId === definition?.id)
        .at(-1) ?? null
    );
  });

  protected readonly earlierRecords = computed(() => {
    const definition = this.definition();
    return this.records()
      .filter((item) => item.definitionId === definition?.id)
      .slice(0, -1);
  });

  protected readonly formModel = signal({ outcome: '' as MissionOutcome | '', notes: '' });
  protected readonly noteLabel = computed(() =>
    this.formModel().outcome === 'rest'
      ? 'Reason for rest'
      : this.definition()?.missionType === 'fieldcraft'
        ? 'What did you practice?'
        : 'What did you do?',
  );
  protected readonly missionForm = form(this.formModel, (field) => {
    required(field.outcome, { message: 'Choose how the mission went.' });
    required(field.notes, {
      when: ({ valueOf }) => valueOf(field.outcome) === 'rest',
      message: 'Record a reason for rest.',
    });
  });

  constructor() {
    effect(() => {
      const date = this.state.today();
      untracked(() => this.beginDateLoad(date));
    });
  }

  protected readinessLabel(): string {
    const status = this.readiness()?.status;
    return status
      ? `${status[0].toUpperCase()}${status.slice(1)} · ${status === 'green' ? 'Ready' : status === 'yellow' ? 'Reduce' : 'Restore'}`
      : 'Not checked today';
  }

  protected readinessHelp(): string {
    const status = this.readiness()?.status;
    if (!status) return 'A check is needed before physical training.';
    if (status === 'red' && this.definition()?.missionType === 'fieldcraft') {
      return 'No strength mission. Nonexertional skill practice remains available.';
    }
    return READINESS_COPY[status];
  }

  protected chooseActivity(id: string): void {
    if (!this.activityChoices().some((choice) => choice.id === id)) return;
    this.selectedActivityId.set(id);
    this.missionForm().reset({ outcome: '', notes: '' });
    this.recordAnother.set(false);
    this.saveError.set(null);
  }

  /** A full or reduced conditioning outcome can carry the walk's details over to the Road log. */
  protected walkDetailsFor(record: MissionInstance): boolean {
    return (
      record.status === 'completed' &&
      record.definitionSnapshot?.missionType === 'conditioning' &&
      !this.walks().length
    );
  }

  protected outcomeLabel(record: MissionInstance): string {
    if (record.status === 'restoration') return OUTCOME_LABELS.restoration;
    if (record.status === 'rest') return OUTCOME_LABELS.rest;
    return record.reduced ? OUTCOME_LABELS.reduced : OUTCOME_LABELS.full;
  }

  protected unavailableReason(outcome: MissionOutcome): string {
    if (!this.needsReadiness()) return 'For physical missions only';
    const readiness = this.readiness();
    if (!readiness) return 'Check readiness first';
    if (readiness.status === 'red') return 'Unavailable on Red';
    if (readiness.status === 'yellow' && outcome === 'full') return 'Unavailable on Yellow';
    return 'Unavailable today';
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saveError.set(null);
    if (this.saving() || this.historyLoading()) return;
    const date = this.state.today();
    await this.state.initialize();
    if (date !== this.state.today() || this.loadedDate !== date) {
      this.saveError.set('A new day started. Review today’s mission before saving.');
      return;
    }
    if (this.latestRecord() && !this.recordAnother()) return;

    await submit(this.missionForm, async () => {
      const definition = this.definition();
      const values = this.formModel();
      const outcome = values.outcome;
      if (!definition || !outcome || !this.allowedOutcomes().includes(outcome)) {
        this.saveError.set('Choose an available outcome for today.');
        return;
      }

      this.saving.set(true);
      try {
        const record = createMissionRecord({
          id: `mission-${date}-${crypto.randomUUID()}`,
          definition,
          date,
          outcome,
          recordedAt: new Date().toISOString(),
          readiness: this.readiness(),
          notes: values.notes,
        });
        await this.history.add(record);
        if (date === this.state.today()) this.records.update((items) => [...items, record]);
        this.recordAnother.set(false);
        this.missionForm().reset({ outcome: '', notes: '' });
      } catch (error) {
        this.saveError.set(
          error instanceof Error ? error.message : 'The mission could not be saved. Try again.',
        );
      } finally {
        this.saving.set(false);
      }
    });
  }

  protected retry(): void {
    void this.load(this.state.today());
  }

  private beginDateLoad(date: LocalDate): void {
    if (this.loadedDate === date) return;
    this.loadedDate = date;
    // A rollover must clear yesterday's records and unfinished outcome at once.
    this.records.set([]);
    this.walks.set([]);
    this.completedTrials.set([]);
    this.selectedActivityId.set(null);
    this.recordAnother.set(false);
    this.missionForm().reset({ outcome: '', notes: '' });
    this.saveError.set(null);
    void this.load(date);
  }

  private async load(date: LocalDate): Promise<void> {
    const sequence = ++this.loadSequence;
    this.historyLoading.set(true);
    this.historyError.set(null);
    try {
      await this.state.initialize();
      if (this.state.today() !== date) return;
      const campaign = this.state.campaign();
      if (campaign) {
        // Today's chapter, its trial order, and the chapter's end all depend on saved trials.
        const [records, trials, walks] = await Promise.all([
          this.history.forDate(date),
          loadCampaignTrials(this.trialHistory),
          this.roadHistory.forDate(date),
          this.schedule.refresh(),
        ]);
        if (sequence !== this.loadSequence || this.state.today() !== date) return;
        this.records.set(records);
        this.walks.set(walks);
        void this.progress.refresh(date);
        this.completedTrials.set(trials);
        const choiceIds = new Set(this.activityChoices().map((choice) => choice.id));
        this.selectedActivityId.set(
          records.filter((record) => choiceIds.has(record.definitionId)).at(-1)?.definitionId ??
            null,
        );
      }
    } catch {
      if (sequence === this.loadSequence) {
        this.historyError.set(
          `Local mission or ${this.program().trialName} history is unavailable. Check browser storage settings, then try again.`,
        );
      }
    } finally {
      if (sequence === this.loadSequence) this.historyLoading.set(false);
    }
  }
}
