import { Component, OnInit, computed, inject } from '@angular/core';
import {
  getScriptureByWeek,
  getTrialScripture,
  orderedPrograms,
  scriptureDayId,
} from '../../../core/program/field-manual';
import { formatChapterNumeral } from '../../../core/program/program-catalog';
import { getWeekday } from '../../../core/program/campaign';
import { CampaignState } from '../../../core/state/campaign-state';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** Each chapter's daily Scripture references by week, stored as references only. */
@Component({
  selector: 'app-scripture-page',
  imports: [Icon, ManualBackLink],
  templateUrl: './scripture-page.html',
  styles: `
    .day {
      display: grid;
      grid-template-columns: 6.25rem minmax(0, 1fr);
      align-items: baseline;
      gap: 0.125rem 0.75rem;
      min-height: var(--touch-target);
      padding-block: 0.625rem;
      scroll-margin-top: 1rem;
    }

    .day__name {
      color: var(--text-label);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .day__reference {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
    }

    .day__question {
      grid-column: 2;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.45;
    }
  `,
})
export class ScripturePage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  private readonly campaignState = inject(CampaignState);
  protected readonly week = this.weekState.week;

  /** The chapter the campaign is in first, then the others in order. */
  protected readonly chapters = computed(() =>
    orderedPrograms(this.week().chapter).map((program) => ({
      id: program.chapter.id,
      number: program.chapter.number,
      numeral: formatChapterNumeral(program.chapter.number),
      name: program.chapter.name,
      trialId: program.trial.id,
      trialName: program.trialName,
      weeks: getScriptureByWeek(program).map((week) => ({
        ...week,
        days: week.days.map((day) => ({ ...day, id: scriptureDayId(week.week, day.weekday) })),
      })),
      /** An attempt-day reference may also be a week's reading, so its row keeps its own ID. */
      trial: getTrialScripture(program),
    })),
  );

  /** Today's weekday, marked only inside the week the campaign is on. */
  protected readonly todayWeekday = computed(() => {
    const stage = this.week().stage;
    return stage === 'week' ? getWeekday(this.campaignState.today()) : null;
  });

  ngOnInit(): void {
    void this.weekState.load();
  }
}
