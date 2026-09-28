import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ReadinessStatus } from '../../../core/domain/models';
import { Icon } from '../../../shared/icon/icon';

/** Today's readiness in words, linking to the check. */
@Component({
  imports: [Icon, RouterLink],
  selector: 'app-readiness-strip',
  styleUrl: './readiness-strip.css',
  template: `
    <a class="readiness-strip readiness-strip--{{ status() }}" routerLink="/readiness">
      <span class="readiness-strip__icon"><app-icon name="heart-pulse" /></span>
      <span class="readiness-strip__text">
        <strong>{{ label() }}</strong>
        <span>{{ help() }}</span>
      </span>
      <app-icon class="readiness-strip__arrow" name="chevron-right" />
    </a>
  `,
})
export class ReadinessStrip {
  readonly status = input.required<ReadinessStatus | 'pending'>();
  readonly label = input.required<string>();
  readonly help = input.required<string>();
}
