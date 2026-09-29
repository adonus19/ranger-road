import type { LocalDate, WorkoutDefinition } from '../domain/models';
import { addDays, getChapterOneSchedule, getWeekday } from './campaign';
import { gateTrialDefinition } from './chapter-one-trial.seed';
import { chapterOneDefinition, type Weekday } from './chapter-one.seed';
import {
  chapterOneDailySeed,
  chapterOneGateTrialAttempt,
  getChapterOneDayContent,
  getChapterOneWeekContent,
} from './chapter-one-daily.seed';
import { listChapterOneExerciseGuides } from './chapter-one-exercise-guides';
import { chapterOneForgeA, chapterOneForgeB, chapterOneRestoration } from './chapter-one-workouts';
import {
  EXTRA_BOOK_SUGGESTIONS,
  getLeadershipLessonForWeek,
  getWeeklyFieldcraft,
  listFieldCards,
  listLeadershipLessons,
  listLeadershipPrinciples,
  listReadingPlan,
  type FieldSkill,
} from './field-manual.seed';

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'] as const;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;

export type FieldManualRowKind = 'lesson' | 'fieldcraft' | 'reading' | 'scripture' | 'exercises';

export interface FieldManualRow {
  kind: FieldManualRowKind;
  title: string;
  line: string;
  link: readonly string[];
  fragment?: string;
  /** A fieldcraft row's skill, so it shows a hatchet for tools and a rope for knots. */
  skill?: FieldSkill;
}

export type FieldManualSessionId =
  'chapter-1-forge-a' | 'chapter-1-forge-b' | 'gate-circuit' | 'chapter-1-restoration';

export interface FieldManualSession {
  id: FieldManualSessionId;
  title: string;
  days: string;
  warmup: readonly string[];
  exercises: readonly string[];
}

export interface FieldManualWeek {
  /**
   * `ahead` before Day 1 (or before one is chosen), `week` for the lead-in and Weeks 1–4,
   * `trial` after Week 4 while Chapter I continues, `complete` once Chapter II has begun.
   */
  stage: 'ahead' | 'week' | 'trial' | 'complete';
  contentWeek: 1 | 2 | 3 | 4;
  heading: string;
  subline: string;
  rows: FieldManualRow[];
  sessions: FieldManualSession[];
  /** Weekday names with a reading block, in order. */
  readingDays: string[];
  /** Index entry IDs this week's rows point to, for the Index's This week filter. */
  entryIds: string[];
}

export interface FieldManualWeekInput {
  startDate?: LocalDate;
  today: LocalDate;
  trialPassedOn?: LocalDate;
  chapterTwoStart?: LocalDate;
}

interface WeekDay {
  date: LocalDate;
  weekday: Weekday;
  contentWeek: 1 | 2 | 3 | 4;
  attemptDay: boolean;
}

export function joinWords(words: readonly string[]): string {
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

export function chapterNumeral(chapter: number): string {
  return ROMAN[chapter - 1] ?? String(chapter);
}

/** The Monday on or before a date. */
function mondayOf(date: LocalDate): LocalDate {
  return addDays(date, 1 - getWeekday(date));
}

/**
 * The days of the week a date belongs to, clipped to Chapter I: the lead-in runs from Day 1
 * through Sunday, and full weeks run Monday through Sunday. Before Day 1, the first week.
 */
function weekDays(startDate: LocalDate, today: LocalDate): WeekDay[] {
  const anchor = today < startDate ? startDate : today;
  const monday = mondayOf(anchor);
  const days: WeekDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(monday, offset);
    const schedule = getChapterOneSchedule(startDate, date);
    if (!schedule) continue;
    days.push({
      date,
      weekday: schedule.weekday,
      contentWeek: schedule.contentWeek,
      attemptDay: schedule.attemptDay,
    });
  }
  return days;
}

function readingDays(days: readonly WeekDay[]): { names: string[]; minutes: number } {
  const reading = days
    .map((day) => ({
      day,
      content: getChapterOneDayContent(day.contentWeek, day.weekday, day.attemptDay),
    }))
    .filter(({ content }) => content.readingMinutes);
  return {
    names: reading.map(({ day }) => WEEKDAY_NAMES[day.weekday - 1]),
    minutes: reading[0]?.content.readingMinutes ?? 0,
  };
}

function exerciseIds(workout: WorkoutDefinition): { warmup: string[]; exercises: string[] } {
  return {
    warmup: (workout.warmup ?? []).flatMap((step) =>
      step.kind === 'exercise' ? [step.prescription.exerciseId] : [],
    ),
    exercises: workout.exercises.map((exercise) => exercise.exerciseId),
  };
}

