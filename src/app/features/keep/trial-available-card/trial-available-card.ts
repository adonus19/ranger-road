import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/icon/icon';

/**
 * The quiet "<trial> available" row on Keep once an any-day trial's chapter has ended. It is not
 * an order: no medallion, no Done mark, and nothing is said on a day it is left alone.
 */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-trial-available-card',
  styleUrl: './trial-available-card.css',
  templateUrl: './trial-available-card.html',
})
export class TrialAvailableCard {
  readonly trialName = input.required<string>();
  /** A short line on choosing the day, such as "Pick a clear-weather day." */
  readonly dayNote = input<string>();
  /** Where the trial's plan is shown. */
  readonly link = input('/road');

  protected readonly help = computed(() =>
    ['Take it on any day you choose.', this.dayNote()].filter(Boolean).join(' '),
  );
}
