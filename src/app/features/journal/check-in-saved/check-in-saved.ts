import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SavedMeasurement } from '../../../core/domain/measurement';
import { formatLongDate } from '../../../shared/format-date';
import { measurementLines } from '../measurement-summary';

/** The confirmation shown once a check-in, or its held tests, is saved. */
@Component({
  imports: [RouterLink],
  selector: 'app-check-in-saved',
  styleUrl: './check-in-saved.css',
  templateUrl: './check-in-saved.html',
})
export class CheckInSaved {
  readonly entry = input.required<SavedMeasurement>();
  readonly backPath = input.required<string>();
  readonly backLabel = input.required<string>();

  protected readonly title = computed(
    () => ({ 'check-in': 'Check-in saved', body: 'Weight and waist saved', tests: 'Tests saved' })[this.entry().kind],
  );
  protected readonly date = computed(() => formatLongDate(this.entry().date));
  protected readonly lines = computed(() => measurementLines(this.entry()));
}