const gateCircuitIds =
  gateTrialDefinition.phases
    .find((phase) => phase.circuit)
    ?.circuit?.movements.map((movement) => movement.exerciseId) ?? [];

const SESSION_WORKOUTS: Partial<Record<FieldManualSessionId, WorkoutDefinition>> = {
  'chapter-1-forge-a': chapterOneForgeA,
  'chapter-1-forge-b': chapterOneForgeB,
  'chapter-1-restoration': chapterOneRestoration,
};

function isWorkoutSession(id: string | undefined): id is FieldManualSessionId {
  return !!id && id in SESSION_WORKOUTS;
}

/** The sessions a week's days call for, in training order, with the days they fall on. */
function sessionsForDays(days: readonly WeekDay[]): FieldManualSession[] {
  const used = new Map<FieldManualSessionId, string[]>();
  const add = (id: FieldManualSessionId, day: WeekDay) => {
    const names = used.get(id) ?? [];
    names.push(WEEKDAY_NAMES[day.weekday - 1]);
    used.set(id, names);
  };
  for (const day of days) {
    const definitionId = getChapterOneDayContent(day.contentWeek, day.weekday, day.attemptDay)
      .activity.definitionId;
    if (day.attemptDay) add('gate-circuit', day);
    else if (isWorkoutSession(definitionId)) add(definitionId, day);
    // Friday's easier option (and Week 4's easy mobility) uses the Restoration routine.
    else if (day.weekday === 5) add('chapter-1-restoration', day);
  }

  const order: readonly FieldManualSessionId[] = [
    'chapter-1-forge-a',
    'chapter-1-forge-b',
    'gate-circuit',
    'chapter-1-restoration',
  ];
  return order.flatMap((id): FieldManualSession[] => {
    const names = used.get(id);
    if (!names) return [];
    const workout = SESSION_WORKOUTS[id];
    return [
      workout
        ? { id, title: workout.title, days: joinWords(names), ...exerciseIds(workout) }
        : {
            id,
            title: 'Gate Circuit',
            days: joinWords(names),
            warmup: [],
            exercises: gateCircuitIds,
          },
    ];
  });
}

function sessionsTitle(sessions: readonly FieldManualSession[]): string {
  const ids = sessions.map((session) => session.id);
  const names: string[] = [];
  if (ids.includes('chapter-1-forge-a') && ids.includes('chapter-1-forge-b')) names.push('Forge');
  else if (ids.includes('chapter-1-forge-a')) names.push('Forge A');
  else if (ids.includes('chapter-1-forge-b')) names.push('Forge B');
  if (ids.includes('gate-circuit')) names.push('Gate Circuit');
  if (ids.includes('chapter-1-restoration')) names.push('Restoration');
  return joinWords(names);
}

export function uniqueExerciseIds(sessions: readonly FieldManualSession[]): string[] {
  return [...new Set(sessions.flatMap((session) => [...session.warmup, ...session.exercises]))];
}

function lessonLine(stage: FieldManualWeek['stage'], days: readonly WeekDay[]): string {
  if (stage === 'trial') return 'Leadership lesson · Week 4, 3 minutes';
  return days[0]?.weekday === 1
    ? 'Leadership lesson · Read Monday, 3 minutes'
    : 'Leadership lesson · Read on Day 1, 3 minutes';
}

function scriptureRow(
  stage: FieldManualWeek['stage'],
  days: readonly WeekDay[],
  today: LocalDate,
): FieldManualRow | undefined {
  const index = stage === 'ahead' ? 0 : days.findIndex((day) => day.date === today);
  const day = days[index];
  if (!day) return undefined;
  const reference = getChapterOneDayContent(
    day.contentWeek,
    day.weekday,
    day.attemptDay,
  ).scriptureReference;
  const remaining = days.length - index - 1;
  const line =
    stage === 'ahead'
      ? `Scripture on Day 1 · ${NUMBER_WORDS[remaining]} more that week`
      : remaining
        ? `Scripture today · ${NUMBER_WORDS[remaining]} more this week`
        : 'Scripture today · the last of this week';
  return {
    kind: 'scripture',
    title: reference,
    line,
    link: ['/field-manual/scripture'],
    fragment: day.attemptDay ? 'gate-trial-attempts' : scriptureDayId(day.contentWeek, day.weekday),
  };
}

