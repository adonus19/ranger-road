import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import {
  allowedMissionOutcomes,
  createMissionRecord,
  missionNeedsReadiness,
  type MissionOutcome,
} from '../../../core/domain/mission';
import type { MissionInstance, ReadinessStatus } from '../../../core/domain/models';
import { chapterOneDefinition } from '../../../core/program/chapter-one.seed';
import {
  getChapterOneActivityChoicesForDate,
  getChapterOneMissionsForDate,
} from '../../../core/program/chapter-one-missions';
import { getTodaysOrders } from '../../../core/program/campaign';
import { loadChapterOneWorkout } from '../../../core/program/chapter-one-workouts';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionHistory } from '../../../core/state/mission-history';
import { Icon, type IconName } from '../../../shared/icon/icon';
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
  imports: [ActivityChoice, FormField, Icon, ReadinessStrip, RouterLink],
  selector: 'app-mission-page',
  styleUrl: './mission-page.css',
  templateUrl: './mission-page.html',
})
export class MissionPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(MissionHistory);

  protected readonly records = signal<MissionInstance[]>([]);
  protected readonly historyLoading = signal(true);
  protected readonly historyError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly recordAnother = signal(false);
  protected readonly selectedActivityId = signal<string | null>(null);
  protected readonly outcomeOptions = OUTCOME_OPTIONS;

  protected readonly activityChoices = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || campaign.currentChapterId !== chapterOneDefinition.id) return [];
    return getChapterOneActivityChoicesForDate(campaign.startDate, this.state.today());
  });

  protected readonly definition = computed(() => {
    const choices = this.activityChoices();
    return choices.length === 1
      ? (choices[0] ?? null)
      : (choices.find((choice) => choice.id === this.selectedActivityId()) ?? null);
  });

  protected readonly recordedActivityIds = computed(() =>
    this.records().map((record) => record.definitionId),
  );

  /** An older calendar or content revision may no longer offer a saved ID today. */
  protected readonly earlierPlanRecords = computed(() => {
    const currentIds = new Set(this.activityChoices().map((choice) => choice.id));
    return this.records().filter((record) => !currentIds.has(record.definitionId));
  });

  protected readonly originalOrderTitle = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? (getChapterOneMissionsForDate(campaign.startDate, this.state.today())[1]?.title ?? null)
      : null;
  });

  protected readonly mainOrder = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign) return null;
    return (
      getTodaysOrders(campaign.startDate, this.state.today(), this.readiness()?.status).find(
        (order) => order.kind === 'weekly',
      ) ?? null
    );
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

  protected readonly workoutId = computed(
    () =>
      this.definition()?.contentReferences.find((id) => Boolean(loadChapterOneWorkout(id))) ?? null,
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

  ngOnInit(): void {
    void this.load();
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
      record.status === 'completed' && record.definitionSnapshot?.missionType === 'conditioning'
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
    if (this.saving() || (this.latestRecord() && !this.recordAnother())) return;

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
          id: `mission-${this.state.today()}-${crypto.randomUUID()}`,
          definition,
          date: this.state.today(),
          outcome,
          recordedAt: new Date().toISOString(),
          readiness: this.readiness(),
          notes: values.notes,
        });
        await this.history.add(record);
        this.records.update((items) => [...items, record]);
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
    void this.load();
  }

  private async load(): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(null);
    try {
      await this.state.initialize();
      if (this.state.campaign()) {
        const records = await this.history.forDate(this.state.today());
        this.records.set(records);
        const choiceIds = new Set(this.activityChoices().map((choice) => choice.id));
        this.selectedActivityId.set(
          records.filter((record) => choiceIds.has(record.definitionId)).at(-1)?.definitionId ??
            null,
        );
      }
    } catch {
      this.historyError.set(
        'Local mission history is unavailable. Check browser storage settings, then try again.',
      );
    } finally {
      this.historyLoading.set(false);
    }
  }
}
