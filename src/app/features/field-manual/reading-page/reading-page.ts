import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { chapterNumeral, joinWords, slug } from '../../../core/program/field-manual';
import {
  getLeadershipLessonForWeek,
  listLeadershipLessons,
  listReadingPlan,
  EXTRA_BOOK_SUGGESTIONS,
} from '../../../core/program/field-manual.seed';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** The book in hand, this week's reading blocks, and the campaign's reading plan. */
@Component({
  selector: 'app-reading-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './reading-page.html',
  styles: `
    .reading-book {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.3125rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .reading-book__author {
      display: block;
      margin-top: 0.125rem;
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: 0.9375rem;
      font-weight: 400;
      line-height: 1.4;
    }

    .plan__numeral {
      width: 2.125rem;
      flex: none;
      color: var(--text-label);
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 600;
      text-align: center;
    }
  `,
})
export class ReadingPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly plan = listReadingPlan().map((book) => ({
    ...book,
    id: slug(book.title),
    numeral: chapterNumeral(book.chapter),
  }));
  protected readonly book = this.plan[0];
  protected readonly extras = listLeadershipLessons()
    .filter((lesson) => EXTRA_BOOK_SUGGESTIONS.includes(lesson.forLater.title))
    .map((lesson) => ({ ...lesson.forLater, week: lesson.week, lessonId: lesson.id }));

  protected readonly week = this.weekState.week;
  protected readonly readingLine = computed(() => {
    const days = this.week().readingDays;
    if (this.week().stage === 'complete') return 'Chapter I is complete.';
    if (!days.length) return 'No reading blocks this week.';
    return `${this.week().stage === 'ahead' ? 'Week 1' : 'This week'}: ${joinWords(days)}, 10 minutes each.`;
  });

  /** The week's lesson says what to notice in the book. */
  protected readonly notice = computed(() =>
    this.week().stage === 'complete'
      ? undefined
      : getLeadershipLessonForWeek(this.week().contentWeek)?.fromReading,
  );

  ngOnInit(): void {
    void this.weekState.load();
  }
}
