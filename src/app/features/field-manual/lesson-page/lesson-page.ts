import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getChapterOneWeekContent } from '../../../core/program/chapter-one-daily.seed';
import { slug } from '../../../core/program/field-manual';
import {
  getLeadershipLesson,
  getLeadershipPrinciple,
  type LeadershipPrinciple,
} from '../../../core/program/field-manual.seed';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';
import { ManualBackLink } from '../manual-back-link';

/** One week's leadership lesson, read in Monday's Morning Watch. */
@Component({
  selector: 'app-lesson-page',
  imports: [Icon, ManualBackLink, RouterLink],
  templateUrl: './lesson-page.html',
})
export class LessonPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly lesson = computed(() =>
    getLeadershipLesson(this.params()?.get('lessonId') ?? ''),
  );

  protected readonly weekContent = computed(() => {
    const lesson = this.lesson();
    return lesson ? getChapterOneWeekContent(lesson.week) : undefined;
  });

  protected readonly principles = computed(() =>
    (this.lesson()?.principleIds ?? [])
      .map((id) => getLeadershipPrinciple(id))
      .filter((principle): principle is LeadershipPrinciple => !!principle),
  );

  /** The week's Sunday question, when the chapter pack gives one. */
  protected readonly sundayQuestion = computed(() => this.weekContent()?.days[7].reflectionPrompt);

  protected readonly laterBookId = computed(() => {
    const title = this.lesson()?.forLater.title;
    return title ? `book-${slug(title)}` : undefined;
  });

  protected readonly current = computed(() => {
    const lesson = this.lesson();
    return !!lesson && this.weekState.week().entryIds.includes(`lesson-${lesson.id}`);
  });
  protected readonly currentLabel = computed(() =>
    this.weekState.week().stage === 'ahead' ? 'Week ahead' : 'This week',
  );

  ngOnInit(): void {
    void this.weekState.load();
  }
}
