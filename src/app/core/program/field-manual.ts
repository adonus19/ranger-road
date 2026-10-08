import type { LocalDate, WorkoutDefinition } from '../domain/models';
import { addDays, getWeekday } from './campaign';
import { resolveCampaignPosition, type ChapterDay, type TrialRecord } from './campaign-position';
import { gateTrialDefinition } from './chapter-one-trial.seed';
import type { Weekday } from './chapter-one.seed';
import { chapterOneDailySeed, chapterOneGateTrialAttempt } from './chapter-one-daily.seed';
import { getDayContent, getWeekContent } from './chapter-orders';
import type { ChapterProgram } from './chapter-program';
import { listExerciseGuides } from './exercise-guides';
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

const SKILL_KEYWORDS: Record<FieldSkill, string> = {
  tool: 'tools axe maul pickaxe edge',
  knot: 'knot rope',
  navigation: 'navigation map compass trail blaze direction',
};

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

/** A workout's ID, such as `chapter-2-forge-a`, or `gate-circuit` for the Gate Trial's circuit. */
export type FieldManualSessionId = string;

export interface FieldManualSession {
  id: FieldManualSessionId;
  title: string;
  days: string;
  warmup: readonly string[];
  exercises: readonly string[];
}

export interface FieldManualWeek {
  /**
   * `ahead` before Day 1 (or before one is chosen), `week` for a lead-in or a chapter's weeks,
   * `trial` after the chapter's last week while its trial waits, and `complete` once the last
   * chapter in the app is passed and the next chapter's first day arrives.
   */
  stage: 'ahead' | 'week' | 'trial' | 'complete';
  /** The chapter's number: 1 for Chapter I. */
  chapter: number;
  /** The campaign week whose content applies: 1–4 in Chapter I, 5–8 in Chapter II. */
  contentWeek: number;
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
  /** Completed trial results: they place each date in its chapter. */
  completedTrials?: readonly TrialRecord[];
}

interface WeekDay {
  date: LocalDate;
  day: ChapterDay;
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

function weekdayName(day: WeekDay): string {
  return WEEKDAY_NAMES[day.day.weekday - 1];
}

/**
 * The Monday–Sunday week a date belongs to, clipped to that date's chapter: Chapter I's lead-in
 * starts on Day 1, and a chapter that begins on a Tuesday after a Monday pass starts there.
 */
function weekDays(
  startDate: LocalDate,
  anchor: LocalDate,
  trials: readonly TrialRecord[],
): WeekDay[] {
  const chapterId = resolveCampaignPosition(startDate, anchor, trials)?.chapter.program.chapter.id;
  const monday = mondayOf(anchor);
  const days: WeekDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(monday, offset);
    const day = resolveCampaignPosition(startDate, date, trials)?.chapter;
    if (day && day.program.chapter.id === chapterId) days.push({ date, day });
  }
  return days;
}