/** A unique anchor for a dated reference, even if another day uses the same passage. */
export function scriptureDayId(week: number, weekday: Weekday): string {
  return `week-${week}-day-${weekday}`;
}

/** What the Field Manual's This week view lists for a date. */
export function getFieldManualWeek(input: FieldManualWeekInput): FieldManualWeek {
  const { startDate, today, trialPassedOn, chapterTwoStart } = input;
  const chapterLine = `Chapter I · ${chapterOneDefinition.name}`;
  if (startDate && chapterTwoStart && today >= chapterTwoStart) {
    return {
      stage: 'complete',
      contentWeek: 4,
      heading: 'Chapter I complete',
      subline: 'Chapter II’s pages will appear here once they are added.',
      rows: [],
      sessions: [],
      readingDays: [],
      entryIds: [],
    };
  }

  // Without a campaign, show the first full week as the week ahead.
  const start = startDate ?? mondayOf(today);
  const ahead = !startDate || today < start;
  const days = weekDays(start, ahead ? start : today);
  const first = days[0];
  const afterTarget = !ahead && !!getChapterOneSchedule(start, today)?.afterTarget;
  const stage: FieldManualWeek['stage'] = ahead ? 'ahead' : afterTarget ? 'trial' : 'week';
  const contentWeek = afterTarget ? 4 : (first?.contentWeek ?? 1);
  const schedule = getChapterOneSchedule(start, ahead ? start : today);
  const leadIn = schedule?.week === 0;
  const weekName = getChapterOneWeekContent(contentWeek).name;

  const heading = ahead
    ? `Week ahead · ${weekName}`
    : afterTarget
      ? trialPassedOn
        ? 'Gate Trial passed'
        : 'The Gate Trial'
      : `${leadIn ? 'Lead-in' : `Week ${contentWeek}`} · ${weekName}`;
  const subline =
    afterTarget && trialPassedOn && chapterTwoStart
      ? `${chapterLine} · Chapter II begins ${shortDate(chapterTwoStart)}`
      : chapterLine;

  const rows: FieldManualRow[] = [];
  const entryIds: string[] = [];
  const lesson = getLeadershipLessonForWeek(contentWeek);
  if (lesson) {
    rows.push({
      kind: 'lesson',
      title: lesson.title,
      line: lessonLine(stage, days),
      link: ['/field-manual/lessons', lesson.id],
    });
    entryIds.push(`lesson-${lesson.id}`, ...lesson.principleIds.map((id) => `principle-${id}`));
  }

  const fieldcraft = afterTarget ? undefined : getWeeklyFieldcraft(contentWeek);
  if (fieldcraft) {
    const single = fieldcraft.cardIds.length === 1;
    rows.push({
      kind: 'fieldcraft',
      title: fieldcraft.title,
      line: single
        ? `Field card · ${fieldcraft.days}`
        : `Field cards · ${fieldcraft.days} · ${NUMBER_WORDS[fieldcraft.cardIds.length]} knots`,
      link: single
        ? ['/field-manual/cards', fieldcraft.cardIds[0]]
        : ['/field-manual/practice', String(fieldcraft.week)],
      skill: fieldcraft.skill,
    });
    entryIds.push(...fieldcraft.cardIds.map((id) => `card-${id}`));
  }

  const reading = readingDays(days);
  const book = listReadingPlan()[0];
  if (reading.names.length && book) {
    rows.push({
      kind: 'reading',
      title: book.title,
      line: `Reading · ${joinWords(reading.names)}, ${reading.minutes} minutes`,
      link: ['/field-manual/reading'],
    });
    entryIds.push(`book-${slug(book.title)}`);
  }

  const scripture = scriptureRow(stage, days, today);
  if (scripture) {
    rows.push(scripture);
    for (const day of days) {
      const reference = getChapterOneDayContent(
        day.contentWeek,
        day.weekday,
        day.attemptDay,
      ).scriptureReference;
      entryIds.push(`scripture-${slug(reference)}`);
    }
  }

  const sessions = sessionsForDays(trialPassedOn ? days.filter((day) => !day.attemptDay) : days);
  if (sessions.length) {
    const count = uniqueExerciseIds(sessions).length;
    rows.push({
      kind: 'exercises',
      title: sessionsTitle(sessions),
      line: `Exercise guides · ${count} movements ${stage === 'ahead' ? 'that week' : 'this week'}`,
      link: ['/field-manual/exercises'],
    });
    entryIds.push(...uniqueExerciseIds(sessions).map((id) => `exercise-${id}`));
  }

  return {
    stage,
    contentWeek,
    heading,
    subline,
    rows,
    sessions,
    readingDays: reading.names,
    entryIds: [...new Set(entryIds)],
  };
}

