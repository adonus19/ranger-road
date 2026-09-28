import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, required, submit, validate, type FieldTree } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  createMeasurementEntry,
  summarizeReadiness,
  type SavedMeasurement,
} from '../../../core/domain/measurement';
import type { ReadinessSummary, ReadinessStatus, SquatDepth } from '../../../core/domain/models';
import { addDays, getCampaignDay } from '../../../core/program/campaign';
import {
  checkInSaveError,
  getCheckInStatus,
  getCheckInWindow,
  testsHeldFor,
} from '../../../core/program/check-in-schedule';
import { CHECK_IN_HELP, SQUAT_DEPTH_CHOICES } from '../../../core/program/measurement-guide';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { formatLongDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { CheckInSaved } from '../check-in-saved/check-in-saved';
import { checkText, decimalIn, decimalUpTo, wholeIn } from '../measurement-validators';
import { ReadinessLookback } from '../readiness-lookback/readiness-lookback';

const LIST = new Intl.ListFormat('en-US', { type: 'conjunction' });
/** The look-back covers today and the 27 days before it. */
const LOOKBACK_DAYS = 28;

function blankEntry() {
  return {
    weight: '',
    waist: '',
    restingHeartRate: '',
    systolic: '',
    diastolic: '',
    pushups: '',
    pullupAssistance: '',
    squatDepth: '',
    toeReach: '',
    energy: '',
    capability: '',
  };
}

@Component({
  imports: [CheckInSaved, FormField, Icon, ReadinessLookback, RouterLink],
  selector: 'app-check-in-page',
  styleUrl: './check-in-page.css',
  templateUrl: './check-in-page.html',
})
export class CheckInPage implements OnInit {
  protected readonly state = inject(CampaignState);
  private readonly history = inject(MeasurementHistory);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly help = CHECK_IN_HELP;
  protected readonly squatDepths = SQUAT_DEPTH_CHOICES;
  protected readonly ratingLevels = ['1', '2', '3', '4', '5'];

  /** ?part=tests adds the tests a Red day held back at the check-in. */
  protected readonly testsOnly = this.route.snapshot.queryParamMap.get('part') === 'tests';
  /** Opened from the Keep reminder, the way back returns there. */
  private readonly fromKeep = this.route.snapshot.queryParamMap.get('from') === 'keep';
  protected readonly backPath = this.fromKeep ? '/keep' : '/journal';
  protected readonly backLabel = this.fromKeep ? 'Back to Keep' : 'Back to Journal';

  protected readonly summary = signal<ReadinessSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  private readonly previousEntries = signal<SavedMeasurement[]>([]);
  private readonly currentReadiness = signal<ReadinessStatus | undefined>(undefined);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal<SavedMeasurement | null>(null);

  private readonly window = computed(() => {
    const campaign = this.state.campaign();
    return campaign ? getCheckInWindow(campaign.startDate, this.state.today()) : null;
  });

  protected readonly title = computed(() => {
    if (this.testsOnly) {
      return 'Check-in tests';
    }
    return (this.window()?.index ?? 0) === 0 ? 'Day 1 check-in' : 'Monthly check-in';
  });

  protected readonly titleWords = computed(() => this.title().split(' '));

  /** "Day 29 · Monday, October 12". */
  protected readonly dateLine = computed(() => {
    const campaign = this.state.campaign();
    const today = this.state.today();
    const date = formatLongDate(today);
    return campaign ? `Day ${getCampaignDay(campaign.startDate, today)} · ${date}` : date;
  });

  /** On a Red readiness day the four tests wait for another day. */
  protected readonly testsHeld = computed(() => testsHeldFor(this.currentReadiness()));
  protected readonly needsReadiness = computed(() => !this.currentReadiness());
  protected readonly needsTestReadiness = computed(() => {
    const window = this.window();
    return this.testsOnly && !!window && getCheckInStatus(this.previousEntries(), window) === 'tests'
      && this.needsReadiness();
  });
  protected readonly unavailable = computed(() => {
    if (this.state.error()) {
      return this.state.error();
    }
    return checkInSaveError(
      this.state.campaign()?.startDate,
      this.state.today(),
      this.testsOnly ? 'tests' : 'check-in',
      this.previousEntries(),
      this.currentReadiness(),
    );
  });

  protected readonly entry = signal(blankEntry());
  protected readonly checkInForm = form(this.entry, (field) => {
    const needed = () => !this.testsOnly;
    required(field.weight, { when: needed, message: 'Enter your weight in pounds.' });
    checkText(field.weight, decimalIn(0, 1000), 'Enter a weight such as 221.6.');
    required(field.waist, { when: needed, message: 'Enter your waist in inches.' });
    checkText(field.waist, decimalIn(0, 100), 'Enter a waist such as 41.5.');
    required(field.restingHeartRate, { when: needed, message: 'Enter your resting heart rate.' });
    checkText(field.restingHeartRate, wholeIn(20, 250), 'Enter whole beats per minute, such as 68.');
    validate(field.systolic, ({ value, valueOf }) => {
      const systolic = value().trim();
      const diastolic = valueOf(field.diastolic).trim();
      if (!systolic && !diastolic) {
        return undefined;
      }
      if (!systolic || !diastolic) {
        return { kind: 'required', message: 'Enter both blood pressure numbers, or neither.' };
      }
      if (!wholeIn(50, 300)(systolic) || !wholeIn(20, 200)(diastolic)) {
        return { kind: 'range', message: 'Enter whole numbers, such as 128 over 82.' };
      }
      return Number(systolic) > Number(diastolic)
        ? undefined
        : { kind: 'range', message: 'The first number is the higher one.' };
    });
    checkText(field.pushups, wholeIn(0, 500), 'Enter whole push-ups, 0 or more.');
    checkText(field.pullupAssistance, (text) => text.length <= 60, 'Keep this under 60 characters.');
    checkText(field.toeReach, decimalUpTo(60), 'Enter inches, such as 3, or 0 if you touched the floor.');
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      await this.state.initialize();
      if (!this.state.campaign()) {
        return;
      }
      const [entries, checks] = await Promise.all([
        this.history.all(),
        this.history.readinessChecks(),
      ]);
      const today = this.state.today();
      this.previousEntries.set(entries);
      this.summary.set(summarizeReadiness(checks, addDays(today, 1 - LOOKBACK_DAYS), today));
      this.currentReadiness.set(checks
        .filter((check) => check.date === today)
        .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt) || a.id.localeCompare(b.id))
        .at(-1)?.status);
    } catch {
      this.loadError.set('Your local check-in history could not be read. Try again before saving.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || this.loading() || this.loadError()) {
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    try {
      let reason = this.saveRule();
      if (reason?.startsWith('Check readiness today')) {
        // A check may have been saved in another tab since this form opened.
        await this.load();
        if (this.loadError()) {
          return;
        }
        reason = this.saveRule();
      }
      if (reason) {
        this.saveError.set(reason);
        return;
      }
      if (this.testsOnly && !this.hasTest()) {
        this.saveError.set('Enter at least one test, then save.');
        return;
      }
      await submit(this.checkInForm, async () => {
        const record = this.buildRecord();
        this.saved.set(await this.history.add(record));
      });
      if (this.saved()) {
        this.focusAfterRender('#saved-title');
      } else {
        this.saveError.set(this.invalidSummary());
        this.focusAfterRender('[aria-invalid="true"]');
      }
    } catch (error) {
      // Refresh the form after a concurrent readiness or check-in change, while
      // keeping the typed body values so the person can save them safely.
      await this.load();
      this.saveError.set(
        error instanceof Error ? error.message : 'The check-in could not be saved. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  /** An answer shows its error once it has been touched, or after a save attempt. */
  protected showError(field: FieldTree<string>): boolean {
    return field().touched() && field().invalid();
  }

  private hasTest(): boolean {
    const { pushups, pullupAssistance, squatDepth, toeReach } = this.entry();
    return [pushups, pullupAssistance, squatDepth, toeReach].some((value) => value.trim() !== '');
  }

  private saveRule(): string | null {
    return checkInSaveError(
      this.state.campaign()?.startDate,
      this.state.today(),
      this.testsOnly ? 'tests' : 'check-in',
      this.previousEntries(),
      this.currentReadiness(),
      this.hasTest() && !this.testsHeld() && !this.needsReadiness(),
    );
  }

  private buildRecord(): SavedMeasurement {
    const values = this.entry();
    const date = this.state.today();
    const number = (text: string) => (text.trim() ? Number(text) : undefined);
    const tests = !this.testsOnly && (this.testsHeld() || this.needsReadiness())
      ? {}
      : {
          pushups: number(values.pushups),
          pullupAssistance: values.pullupAssistance.trim() || undefined,
          squatDepth: (values.squatDepth || undefined) as SquatDepth | undefined,
          toeReach: number(values.toeReach),
        };
    const base = {
      id: `measure-${date}-${crypto.randomUUID()}`,
      date,
      recordedAt: new Date().toISOString(),
    };
    if (this.testsOnly) {
      return createMeasurementEntry({ ...base, kind: 'tests', ...tests });
    }
    return createMeasurementEntry({
      ...base,
      kind: 'check-in',
      weight: number(values.weight),
      waist: number(values.waist),
      restingHeartRate: number(values.restingHeartRate),
      bloodPressure: values.systolic.trim()
        ? { systolic: Number(values.systolic), diastolic: Number(values.diastolic) }
        : undefined,
      ...tests,
      energy: number(values.energy),
      capabilityRating: number(values.capability),
      testsHeld: this.testsHeld() || undefined,
    });
  }

  /** Names only the answers that stopped the save. */
  private invalidSummary(): string {
    const answers: [FieldTree<string>, string][] = [
      [this.checkInForm.weight, 'weight'],
      [this.checkInForm.waist, 'waist'],
      [this.checkInForm.restingHeartRate, 'resting heart rate'],
      [this.checkInForm.systolic, 'blood pressure'],
      [this.checkInForm.pushups, 'push-ups'],
      [this.checkInForm.pullupAssistance, 'pull-up band'],
      [this.checkInForm.toeReach, 'toe reach'],
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
}
