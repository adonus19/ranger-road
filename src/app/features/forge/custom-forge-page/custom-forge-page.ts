import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { TrialResult, WorkoutDraft, WorkoutSession } from '../../../core/domain/models';
import { resolveCampaignPosition } from '../../../core/program/campaign-position';
import {
  CUSTOM_FORGE_ID,
  CUSTOM_SETS_MAX,
  CUSTOM_SETS_MIN,
  buildCustomForge,
  builderLibrary,
  doseLabel,
  lastCustomList,
  repeatNote,
  type BuilderExercise,
  type CustomPick,
} from '../../../core/program/custom-forge';
import { getExerciseGuide } from '../../../core/program/exercise-guides';
import { chapterPrograms } from '../../../core/program/program-catalog';
import { CampaignState } from '../../../core/state/campaign-state';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { ScheduleHistory } from '../../../core/state/schedule-history';
import { TrialHistory, loadCampaignTrials } from '../../../core/state/trial-history';
import { WorkoutHistory } from '../../../core/state/workout-history';
import { Icon } from '../../../shared/icon/icon';
import { OrderEditor, type OrderItem } from '../order-editor/order-editor';

type Step = 'pick' | 'order';

export const KEEP_IT_LIGHT = 'Keep it light.';

/**
 * The custom Forge builder, from Chapter II: pick from the library in tap order, set the order,
 * then begin with the standard warm-up in front. Nothing is stored until Begin starts the session.
 */
@Component({
  imports: [Icon, OrderEditor, RouterLink],
  selector: 'app-custom-forge-page',
  styleUrl: './custom-forge-page.css',
  templateUrl: './custom-forge-page.html',
})
export class CustomForgePage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(WorkoutHistory);
  private readonly trialHistory = inject(TrialHistory);
  private readonly schedule = inject(ScheduleHistory);
  private readonly progression = inject(ProgressionHistory);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<WorkoutDraft | null>(null);
  private readonly sessions = signal<readonly WorkoutSession[]>([]);
  private readonly completedTrials = signal<TrialResult[]>([]);

  protected readonly step = signal<Step>('pick');
  /** Picked exercises in tap order. */
  protected readonly picks = signal<CustomPick[]>([]);
  /** On the order step: indices into `picks`, in the order they will be worked. */
  protected readonly order = signal<number[]>([]);
  protected readonly setsMin = CUSTOM_SETS_MIN;
  protected readonly setsMax = CUSTOM_SETS_MAX;
  protected readonly doseLabel = doseLabel;

  private readonly position = computed(() => {
    const campaign = this.state.campaign();
    return campaign
      ? resolveCampaignPosition(campaign.startDate, this.state.today(), this.completedTrials())
      : null;
  });
  protected readonly program = computed(
    () => this.position()?.chapter.program ?? chapterPrograms[0],
  );
  protected readonly readiness = computed(() => {
    const check = this.state.readiness();
    return check?.date === this.state.today() ? check : null;
  });
  /** Today's optional Forge card, when it opens this builder. */
  protected readonly offer = computed(() => {
    const campaign = this.state.campaign();
    if (!campaign || this.position()?.awaitingNextChapter) return null;
    const offer = this.schedule.optionalForge(
      campaign.startDate,
      this.state.today(),
      this.completedTrials(),
      this.readiness()?.status ?? null,
    );
    return offer?.workoutId === CUSTOM_FORGE_ID ? offer : null;
  });

  protected readonly sections = computed(() => builderLibrary(this.program()));
  private readonly byId = computed(
    () =>
      new Map(
        this.sections().flatMap((section) =>
          section.exercises.map((exercise) => [exercise.exerciseId, exercise] as const),
        ),
      ),
  );
  /** Each picked exercise's place in tap order, from 1. */
  protected readonly positions = computed(
    () => new Map(this.picks().map((pick, index) => [pick.exerciseId, index + 1])),
  );
  protected readonly lastList = computed(() => lastCustomList(this.sessions(), this.program()));
  protected readonly repeat = computed(() =>
    repeatNote(this.picks(), this.sessions(), this.state.today(), (id) => this.nameOf(id)),
  );
  protected readonly orderItems = computed<OrderItem[]>(() =>
    this.order().map((index) => ({
      index,
      name: this.nameOf(this.picks()[index]?.exerciseId ?? ''),
    })),
  );
  /** Sets across the session, for the order step's summary line. */
  protected readonly totalSets = computed(() =>
    this.picks().reduce((total, pick) => total + pick.sets, 0),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.state.initialize();
      const [active, trials] = await Promise.all([
        this.history.active(),
        loadCampaignTrials(this.trialHistory),
        this.schedule.refresh(),
      ]);
      this.active.set(active ?? null);
      this.completedTrials.set(trials);
      try {
        this.sessions.set((await this.progression.load()).sessions);
      } catch {
        // Last time's list and the repeat note are conveniences; the builder works without them.
        this.sessions.set([]);
      }
    } catch {
      this.error.set('The builder could not open from local storage. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected nameOf(exerciseId: string): string {
    return getExerciseGuide(exerciseId)?.name ?? exerciseId;
  }

  protected setsOf(exerciseId: string): number {
    return this.picks().find((pick) => pick.exerciseId === exerciseId)?.sets ?? 0;
  }

  /** Tapping adds to the end; tapping again removes, and the later numbers close up. */
  protected toggle(exercise: BuilderExercise): void {
    this.picks.update((picks) =>
      picks.some((pick) => pick.exerciseId === exercise.exerciseId)
        ? picks.filter((pick) => pick.exerciseId !== exercise.exerciseId)
        : [...picks, { exerciseId: exercise.exerciseId, sets: exercise.dose.sets ?? 1 }],
    );
  }

  protected changeSets(exerciseId: string, by: -1 | 1): void {
    this.picks.update((picks) =>
      picks.map((pick) =>
        pick.exerciseId === exerciseId
          ? {
              ...pick,
              sets: Math.min(this.setsMax, Math.max(this.setsMin, pick.sets + by)),
            }
          : pick,
      ),
    );
  }

  protected useLastList(): void {
    this.picks.set(this.lastList().map((pick) => ({ ...pick })));
  }

  protected donePicking(): void {
    if (!this.picks().length) return;
    this.order.set(this.picks().map((_, index) => index));
    this.goTo('order');
  }

  /** Back to the picks, numbered in the order just set. */
  protected backToPicks(): void {
    const picks = this.picks();
    this.picks.set(this.order().map((index) => picks[index]));
    this.goTo('pick');
  }

  protected reorder(order: number[]): void {
    this.order.set(order);
  }

  protected useTapOrder(): void {
    this.order.set(this.picks().map((_, index) => index));
  }

  protected async begin(): Promise<void> {
    const offer = this.offer();
    if (this.saving() || !offer || !this.readiness()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const picks = this.picks();
      const definition = buildCustomForge(
        this.program(),
        this.order().map((index) => picks[index]),
      );
      await this.history.start({
        date: this.state.today(),
        definition,
        kind: 'custom',
        // A deload week keeps it light, so the session never reads as a full one.
        reduced: offer.light,
        ...(offer.light ? { sessionInstructions: [KEEP_IT_LIGHT] } : {}),
      });
      await this.router.navigate(['/forge/session', CUSTOM_FORGE_ID]);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'The session could not start. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private goTo(step: Step): void {
    this.step.set(step);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      document.getElementById('builder-title')?.focus({ preventScroll: true });
    });
  }
}