function shortDate(date: LocalDate): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ScriptureDay {
  weekday: Weekday;
  day: string;
  reference: string;
  reflectionPrompt?: string;
}

export interface ScriptureWeek {
  week: 1 | 2 | 3 | 4;
  name: string;
  days: ScriptureDay[];
}

/** Chapter I's daily Scripture by week, from the daily seed. */
export function getChapterOneScriptureByWeek(): ScriptureWeek[] {
  return chapterOneDailySeed.map((week, index) => ({
    week: (index + 1) as 1 | 2 | 3 | 4,
    name: week.name,
    days: WEEKDAY_NAMES.map((day, dayIndex) => {
      const weekday = (dayIndex + 1) as Weekday;
      const content = week.days[weekday];
      return {
        weekday,
        day,
        reference: content.scriptureReference,
        ...(content.reflectionPrompt ? { reflectionPrompt: content.reflectionPrompt } : {}),
      };
    }),
  }));
}

export interface SessionMovement {
  exerciseId: string;
  dose: string;
}

export interface SessionDetail {
  id: FieldManualSessionId | 'warm-up';
  title: string;
  when: string;
  movements: SessionMovement[];
}

interface DoseSource {
  sets?: number;
  reps?: number | string;
  durationSeconds?: number | string;
  perSide?: boolean;
}

/** "3 sets × 6 reps", "2 sets × 30 sec per side", or "10 reps" for a single set. */
export function doseText(prescription: DoseSource): string {
  const amount =
    prescription.reps !== undefined
      ? `${prescription.reps} reps`
      : `${prescription.durationSeconds} sec`;
  const each = `${amount}${prescription.perSide ? ' per side' : ''}`;
  return (prescription.sets ?? 1) > 1 ? `${prescription.sets} sets × ${each}` : each;
}

/** Every Chapter I session with its documented doses, for the exercise guides page. */
export function getChapterOneSessions(): SessionDetail[] {
  const work = (workout: WorkoutDefinition): SessionMovement[] =>
    workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      dose: doseText(exercise),
    }));
  const warmup: SessionMovement[] = (chapterOneForgeA.warmup ?? []).flatMap((step) =>
    step.kind === 'exercise'
      ? [{ exerciseId: step.prescription.exerciseId, dose: doseText(step.prescription) }]
      : [],
  );
  const circuit = gateTrialDefinition.phases.find((phase) => phase.circuit)?.circuit;
  return [
    { id: 'warm-up', title: 'Warm-up', when: 'Before Forge A and Forge B', movements: warmup },
    {
      id: 'chapter-1-forge-a',
      title: 'Forge A',
      when: 'Monday',
      movements: work(chapterOneForgeA),
    },
    {
      id: 'chapter-1-forge-b',
      title: 'Forge B',
      when: 'Thursday',
      movements: work(chapterOneForgeB),
    },
    {
      id: 'chapter-1-restoration',
      title: 'Restoration',
      when: 'Wednesday, and Friday or as needed',
      movements: work(chapterOneRestoration),
    },
    {
      id: 'gate-circuit',
      title: 'Gate Circuit',
      when: `The Gate Trial, ${circuit?.rounds ?? 3} controlled rounds`,
      movements: (circuit?.movements ?? []).map((movement) => ({
        exerciseId: movement.exerciseId,
        dose: doseText(movement),
      })),
    },
  ];
}

/** Read on each Gate Trial attempt day, and in the trial's Spirit part. */
export const GATE_TRIAL_SCRIPTURE = {
  attemptDays: chapterOneGateTrialAttempt.scriptureReference,
  spirit: 'Psalm 121',
} as const;

export type FieldManualEntryKind =
  'exercise' | 'lesson' | 'principle' | 'card' | 'book' | 'scripture';

export interface FieldManualEntry {
  id: string;
  kind: FieldManualEntryKind;
  name: string;
  detail: string;
  link: readonly string[];
  fragment?: string;
  /** A field card's skill, so the Index can show a hatchet for tools and a rope for knots. */
  skill?: FieldSkill;
  /** Lowercase words the Index search also matches. */
  keywords: string;
  /** Sort key: leading articles and book numbers move behind the name. */
  sortKey: string;
  letter: string;
}

function sortKeyFor(name: string): string {
  return name
    .replace(/^(The|A|An) /, '')
    .replace(/^(\d) (.+)$/, '$2 $1')
    .toLowerCase();
}

