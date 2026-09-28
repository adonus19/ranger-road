import { Component, computed, input } from '@angular/core';
import type { ReadinessSummary } from '../../../core/domain/models';

const ONE_PLACE = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Read-only averages from the readiness checks a check-in looks back over. */
@Component({
  selector: 'app-readiness-lookback',
  styleUrl: './readiness-lookback.css',
  templateUrl: './readiness-lookback.html',
})
export class ReadinessLookback {
  readonly summary = input<ReadinessSummary | null>(null);
  readonly error = input(false);

  protected readonly sleep = computed(() => this.format(this.summary()?.averageSleepHours));
  protected readonly pains = computed(() => {
    const summary = this.summary();
    return [
      { label: 'Back pain', value: this.format(summary?.averageBackPain) },
      { label: 'Shoulder pain', value: this.format(summary?.averageShoulderPain) },
      { label: 'Neck pain', value: this.format(summary?.averageNeckPain) },
    ];
  });
  protected readonly note = computed(() => {
    const checks = this.summary()?.checks ?? 0;
    return `Averages from ${checks} readiness ${checks === 1 ? 'check' : 'checks'}.`;
  });

  private format(value: number | undefined): string {
    return value === undefined ? '' : ONE_PLACE.format(value);
  }
}
