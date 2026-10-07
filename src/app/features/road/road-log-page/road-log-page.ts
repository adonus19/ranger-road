import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormField,
  form,
  required,
  submit,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { LocalDate, MissionDefinition } from '../../../core/domain/models';
import { addDays, isLocalDate } from '../../../core/program/campaign';
import { CampaignState } from '../../../core/state/campaign-state';
import { MissionRecorder, type RecordedMission } from '../../../core/state/mission-recorder';
import { RoadHistory, type SavedRoadSession } from '../../../core/state/road-history';
import { Icon } from '../../../shared/icon/icon';
import { IntervalTimer } from '../../../shared/interval-timer/interval-timer';
import { WalkSaved } from '../walk-saved/walk-saved';

type DateChoice = 'today' | 'yesterday' | 'other';

const MILES = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
const WHOLE_MINUTES = /^\d{1,4}$/;
const LIST = new Intl.ListFormat('en-US', { type: 'conjunction' });

function blankEntry(terrain = '') {
  return {
    dateChoice: 'today' as DateChoice,
    otherDate: '',
    miles: '',
    minutes: '',
    terrain,
    rpe: '',
    painBefore: '',
    painAfter: '',
  };
}

@Component({
  imports: [FormField, Icon, IntervalTimer, RouterLink, WalkSaved],
  selector: 'app-road-log-page',
  styleUrl: './road-log-page.css',
  templateUrl: './road-log-page.html',
})
export class RoadLogPage implements OnInit {
  private readonly state = inject(CampaignState);
  private readonly history = inject(RoadHistory);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recorder = inject(MissionRecorder);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly walkDate = viewChild<ElementRef<HTMLInputElement>>('walkDate');

  protected readonly effortLevels = Array.from({ length: 10 }, (_, index) => String(index + 1));
  protected readonly painLevels = Array.from({ length: 11 }, (_, level) => String(level));

  /** Opened from Today's Mission, the way back returns there. */
  protected readonly fromMission = this.route.snapshot.queryParamMap.get('from') === 'mission';
  protected readonly backPath = this.fromMission ? '/keep/mission' : '/road';
  protected readonly backLabel = this.fromMission ? 'Back to Today’s Mission' : 'Back to Road';

  /** A saved walk opened to correct or remove. */
  private readonly editId = this.route.snapshot.queryParamMap.get('edit');
  protected readonly editing = signal<SavedRoadSession | null>(null);
  protected readonly confirmRemove = signal(false);
  /** Today's walk mission, when a walk logged for today would fulfil it. */
  protected readonly walkMission = signal<MissionDefinition | null>(null);
  protected readonly reducedWalk = signal(false);
  protected readonly missionResult = signal<RecordedMission | null>(null);
  protected readonly removed = signal(false);

  protected readonly painOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal<SavedRoadSession | null>(null);
  private lastTerrain = '';

  protected readonly entry = signal(blankEntry());
  protected readonly logForm = form(this.entry, (field) => {
    required(field.otherDate, {
      when: ({ valueOf }) => valueOf(field.dateChoice) === 'other',
      message: 'Choose the date of the walk.',
    });
    validate(field.otherDate, ({ value, valueOf }) => {
      const date = value();
      if (valueOf(field.dateChoice) !== 'other' || !date) {
        return undefined;
      }
      // Civil dates in YYYY-MM-DD form compare correctly as strings.
      return isLocalDate(date) && date <= this.state.today()
        ? undefined
        : { kind: 'range', message: 'Choose today or an earlier date.' };
    });
    required(field.miles, { message: 'Enter the miles you walked.' });
    validate(field.miles, ({ value }) => {
      const miles = value().trim();
      return !miles || (MILES.test(miles) && Number(miles) > 0)
        ? undefined
        : { kind: 'range', message: 'Enter miles above zero, such as 2 or 2.5.' };
    });
    required(field.minutes, { message: 'Enter the minutes you walked.' });
    validate(field.minutes, ({ value }) => {
      const minutes = value().trim();
      return !minutes || (WHOLE_MINUTES.test(minutes) && Number(minutes) > 0)
        ? undefined
        : { kind: 'range', message: 'Enter whole minutes above zero.' };
    });
    validate(field.terrain, ({ value }) =>
      value().trim()
        ? undefined
        : { kind: 'required', message: 'Describe the ground, such as paved path or trail.' },
    );
    required(field.rpe, { message: 'Choose an effort from 1 to 10.' });
  });

  /** A choice only for a new walk logged for today against today's walk mission. */
  protected readonly showReducedChoice = computed(
    () =>
      !this.editing() &&
      !!this.walkMission() &&
      this.state.readiness()?.status === 'green' &&
      this.sessionDate() === this.state.today(),
  );

  protected readonly missionNote = computed(() => {
    const result = this.missionResult();
    if (!result) return null;
    if (result.recorded) {
      return `Today’s mission is recorded as ${result.outcome === 'reduced' ? 'Reduced' : 'Full'}.`;
    }
    return result.reason === 'readiness' ? 'Check readiness to record today’s mission.' : null;
  });

  /** The civil date the walk will be saved under. */
  protected readonly sessionDate = computed<LocalDate>(() => {
    const { dateChoice, otherDate } = this.entry();
    const today = this.state.today();
    if (dateChoice === 'yesterday') {
      return addDays(today, -1);
    }
    return dateChoice === 'other' ? otherDate : today;
  });

