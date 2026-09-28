import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required, submit, type FieldTree } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { PostMissionFunction, TrialResult } from '../../../core/domain/models';
import {
  RECOVERY_AREAS,
  RECOVERY_NOTE_MAX,
  RECOVERY_SUGGESTED_UNTIL_MINUTES,
  recoveryAnchorAt,
  recoveryOpensAt,
  recoveryWord,
  type RecoveryAnswers,
  type RecoveryArea,
} from '../../../core/domain/post-mission-function';
import { gateTrialDefinition } from '../../../core/program/chapter-one-trial.seed';
import { TrialHistory } from '../../../core/state/trial-history';
import { formatClockTime, formatMinutes } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';

/** Post-mission function, 60–120 minutes after a completed Gate Trial: one word per area. */
@Component({
  imports: [FormField, Icon, RouterLink],
  selector: 'app-gate-trial-recovery-page',
  styleUrl: './gate-trial-recovery-page.css',
  templateUrl: './gate-trial-recovery-page.html',
})
export class GateTrialRecoveryPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly history = inject(TrialHistory);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ticker?: ReturnType<typeof setInterval>;

  protected readonly areas = RECOVERY_AREAS;
  protected readonly clock = formatClockTime;
  protected readonly minutes = formatMinutes;
  protected readonly word = recoveryWord;
  protected readonly fromKeep = this.route.snapshot.queryParamMap.get('from') === 'keep';
  protected readonly backPath = this.fromKeep ? '/keep' : '/road/gate-trial';
  protected readonly backLabel = this.fromKeep ? 'Back to Keep' : 'Back to trial';

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly result = signal<TrialResult | null>(null);
  protected readonly saved = signal<PostMissionFunction | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly now = signal(Date.now());

  protected readonly answers = signal({
    energy: '',
    soreness: '',
    irritability: '',
    helpAtHome: '',
    familyLife: '',
    note: '',
  });
  protected readonly recoveryForm = form(this.answers, (field) => {
    for (const area of RECOVERY_AREAS) {
      required(field[area.key], { message: `Choose one for ${area.label.toLowerCase()}.` });
    }
    maxLength(field.note, RECOVERY_NOTE_MAX, { message: `Keep the note under ${RECOVERY_NOTE_MAX} characters.` });
  });

  protected readonly completedAt = computed(() => {
    const result = this.result();
    return result ? recoveryAnchorAt(result) : null;
  });
  protected readonly opensAt = computed(() => {
    const result = this.result();
    return result ? recoveryOpensAt(result) : null;
  });
  protected readonly open = computed(() => {
    const opensAt = this.opensAt();
    return opensAt !== null && this.now() >= opensAt;
  });
  protected readonly minutesAfter = computed(() => {
    const completedAt = this.completedAt();
    return completedAt === null ? 0 : Math.floor((this.now() - completedAt) / 60_000);
  });
  protected readonly late = computed(() => this.minutesAfter() > RECOVERY_SUGGESTED_UNTIL_MINUTES);

  async ngOnInit(): Promise<void> {
    this.ticker = setInterval(() => this.now.set(Date.now()), 30_000);
    const resultId = this.route.snapshot.paramMap.get('resultId') ?? '';
    try {
      const [results, recoveries] = await Promise.all([
        this.history.forTrial(gateTrialDefinition.id),
        this.history.recoveries(),
      ]);
      const result = results.find((item) => item.id === resultId);
      if (!result) {
        this.loadError.set('This Gate Trial record was not found on this device.');
        return;
      }
      this.result.set(result);
      const saved = recoveries.find((entry) => entry.trialResultId === result.id) ?? null;
      this.saved.set(saved);
      if (result.postMissionFunction && !saved) {
        this.loadError.set('This older trial already has a recovery note. Review it in trial history.');
      } else if (this.opensAt() === null) {
        this.loadError.set('This trial has no usable time for a recovery check.');
      }
    } catch {
      this.loadError.set('The recovery check could not open from local storage. Try again.');
    } finally {
      this.loading.set(false);
      this.now.set(Date.now());
    }
  }

  ngOnDestroy(): void {
    if (this.ticker) clearInterval(this.ticker);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const result = this.result();
    if (!result || this.saving()) return;
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await submit(this.recoveryForm, async () => {
        const value = this.answers();
        this.saved.set(
          await this.history.addRecovery({
            id: `recovery-${crypto.randomUUID()}`,
            trialResultId: result.id,
            ...(value as unknown as RecoveryAnswers),
            note: value.note,
          }),
        );
      });
      const focus = this.saved() ? '#recovery-saved-title' : '[aria-invalid="true"]';
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(focus)?.focus(), {
        injector: this.injector,
      });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'The recovery check could not be saved. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected field(area: RecoveryArea): FieldTree<string> {
    return this.recoveryForm[area.key];
  }

  protected showError(field: FieldTree<string>): boolean {
    return field().touched() && field().invalid();
  }
}
