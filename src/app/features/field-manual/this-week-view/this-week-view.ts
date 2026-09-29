import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { FieldManualRow, FieldManualRowKind } from '../../../core/program/field-manual';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';

const ROW_ICONS: Record<FieldManualRowKind, IconName> = {
  lesson: 'hearth',
  fieldcraft: 'hatchet',
  reading: 'book-open',
  scripture: 'sunrise',
  exercises: 'anvil',
};

/** The week's lesson, field card, reading, Scripture, and exercises, one row each. */
@Component({
  selector: 'app-this-week-view',
  imports: [Icon, RouterLink],
  templateUrl: './this-week-view.html',
  styleUrl: './this-week-view.css',
})
export class ThisWeekView {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly ready = this.weekState.ready;
  protected readonly week = this.weekState.week;

  /** Knot practice shows a rope; tool fieldcraft keeps the hatchet. */
  protected icon(row: FieldManualRow): IconName {
    return row.skill === 'knot' ? 'knot' : ROW_ICONS[row.kind];
  }
}