function readingDays(days: readonly WeekDay[]): { names: string[]; minutes: number } {
  const reading = days
    .map((day) => ({ day, content: getDayContent(day.day) }))
    .filter(({ content }) => content.readingMinutes);
  return {
    names: reading.map(({ day }) => weekdayName(day)),
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

/** The Gate Trial's circuit keeps its own guides; the Three-Mile Trial has no circuit. */
const GATE_CIRCUIT_ID = 'gate-circuit';

function trialCircuitIds(program: ChapterProgram): string[] {
  return (
    program.trial.phases
      .find((phase) => phase.circuit)
      ?.circuit?.movements.map((movement) => movement.exerciseId) ?? []
  );
}

/** The workout session a day's order calls for, if any. */
function sessionIdFor(day: ChapterDay): string | undefined {
  const program = day.program;
  if (day.attemptDay) return trialCircuitIds(program).length ? GATE_CIRCUIT_ID : undefined;
  const activity = getDayContent(day).activity;
  if (activity.definitionId && program.workouts.some((w) => w.id === activity.definitionId)) {
    return activity.definitionId;
  }
  // Chapter I's Friday easier option, and easy mobility or recovery, use the Restoration routine.
  const restoration =
    activity.missionType === 'restoration' ||
    activity.alternatives?.some((alternative) =>
      alternative.contentReferences.includes(program.restorationId),
    );
  return restoration ? program.restorationId : undefined;
}

/** The sessions a week's days call for, in training order, with the days they fall on. */
function sessionsForDays(program: ChapterProgram, days: readonly WeekDay[]): FieldManualSession[] {
  const used = new Map<string, string[]>();
  for (const day of days) {
    const id = sessionIdFor(day.day);
    if (id) used.set(id, [...(used.get(id) ?? []), weekdayName(day)]);
  }
  const [forgeA, forgeB] = program.workouts;
  const order = [forgeA?.id, forgeB?.id, GATE_CIRCUIT_ID, program.restorationId];
  return order.flatMap((id): FieldManualSession[] => {
    const names = id ? used.get(id) : undefined;
    if (!id || !names) return [];
    const workout = program.workouts.find((item) => item.id === id);
    return [
      workout
        ? { id, title: workout.title, days: joinWords(names), ...exerciseIds(workout) }
        : {
            id,
            title: 'Gate Circuit',
            days: joinWords(names),
            warmup: [],
            exercises: trialCircuitIds(program),
          },
    ];
  });
}

function sessionsTitle(program: ChapterProgram, sessions: readonly FieldManualSession[]): string {
  const ids = sessions.map((session) => session.id);
  const [forgeA, forgeB] = program.workouts;
  const names: string[] = [];
  const hasA = !!forgeA && ids.includes(forgeA.id);
  const hasB = !!forgeB && ids.includes(forgeB.id);
  if (hasA && hasB) names.push('Forge');
  else if (hasA) names.push('Forge A');
  else if (hasB) names.push('Forge B');
  if (ids.includes(GATE_CIRCUIT_ID)) names.push('Gate Circuit');
  if (ids.includes(program.restorationId)) names.push('Restoration');
  return joinWords(names);
}

export function uniqueExerciseIds(sessions: readonly FieldManualSession[]): string[] {
  return [...new Set(sessions.flatMap((session) => [...session.warmup, ...session.exercises]))];
}

function lessonLine(
  stage: FieldManualWeek['stage'],
  contentWeek: number,
  days: readonly WeekDay[],
  startDate: LocalDate,
): string {
  if (stage === 'trial') return `Leadership lesson · Week ${contentWeek}, 3 minutes`;
  const first = days[0];
  // A midweek Day 1 reads Week 1's lesson on Day 1; a later chapter reads it on its first day.
  const when =
    !first || first.day.weekday === 1
      ? 'Monday'
      : first.date === startDate
        ? 'on Day 1'
        : weekdayName(first);
  return `Leadership lesson · Read ${when}, 3 minutes`;
}

/** Where a trial's attempt-day Scripture sits on the Scripture page. */
export function trialAttemptsFragment(trialId: string): string {
  return `${trialId}-attempts`;
}

function scriptureRow(
  stage: FieldManualWeek['stage'],
  days: readonly WeekDay[],
  today: LocalDate,
): FieldManualRow | undefined {
  const index = stage === 'ahead' ? 0 : days.findIndex((day) => day.date === today);
  const day = days[index]?.day;
  if (!day) return undefined;
  const remaining = days.length - index - 1;
  const line =
    stage === 'ahead'
      ? `Scripture on Day 1 · ${NUMBER_WORDS[remaining]} more that week`
      : remaining
        ? `Scripture today · ${NUMBER_WORDS[remaining]} more this week`
        : 'Scripture today · the last of this week';
  return {
    kind: 'scripture',
    title: getDayContent(day).scriptureReference,
    line,
    link: ['/field-manual/scripture'],
    fragment: day.attemptDay
      ? trialAttemptsFragment(day.program.trial.id)
      : scriptureDayId(day.contentWeek, day.weekday),
  };
}

/** A unique anchor for a dated reference, even if another day uses the same passage. */
export function scriptureDayId(week: number, weekday: Weekday): string {
  return `week-${week}-day-${weekday}`;
}

/** What the Field Manual's This week view lists for a date. */
export function getFieldManualWeek(input: FieldManualWeekInput): FieldManualWeek {
  const { startDate, today } = input;
  const trials = input.completedTrials ?? [];
  // Without a campaign, show the first full week as the week ahead.
  const start = startDate ?? mondayOf(today);
  const ahead = !startDate || today < start;
  const anchor = ahead ? start : today;
  const position = resolveCampaignPosition(start, anchor, ahead ? [] : trials)!;
  const chapter = position.chapter;
  const program = chapter.program;
  const number = program.chapter.number;
  const chapterLine = `Chapter ${chapterNumeral(number)} · ${program.chapter.name}`;

  if (!ahead && position.awaitingNextChapter) {
    return {
      stage: 'complete',
      chapter: number,
      contentWeek: chapter.contentWeek,
      heading: `Chapter ${chapterNumeral(number)} complete`,
      subline: `Chapter ${chapterNumeral(number + 1)}’s pages will appear here once they are added.`,
      rows: [],
      sessions: [],
      readingDays: [],
      entryIds: [],
    };
  }

  const days = weekDays(start, anchor, ahead ? [] : trials);
  const afterTarget = !ahead && chapter.afterLastWeek;
  const stage: FieldManualWeek['stage'] = ahead ? 'ahead' : afterTarget ? 'trial' : 'week';
  const contentWeek = chapter.contentWeek;
  const weekName = getWeekContent(chapter).name;
  const pass = chapter.pass;

  const heading = ahead
    ? `Week ahead · ${weekName}`
    : afterTarget
      ? pass
        ? `${program.trialName} passed`
        : `The ${program.trialName}`
      : `${chapter.leadIn ? 'Lead-in' : `Week ${contentWeek}`} · ${weekName}`;
  const subline =
    afterTarget && pass && chapter.nextStart
      ? `${chapterLine} · Chapter ${chapterNumeral(number + 1)} begins ${shortDate(chapter.nextStart)}`
      : chapterLine;

  const rows: FieldManualRow[] = [];
  const entryIds: string[] = [];
  const lesson = getLeadershipLessonForWeek(contentWeek);
  if (lesson) {
    rows.push({
      kind: 'lesson',
      title: lesson.title,
      line: lessonLine(stage, contentWeek, days, start),
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
  const book = listReadingPlan().find((entry) => entry.chapter === number);
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
      entryIds.push(`scripture-${slug(getDayContent(day.day).scriptureReference)}`);
    }
  }

  const sessions = sessionsForDays(
    program,
    pass ? days.filter((day) => !day.day.attemptDay) : days,
  );
  if (sessions.length) {
    const count = uniqueExerciseIds(sessions).length;
    rows.push({
      kind: 'exercises',
      title: sessionsTitle(program, sessions),
      line: `Exercise guides · ${count} movements ${stage === 'ahead' ? 'that week' : 'this week'}`,
      link: ['/field-manual/exercises'],
    });
    entryIds.push(...uniqueExerciseIds(sessions).map((id) => `exercise-${id}`));
  }

  return {
    stage,
    chapter: number,
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
  for (const guide of listExerciseGuides()) {
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
        `Field card · ${card.lastWeek ? `Weeks ${card.week}–${card.lastWeek}` : `Week ${card.week}`}`,
        ['/field-manual/cards', card.id],
        undefined,
        `${card.summary} ${SKILL_KEYWORDS[card.skill]}`,
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
