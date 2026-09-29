import { Component, OnInit, computed, inject } from '@angular/core';
import { listLeadershipPrinciples } from '../../../core/program/field-manual.seed';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** The twelve family leadership principles, with Scripture and one way to practice each. */
@Component({
  selector: 'app-principles-page',
  imports: [Icon, ManualBackLink],
  templateUrl: './principles-page.html',
  styles: `
    dl {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 0.375rem 0.875rem;
      max-width: 65ch;
      margin: 0.75rem 0 0;
    }

    dt {
      color: var(--text-label);
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.5;
    }

    dd {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.5;
    }
  `,
})
export class PrinciplesPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly principles = listLeadershipPrinciples();
  protected readonly current = computed(() => new Set(this.weekState.week().entryIds));
  protected readonly currentLabel = computed(() =>
    this.weekState.week().stage === 'ahead' ? 'Week ahead' : 'This week',
  );

  ngOnInit(): void {
    void this.weekState.load();
  }
}
