import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  getFieldCard,
  getWeeklyFieldcraft,
  listFieldCards,
  type FieldSkill,
} from '../../../core/program/field-manual.seed';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';
import { SKILL_ICONS } from '../skill-icons';

/** One practical skill: what it's for, the steps, and how to check it. */
@Component({
  selector: 'app-field-card-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './field-card-page.html',
})
export class FieldCardPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly card = computed(() => getFieldCard(this.params()?.get('cardId') ?? ''));

  protected readonly current = computed(() => {
    const card = this.card();
    return !!card && this.weekState.week().entryIds.includes(`card-${card.id}`);
  });

  protected readonly currentLabel = computed(() =>
    this.weekState.week().stage === 'ahead' ? 'Week ahead' : 'This week',
  );

  /** The week's practice page, when the card is one of several practiced together. */
  protected readonly practice = computed(() => {
    const card = this.card();
    const fieldcraft = card ? getWeeklyFieldcraft(card.week) : undefined;
    return fieldcraft && fieldcraft.cardIds.length > 1 ? fieldcraft : undefined;
  });

  /** The other cards practiced the same week. */
  protected readonly siblings = computed(() => {
    const card = this.card();
    return card
      ? listFieldCards().filter((other) => other.week === card.week && other.id !== card.id)
      : [];
  });

  protected skillIcon(skill: FieldSkill): IconName {
    return SKILL_ICONS[skill];
  }

  ngOnInit(): void {
    void this.weekState.load();
  }
}
