import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getChapterOneScriptureByWeek,
  getChapterOneSessions,
  type FieldManualWeek,
} from '../../../core/program/field-manual';
import {
  listFieldCards,
  listLeadershipLessons,
  listLeadershipPrinciples,
  listReadingPlan,
} from '../../../core/program/field-manual.seed';
import { Icon } from '../../../shared/icon/icon';
import { FieldManualWeekState } from '../field-manual-week-state';

interface ContentsEntry {
  title: string;
  note: string;
  link: readonly string[];
  fragment?: string;
  current: boolean;
}

interface ContentsPart {
  id: string;
  title: string;
  note: string;
  entries: ContentsEntry[];
}

const SHORT_DAYS: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

function shortDays(days: readonly string[]): string {
  const short = days.map((day) => SHORT_DAYS[day] ?? day);
  return short.length < 2
    ? (short[0] ?? '')
    : `${short.slice(0, -1).join(', ')} and ${short.at(-1)}`;
}

/** The chapter's contents: every entry with the week it belongs to, this week's marked. */
@Component({
  selector: 'app-contents-view',
  imports: [Icon, RouterLink],
  templateUrl: './contents-view.html',
  styleUrl: './contents-view.css',
})
export class ContentsView {
  private readonly weekState = inject(FieldManualWeekState);
  protected readonly ready = this.weekState.ready;
  protected readonly week = this.weekState.week;

  /** Before Day 1 the tag names the week ahead; afterwards, the current week. */
  protected readonly tagLabel = computed(() =>
    this.week().stage === 'ahead' ? 'Week ahead' : 'This week',
  );

  protected readonly parts = computed<ContentsPart[]>(() => buildParts(this.week()));
}

function buildParts(week: FieldManualWeek): ContentsPart[] {
  const listed = new Set(week.entryIds);
  const sessions = new Set(week.sessions.map((session) => session.id));
  const principles = listLeadershipPrinciples();
  const cards = listFieldCards();
  const [book, ...laterBooks] = listReadingPlan();
  const lessons = listLeadershipLessons();

  return [
    {
      id: 'leadership',
      title: 'Leadership',
      note: `${lessons.length} lessons`,
      entries: [
        ...lessons.map((lesson) => ({
          title: lesson.title,
          note: `Week ${lesson.week}`,
          link: ['/field-manual/lessons', lesson.id],
          current: listed.has(`lesson-${lesson.id}`),
        })),
        {
          title: `${principles.length === 12 ? 'Twelve' : principles.length} principles`,
          note: 'Reference',
          link: ['/field-manual/principles'],
          current: false,
        },
      ],
    },
    {
      id: 'fieldcraft',
      title: 'Fieldcraft',
      note: `${cards.length} cards`,
      entries: cards.map((card) => ({
        title: card.title,
        note: `Week ${card.week}`,
        link: ['/field-manual/cards', card.id],
        current: listed.has(`card-${card.id}`),
      })),
    },
    {
      id: 'reading',
      title: 'Reading',
      note: 'Chapter I book',
      entries: [
        {
          title: book.title,
          note: week.readingDays.length ? shortDays(week.readingDays) : 'Chapter I',
          link: ['/field-manual/reading'],
          current: week.readingDays.length > 0,
        },
        {
          title: 'Reading plan',
          note: `${laterBooks.length + 1} books`,
          link: ['/field-manual/reading'],
          fragment: 'reading-plan',
          current: false,
        },
      ],
    },
    {
      id: 'scripture',
      title: 'Scripture',
      note: 'By week',
      entries: [
        ...getChapterOneScriptureByWeek().map((scripture) => ({
          title: `Week ${scripture.week} · ${scripture.name}`,
          note: `${scripture.days.length} readings`,
          link: ['/field-manual/scripture'],
          fragment: `week-${scripture.week}`,
          current:
            (week.stage === 'week' || week.stage === 'ahead') &&
            week.contentWeek === scripture.week,
        })),
        {
          title: 'The Gate Trial',
          note: '2 readings',
          link: ['/field-manual/scripture'],
          fragment: 'gate-trial',
          current: week.stage === 'trial',
        },
      ],
    },
    {
      id: 'exercises',
      title: 'Exercise guides',
      note: '18 guides',
      entries: getChapterOneSessions().map((session) => ({
        title: session.title,
        note: session.id === 'gate-circuit' ? 'Gate Trial' : session.when.split(',')[0],
        link: ['/field-manual/exercises'],
        fragment: session.id,
        current:
          session.id === 'warm-up'
            ? sessions.has('chapter-1-forge-a') || sessions.has('chapter-1-forge-b')
            : sessions.has(session.id),
      })),
    },
  ];
}
