import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, submit, validate, type FieldTree } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { LightActivity } from '../../../core/domain/models';
import { CampaignState } from '../../../core/state/campaign-state';
import { LightActivityHistory } from '../../../core/state/light-activity-history';
import { Icon } from '../../../shared/icon/icon';

const NUMBER = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const WHOLE = /^\d{1,4}$/;

function blank() {
  return { activity: '', weight: '', sets: '', reps: '', distance: '', time: '' };
}

/** A decimal or whole count when present; blank is fine because every extra is optional. */
function optionalNumber(pattern: RegExp, message: string) {
  return ({ value }: { value: () => string }) => {
    const text = value().trim();
    return !text || (pattern.test(text) && Number(text) >= 0)
      ? undefined
      : { kind: 'range', message };
  };
}

/** Optional activity the program does not prescribe, such as a long walk or light cardio. */
@Component({
  selector: 'app-light-activity-page',
  imports: [FormField, Icon, RouterLink],
  templateUrl: './light-activity-page.html',
  styleUrl: './light-activity-page.css',
})
export class LightActivityPage implements OnInit {
  private readonly state = inject(CampaignState);
  private readonly history = inject(LightActivityHistory);

  protected readonly entries = signal<LightActivity[]>([]);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly justSaved = signal(false);
  protected readonly model = signal(blank());
  protected readonly logForm = form(this.model, (field) => {
    validate(field.activity, ({ value }) =>
      value().trim()
        ? undefined
        : { kind: 'required', message: 'Name the activity, such as cycling or a long walk.' },
    );
    validate(field.weight, optionalNumber(NUMBER, 'Enter pounds, such as 15.'));
    validate(field.sets, optionalNumber(WHOLE, 'Enter a whole number of sets.'));
    validate(field.reps, optionalNumber(WHOLE, 'Enter a whole number of reps.'));
    validate(field.distance, optionalNumber(NUMBER, 'Enter miles, such as 3.5.'));
    validate(field.time, optionalNumber(NUMBER, 'Enter minutes, such as 45.'));
  });

  async ngOnInit(): Promise<void> {
    await this.state.initialize().catch(() => undefined);
    await this.load();
  }

  protected showError(field: FieldTree<string>): boolean {
    return field().touched() && field().invalid();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saveError.set(null);
    this.justSaved.set(false);
    this.saving.set(true);
    try {
      await submit(this.logForm, async () => {
        const values = this.model();
        const date = this.state.today();
        const number = (text: string) => (text.trim() ? Number(text) : undefined);
        const entry: LightActivity = {
          id: `light-${date}-${crypto.randomUUID()}`,
          date,
          activity: values.activity.trim(),
          createdAt: new Date().toISOString(),
        };
        for (const key of ['weight', 'sets', 'reps', 'distance', 'time'] as const) {
          const value = number(values[key]);
          if (value !== undefined) entry[key] = value;
        }
        await this.history.add(entry);
        this.logForm().reset(blank());
        this.justSaved.set(true);
        await this.load();
      });
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'The activity could not be saved. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(entry: LightActivity): Promise<void> {
    try {
      await this.history.remove(entry.id);
      await this.load();
    } catch {
      this.saveError.set('The activity could not be removed. Try again.');
    }
  }

  protected summary(entry: LightActivity): string {
    const parts: string[] = [];
    if (entry.time !== undefined) parts.push(`${entry.time} min`);
    if (entry.distance !== undefined) parts.push(`${entry.distance} mi`);
    if (entry.weight !== undefined) parts.push(`${entry.weight} lb`);
    if (entry.sets !== undefined) parts.push(`${entry.sets} sets`);
    if (entry.reps !== undefined) parts.push(`${entry.reps} reps`);
    return parts.join(' · ');
  }

  private async load(): Promise<void> {
    try {
      this.entries.set(await this.history.forDate(this.state.today()));
    } catch {
      this.entries.set([]);
    }
  }
}
