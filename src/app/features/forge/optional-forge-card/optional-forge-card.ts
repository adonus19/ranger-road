import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CUSTOM_FORGE_ID, optionalForgeLink } from '../../../core/program/custom-forge';
import type { OptionalForgeOffer } from '../../../core/program/optional-forge';
import { loadWorkout } from '../../../core/program/program-catalog';
import { Icon } from '../../../shared/icon/icon';

/**
 * The quiet "Optional Forge available" row below the main order. It is not an order: no
 * medallion, no gold edge, no Done mark, and nothing is said on a day it is left alone.
 */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-optional-forge-card',
  styleUrl: './optional-forge-card.css',
  templateUrl: './optional-forge-card.html',
})
export class OptionalForgeCard {
  readonly offer = input.required<OptionalForgeOffer>();

  protected readonly link = computed(() => optionalForgeLink(this.offer().workoutId));

  protected readonly help = computed(() => {
    const offer = this.offer();
    const light = offer.light ? ' Keep it light.' : '';
    if (offer.workoutId === CUSTOM_FORGE_ID) return `Build your own session.${light}`;
    const title = loadWorkout(offer.workoutId)?.title ?? 'Optional Forge';
    return `${title}, about 20–25 minutes.${light}`;
  });
}
