import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SavedRoadSession } from '../../../core/state/road-history';
import { formatLongDate } from '../../../shared/format-date';
import { describeRoadPain, roadSessionParts } from '../road-session-summary';

/** The confirmation shown once a walk is saved. */
@Component({
  imports: [RouterLink],
  selector: 'app-walk-saved',
  styleUrl: './walk-saved.css',
  templateUrl: './walk-saved.html',
})
export class WalkSaved {
  readonly session = input.required<SavedRoadSession>();
  readonly backPath = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly another = output<void>();

  protected readonly date = computed(() => formatLongDate(this.session().date));
  /** Distance and time on one line, ground and effort on the next, so no line ends on a separator. */
  protected readonly lines = computed(() => {
    const [distance, duration, terrain, effort] = roadSessionParts(this.session());
    return [`${distance} · ${duration}`, `${terrain} · ${effort}`];
  });
  protected readonly pain = computed(() => describeRoadPain(this.session()));
}
