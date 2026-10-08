import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getChapterSessions,
  getScriptureByWeek,
  orderedPrograms,
  warmupId,
  type FieldManualWeek,
} from '../../../core/program/field-manual';
import { formatChapterNumeral, type ChapterProgram } from '../../../core/program/program-catalog';
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

interface ContentsChapter {
  id: string;
  title: string;
  subline: string;
  parts: ContentsPart[];
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

/** Each chapter's contents: every entry with the week it belongs to, this week's marked. */
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

  /** The chapter the campaign is in first; the principles and reading plan sit under it. */
  protected readonly chapters = computed<ContentsChapter[]>(() => {
    const week = this.week();
    return orderedPrograms(week.chapter).map((program, index) => ({
      id: program.chapter.id,
      title: `Chapter ${formatChapterNumeral(program.chapter.number)} · ${program.chapter.name}`,
      subline: `Weeks ${program.chapter.weeks[0]}–${program.chapter.weeks.at(-1)} and the ${program.trialName}`,
      parts: buildParts(program, week, index === 0),
    }));
  });
}

function buildParts(
  program: ChapterProgram,
  week: FieldManualWeek,
  first: boolean,
): ContentsPart[] {
  const number = program.chapter.number;
  const mine = week.chapter === number;
  const listed = new Set(week.entryIds);
  const sessions = new Set(week.sessions.map((session) => session.id));
  const principles = listLeadershipPrinciples();
  const [firstWeek, lastWeek] = [program.chapter.weeks[0], program.chapter.weeks.at(-1)!];
  const cards = listFieldCards().filter((card) => card.week >= firstWeek && card.week <= lastWeek);
  const readingPlan = listReadingPlan();
  const book = readingPlan.find((entry) => entry.chapter === number);
  const lessons = listLeadershipLessons().filter(
    (lesson) => lesson.week >= firstWeek && lesson.week <= lastWeek,
  );
  const [forgeA, forgeB] = program.workouts;
  const chapterSessions = getChapterSessions(program);
  const guideCount = new Set(
    chapterSessions.flatMap((session) => session.movements.map((movement) => movement.exerciseId)),
  ).size;

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
        ...(first
          ? [
              {
                title: `${principles.length === 12 ? 'Twelve' : principles.length} principles`,
                note: 'Reference',
                link: ['/field-manual/principles'],
                current: false,
              },
            ]
          : []),
      ],
    },
    {
      id: 'fieldcraft',
      title: 'Fieldcraft',
      note: `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`,
      entries: cards.map((card) => ({
        title: card.title,
        note: card.lastWeek ? `Weeks ${card.week}–${card.lastWeek}` : `Week ${card.week}`,
        link: ['/field-manual/cards', card.id],
        current: listed.has(`card-${card.id}`),
      })),
    },
    {
      id: 'reading',
      title: 'Reading',
      note: `Chapter ${formatChapterNumeral(number)} book`,
      entries: [
        ...(book
          ? [
              {
                title: book.title,
                note:
                  mine && week.readingDays.length
                    ? shortDays(week.readingDays)
                    : `Chapter ${formatChapterNumeral(number)}`,
                link: ['/field-manual/reading'],
                current: mine && week.readingDays.length > 0,
              },
            ]
          : []),
        ...(first
          ? [
              {
                title: 'Reading plan',
                note: `${readingPlan.length} books`,
                link: ['/field-manual/reading'],
                fragment: 'reading-plan',
                current: false,
              },
            ]
          : []),
      ],
    },
    {
      id: 'scripture',
      title: 'Scripture',
      note: 'By week',
      entries: [
        ...getScriptureByWeek(program).map((scripture) => ({
          title: `Week ${scripture.week} · ${scripture.name}`,
          note: `${scripture.days.length} readings`,
          link: ['/field-manual/scripture'],
          fragment: `week-${scripture.week}`,
          current:
            (week.stage === 'week' || week.stage === 'ahead') &&
            week.contentWeek === scripture.week,
        })),
        {
          title: `The ${program.trialName}`,
          note: program.trial.id === 'gate-trial' ? '2 readings' : '1 reading',
          link: ['/field-manual/scripture'],
          fragment: program.trial.id,
          current: week.stage === 'trial' && mine,
        },
      ],
    },
    {
      id: 'exercises',
      title: 'Exercise guides',
      note: `${guideCount} guides`,
      entries: chapterSessions.map((session) => ({
        title: session.title,
        note: session.id === 'gate-circuit' ? program.trialName : session.when.split(',')[0],
        link: ['/field-manual/exercises'],
        fragment: session.id,
        current:
          mine &&
          (session.id === warmupId(program)
            ? sessions.has(forgeA.id) || sessions.has(forgeB.id)
            : sessions.has(session.id)),
      })),
    },
  ];
}
