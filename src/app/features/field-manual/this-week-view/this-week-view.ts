import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { FieldManualRow, FieldManualRowKind } from '../../../core/program/field-manual';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { SKILL_ICONS } from '../skill-icons';

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

  /** Fieldcraft rows show their skill: a rope for knots, a compass for navigation. */
  protected icon(row: FieldManualRow): IconName {
    return row.skill ? SKILL_ICONS[row.skill] : ROW_ICONS[row.kind];
  }
}