function entry(
  id: string,
  kind: FieldManualEntryKind,
  name: string,
  detail: string,
  link: readonly string[],
  fragment?: string,
  keywords = '',
): FieldManualEntry {
  const sortKey = sortKeyFor(name);
  return {
    id,
    kind,
    name,
    detail,
    link,
    ...(fragment ? { fragment } : {}),
    keywords: searchText(`${name} ${detail} ${keywords}`),
    sortKey,
    letter: sortKey[0]?.toUpperCase() ?? '#',
  };
}

/** Lowercase, without accents or typographic quotes, so search is forgiving. */
export function searchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .toLowerCase();
}

/** Every entry in the Field Manual, sorted A to Z for the Index. */
export function getFieldManualIndex(): FieldManualEntry[] {
  const entries: FieldManualEntry[] = [];
  for (const guide of listChapterOneExerciseGuides()) {
    entries.push(
      entry(
        `exercise-${guide.id}`,
        'exercise',
        guide.name,
        'Exercise guide',
        ['/field-manual/exercises', guide.id],
        undefined,
        `${guide.purpose} ${guide.targets ?? ''}`,
      ),
    );
  }
  for (const lesson of listLeadershipLessons()) {
    entries.push(
      entry(
        `lesson-${lesson.id}`,
        'lesson',
        lesson.title,
        `Leadership lesson · Week ${lesson.week}`,
        ['/field-manual/lessons', lesson.id],
        undefined,
        lesson.scripture.map((item) => item.reference).join(' '),
      ),
    );
  }
  for (const principle of listLeadershipPrinciples()) {
    entries.push(
      entry(
        `principle-${principle.id}`,
        'principle',
        principle.title,
        'Leadership principle',
        ['/field-manual/principles'],
        principle.id,
        `${principle.meaning} ${principle.scripture.join(' ')}`,
      ),
    );
  }
  for (const card of listFieldCards()) {
    entries.push({
      ...entry(
        `card-${card.id}`,
        'card',
        card.title,
        `Field card · Week ${card.week}`,
        ['/field-manual/cards', card.id],
        undefined,
        `${card.summary} ${card.skill === 'knot' ? 'knot rope' : 'tools axe maul pickaxe edge'}`,
      ),
      skill: card.skill,
    });
  }
  for (const book of listReadingPlan()) {
    entries.push(
      entry(
        `book-${slug(book.title)}`,
        'book',
        book.title,
        `Book · Chapter ${chapterNumeral(book.chapter)}`,
        ['/field-manual/reading'],
        slug(book.title),
        `${book.author} ${book.theme} reading`,
      ),
    );
  }
  for (const lesson of listLeadershipLessons()) {
    if (EXTRA_BOOK_SUGGESTIONS.includes(lesson.forLater.title)) {
      entries.push(
        entry(
          `book-${slug(lesson.forLater.title)}`,
          'book',
          lesson.forLater.title,
          `Book · suggested in Week ${lesson.week}`,
          ['/field-manual/lessons', lesson.id],
          `book-${slug(lesson.forLater.title)}`,
          `${lesson.forLater.author} reading`,
        ),
      );
    }
  }

  const uses = new Map<string, { days: string[]; fragment: string }>();
  for (const week of getChapterOneScriptureByWeek()) {
    for (const day of week.days) {
      const found = uses.get(day.reference);
      if (found) found.days.push(`Week ${week.week} ${day.day}`);
      else
        uses.set(day.reference, {
          days: [`Week ${week.week} ${day.day}`],
          fragment: scriptureDayId(week.week, day.weekday),
        });
    }
  }
  const attemptReference = uses.get(GATE_TRIAL_SCRIPTURE.attemptDays);
  if (attemptReference) attemptReference.days.push('Gate Trial attempts');
  else
    uses.set(GATE_TRIAL_SCRIPTURE.attemptDays, {
      days: ['Gate Trial attempts'],
      fragment: 'gate-trial-attempts',
    });
  uses.set(GATE_TRIAL_SCRIPTURE.spirit, {
    days: ['the Gate Trial'],
    fragment: 'gate-trial-spirit',
  });
  for (const [reference, use] of uses) {
    entries.push(
      entry(
        `scripture-${slug(reference)}`,
        'scripture',
        reference,
        `Scripture · ${joinWords(use.days)}`,
        ['/field-manual/scripture'],
        use.fragment,
      ),
    );
  }

  return entries.sort(
    (a, b) => a.sortKey.localeCompare(b.sortKey, 'en') || a.name.localeCompare(b.name, 'en'),
  );
}
