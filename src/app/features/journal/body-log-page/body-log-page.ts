import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormField, form, submit, validate, type FieldTree } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { createMeasurementEntry, type SavedMeasurement } from '../../../core/domain/measurement';
import { CampaignState } from '../../../core/state/campaign-state';
import { MeasurementHistory } from '../../../core/state/measurement-history';
import { formatLongDate } from '../../../shared/format-date';
import { Icon } from '../../../shared/icon/icon';
import { CheckInSaved } from '../check-in-saved/check-in-saved';
import { checkText, decimalIn } from '../measurement-validators';

/** Weight and waist on any day, between check-ins. Either one is enough. */
@Component({
  imports: [CheckInSaved, FormField, Icon, RouterLink],
  selector: 'app-body-log-page',
  styleUrl: './body-log-page.css',
  templateUrl: './body-log-page.html',
})
export class BodyLogPage implements OnInit {
  private readonly state = inject(CampaignState);
  private readonly history = inject(MeasurementHistory);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saved = signal<SavedMeasurement | null>(null);
  protected readonly dateLine = computed(() => formatLongDate(this.state.today()));

  protected readonly entry = signal({ weight: '', waist: '' });
  protected readonly bodyForm = form(this.entry, (field) => {
    validate(field.weight, ({ value, valueOf }) =>
      value().trim() || valueOf(field.waist).trim()
        ? undefined
        : { kind: 'required', message: 'Enter a weight, a waist, or both.' },
    );
    checkText(field.weight, decimalIn(0, 1000), 'Enter a weight such as 221.6.');
    checkText(field.waist, decimalIn(0, 100), 'Enter a waist such as 41.5.');
  });

  ngOnInit(): void {
    void this.state.initialize().catch(() => undefined);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) {
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await submit(this.bodyForm, async () => {
        const { weight, waist } = this.entry();
        const date = this.state.today();
        const record = createMeasurementEntry({
          id: `measure-${date}-${crypto.randomUUID()}`,
          kind: 'body',
          date,
          recordedAt: new Date().toISOString(),
          weight: weight.trim() ? Number(weight) : undefined,
          waist: waist.trim() ? Number(waist) : undefined,
        });
        await this.history.add(record);
        this.saved.set(record);
      });
      const focus = this.saved() ? '#saved-title' : '[aria-invalid="true"]';
      afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(focus)?.focus(), {
        injector: this.injector,
      });
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'This could not be saved. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected showError(field: FieldTree<string>): boolean {
    return field().touched() && field().invalid();
  }
}