  constructor() {
    // The picker offers no future dates; the validator still guards typed ones.
    afterRenderEffect(() => {
      const input = this.walkDate()?.nativeElement;
      if (input) {
        input.max = this.state.today();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.state.initialize().catch(() => undefined);
    if (this.editId && (await this.loadEdit(this.editId))) return;
    this.applyRequestedDate(this.route.snapshot.queryParamMap.get('date'));
    try {
      this.walkMission.set(
        await this.recorder.findToday({
          definitionId: this.route.snapshot.queryParamMap.get('mission') ?? undefined,
          missionType: 'conditioning',
        }),
      );
    } catch {
      // Without the plan, the walk still saves on its own.
    }
    try {
      this.lastTerrain = (await this.history.recent(1))[0]?.terrain ?? '';
    } catch {
      // History is only used for a default; saving reports its own storage errors.
    }
    if (this.lastTerrain && !this.entry().terrain) {
      this.entry.update((entry) => ({ ...entry, terrain: this.lastTerrain }));
    }
  }

  /** Closing the pain section clears it, so nothing hidden is saved. */
  protected togglePain(): void {
    if (this.painOpen()) {
      this.entry.update((entry) => ({ ...entry, painBefore: '', painAfter: '' }));
    }
    this.painOpen.update((open) => !open);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) {
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await submit(this.logForm, async () => {
        const values = this.entry();
        const date = this.sessionDate();
        const editing = this.editing();
        const mission = this.walkMission();
        const forToday = !editing && date === this.state.today() && mission;
        const session: SavedRoadSession = {
          ...(editing ?? {}),
          id: editing?.id ?? `road-${date}-${crypto.randomUUID()}`,
          date,
          distance: Number(values.miles),
          duration: Number(values.minutes),
          terrain: values.terrain.trim(),
          rpe: Number(values.rpe),
          ...(values.painBefore !== '' ? { painBefore: Number(values.painBefore) } : {}),
          ...(values.painAfter !== '' ? { painAfter: Number(values.painAfter) } : {}),
        };
        if (values.painBefore === '') delete session.painBefore;
        if (values.painAfter === '') delete session.painAfter;
        if (editing) {
          session.editedAt = new Date().toISOString();
          await this.history.update(session);
        } else {
          if (forToday) session.missionId = mission.id;
          await this.history.add(session);
          if (forToday) await this.recordMission(mission);
        }
        this.lastTerrain = session.terrain;
        this.saved.set(session);
      });
      if (this.saved()) {
        this.focusAfterRender('#saved-title');
      } else {
        this.saveError.set(this.invalidSummary());
        this.focusAfterRender('[aria-invalid="true"]');
      }
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'The walk could not be saved. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  /** An answer shows its error once it has been touched, or after a save attempt. */
  protected showError(field: FieldTree<string>): boolean {
    return field().touched() && field().invalid();
  }

  protected async remove(): Promise<void> {
    const session = this.editing();
    if (!session || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.history.remove(session.id);
      this.removed.set(true);
      this.confirmRemove.set(false);
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'The walk could not be removed. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected goBack(): void {
    void this.router.navigateByUrl(this.backPath);
  }

  /** The walk is already saved; recording the mission is a courtesy that can fail quietly. */
  private async recordMission(mission: MissionDefinition): Promise<void> {
    try {
      this.missionResult.set(
        await this.recorder.recordToday(
          { definitionId: mission.id },
          { reduced: this.reducedWalk() },
        ),
      );
    } catch {
      this.missionResult.set(null);
    }
  }

  private async loadEdit(id: string): Promise<boolean> {
    try {
      const session = await this.history.get(id);
      if (!session) return false;
      this.editing.set(session);
      const today = this.state.today();
      this.entry.set({
        dateChoice:
          session.date === today
            ? 'today'
            : session.date === addDays(today, -1)
              ? 'yesterday'
              : 'other',
        otherDate:
          session.date === today || session.date === addDays(today, -1) ? '' : session.date,
        miles: String(session.distance),
        minutes: String(session.duration),
        terrain: session.terrain,
        rpe: String(session.rpe),
        painBefore: session.painBefore !== undefined ? String(session.painBefore) : '',
        painAfter: session.painAfter !== undefined ? String(session.painAfter) : '',
      });
      this.painOpen.set(session.painBefore !== undefined || session.painAfter !== undefined);
      return true;
    } catch {
      return false;
    }
  }

  protected logAnother(): void {
    this.logForm().reset(blankEntry(this.lastTerrain));
    this.missionResult.set(null);
    this.reducedWalk.set(false);
    this.painOpen.set(false);
    this.saveError.set(null);
    this.saved.set(null);
    // A second walk joins the mission already recorded; nothing more to record.
  }

  /** Names only the answers that stopped the save. */
  private invalidSummary(): string {
    const answers: [FieldTree<string>, string][] = [
      [this.logForm.otherDate, 'date'],
      [this.logForm.miles, 'miles'],
      [this.logForm.minutes, 'minutes'],
      [this.logForm.terrain, 'terrain'],
      [this.logForm.rpe, 'effort'],
    ];
    const names = answers.filter(([field]) => field().invalid()).map(([, name]) => name);
    return names.length
      ? `Check the ${LIST.format(names)} above, then save again.`
      : 'Check the marked answers above, then save again.';
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }

  private applyRequestedDate(requested: string | null): void {
    const today = this.state.today();
    if (!requested || !isLocalDate(requested) || requested > today) {
      return;
    }
    const dateChoice: DateChoice =
      requested === today ? 'today' : requested === addDays(today, -1) ? 'yesterday' : 'other';
    this.entry.update((entry) => ({
      ...entry,
      dateChoice,
      otherDate: dateChoice === 'other' ? requested : '',
    }));
  }
}
