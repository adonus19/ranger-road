import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  getFieldCard,
  getWeeklyFieldcraft,
  type FieldCard,
} from '../../../core/program/field-manual.seed';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** A week's fieldcraft practice when it covers several cards, such as Week 3's knots. */
@Component({
  selector: 'app-practice-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './practice-page.html',
})
export class PracticePage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly fieldcraft = computed(() =>
    getWeeklyFieldcraft(Number(this.params()?.get('week'))),
  );

  protected readonly cards = computed(() =>
    (this.fieldcraft()?.cardIds ?? [])
      .map((id) => getFieldCard(id))
      .filter((card): card is FieldCard => !!card),
  );

  protected readonly current = computed(() => {
    const week = this.weekState.week();
    return (
      (week.stage === 'week' || week.stage === 'ahead') &&
      week.contentWeek === this.fieldcraft()?.week
    );
  });

  protected readonly currentLabel = computed(() =>
    this.weekState.week().stage === 'ahead' ? 'Week ahead' : 'This week',
  );

  ngOnInit(): void {
    void this.weekState.load();
  }
}
