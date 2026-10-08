import type {
  CompletedSet,
  DeepReadonly,
  ExercisePrescription,
  LocalDate,
  ReadinessCheck,
  ReadinessStatus,
  WorkoutSession,
} from '../domain/models';
import { effectiveReadinessStatus } from '../domain/workout';
import { STEP_UP_FROM, progressionKind, type ProgressionKind } from './progression-kinds';

/**
 * Forge progression, as written in RANGERS_ROAD_PROGRAM.md ("Showing progression in Forge").
 * Everything here is derived from saved sessions and shown for reference only: nothing is
 * stored, and no load is ever filled in or raised for the person.
 */

/** Where a date sits in the campaign, for chapter labels and deload weeks. */
export interface CampaignDayInfo {
  chapter: number;
  /** Campaign week whose orders applied: 1–4 in Chapter I, 5–8 in Chapter II. */
  week: number;
  /** A chapter's last week (Weeks 4 and 8) and the trial days after it. */
  deload: boolean;
}

export interface ProgressionContext {
  /** Every saved workout session, completed and stopped. */
  sessions: readonly WorkoutSession[];
  /** Readiness checks by id, to tell whether a past session was Yellow. */
  readinessById: ReadonlyMap<string, ReadinessCheck>;
  dayOf(date: LocalDate): CampaignDayInfo | null;
}

export interface Today {
  date: LocalDate;
  readiness: ReadinessStatus | null;
}

/** One past session's work on an exercise. */
export interface Exposure {
  sessionId: string;
  date: LocalDate;
  exerciseId: string;
  /** Every set as saved, done or skipped, in order. */
  sets: readonly CompletedSet[];
  /** The prescription the person had that day, when the session kept a snapshot. */
  prescription?: ExercisePrescription;
  /** The working load: the last completed set with a weight. */
  load?: number;
  /** Effort on the final completed set. */
  finalEffort?: number;
  reduced: boolean;
}

export type HoldReason =
  | { code: 'pain-last' }
  | { code: 'yellow-today' }
  | { code: 'deload-week' }
  | { code: 'yellow-last' }
  | { code: 'final-effort'; effort: number }
  | { code: 'no-final-effort' }
  | { code: 'below-target'; target: number; unit: 'reps' | 'seconds' }
  | { code: 'top-of-range'; target: number }
  | { code: 'no-full-session' };

/** Why the hint judged an earlier session than the last one. */
export interface BasisContext {
  /** The last session was a planned deload, or reduced for another non-blocking reason. */
  reason: 'deload' | 'reduced';
  /** Week of the skipped-over session and of the session judged, when known. */
  skippedWeek?: number;
  basisWeek?: number;
}

/** What last time showed, for "all sets at 6, final effort 6". */
export interface HintEvidence {
  /** The lowest value across the sets, so "all sets at" is never overstated. */
  value: number;
  unit: 'reps' | 'seconds';
  effort: number;
}

export type ProgressionHint =
  | {
      type: 'add-load';
      evidence: HintEvidence;
      /** Undefined when last time's weight was not recorded. */
      from?: number;
      to?: number;
      /** A squat may instead use a lower box. */
      lowerBox: boolean;
      /** A rep range starts again at its bottom after the load goes up. */
      backToReps?: number;
      context?: BasisContext;
    }
  | { type: 'add-reps'; aimFor: number; evidence: HintEvidence; context?: BasisContext }
  | { type: 'add-seconds'; aimFor: number; evidence: HintEvidence; context?: BasisContext }
  | { type: 'less-band'; evidence: HintEvidence; context?: BasisContext }
  | { type: 'hold'; at?: number; reason: HoldReason; context?: BasisContext };

export interface ExerciseProgress {
  exerciseId: string;
  kind: ProgressionKind;
  /** The newest exposure, shown as Last time (a deload included). */
  last?: Exposure;
  /** A step-up's first time: the easier version's last exposure, for context only. */
  easier?: Exposure;
  /** Set when last time's dose differs from today's, so a lower count reads correctly. */
  lastDoseChanged: boolean;
  /** The chapter last time was in, for "Last time (Chapter I, 3 × 8)". */
  lastChapter?: number;
  /** No hint for a first time on record. */
  hint?: ProgressionHint;
  /** Last time's weight was not recorded on a loaded exercise. */
  noLoadRecorded: boolean;
}

interface Range {
  low: number;
  high: number;
}

/** "8–10" → 8 to 10, 6 → 6 to 6. */
export function parseRange(value: number | string | undefined): Range | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? { low: value, high: value } : undefined;
  if (typeof value !== 'string') return undefined;
  const parts = value.split(/[–-]/).map((part) => Number(part.trim()));
  if (parts.some((part) => !Number.isFinite(part)) || !parts.length) return undefined;
  return { low: parts[0], high: parts.at(-1)! };
}

function repsRange(
  prescription: DeepReadonly<ExercisePrescription> | undefined,
): Range | undefined {
  return prescription ? parseRange(prescription.reps) : undefined;
}

function secondsRange(
  prescription: DeepReadonly<ExercisePrescription> | undefined,
): Range | undefined {
  return prescription
    ? parseRange(prescription.durationSeconds ?? prescription.duration)
    : undefined;
}

function finite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function newestFirst(a: WorkoutSession, b: WorkoutSession): number {
  return (
    b.date.localeCompare(a.date) ||
    (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
    b.id.localeCompare(a.id)
  );
}

/** Completed sessions (older rows without an outcome count) that did this exercise as written. */
export function exposuresFor(sessions: readonly WorkoutSession[], exerciseId: string): Exposure[] {
  return [...sessions]
    .filter((session) => session.outcome !== 'stopped')
    .sort(newestFirst)
    .flatMap((session): Exposure[] => {
      const result = session.exerciseResults.find((item) => item.exerciseId === exerciseId);
      if (!result || result.substitutionId) return [];
      const done = result.sets.filter((set) => set.completed !== false);
      if (!done.length) return [];
      const withLoad = [...done].reverse().find((set) => finite(set.load) && set.load! >= 0);
      const prescription = session.definitionSnapshot?.exercises.find(
        (item) => item.exerciseId === exerciseId,
      ) as ExercisePrescription | undefined;
      return [
        {
          sessionId: session.id,
          date: session.date,
          exerciseId,
          sets: result.sets,
          ...(prescription ? { prescription } : {}),
          ...(withLoad ? { load: withLoad.load } : {}),
          ...(finite(done.at(-1)?.rpe) ? { finalEffort: done.at(-1)!.rpe } : {}),
          reduced: Boolean(session.reduced),
        },
      ];
    });
}

function sessionById(context: ProgressionContext, id: string): WorkoutSession | undefined {
  return context.sessions.find((session) => session.id === id);
}

function wasYellow(context: ProgressionContext, exposure: Exposure): boolean {
  const session = sessionById(context, exposure.sessionId);
  const check = session ? context.readinessById.get(session.readinessId) : undefined;
  return !!check && effectiveReadinessStatus(check) !== 'green';
}

function hadPain(context: ProgressionContext, exposure: Exposure): boolean {
  const session = sessionById(context, exposure.sessionId);
  return !!session?.exerciseResults.find((result) => result.exerciseId === exposure.exerciseId)
    ?.painEvents.length;
}

function doseKey(prescription: DeepReadonly<ExercisePrescription> | undefined): string {
  if (!prescription) return '';
  return [
    prescription.sets ?? 1,
    prescription.reps ?? '',
    prescription.durationSeconds ?? prescription.duration ?? '',
    prescription.perSide ? 'side' : '',
  ].join('|');
}

/**
 * Everything the Current Set screen shows about an exercise: Last time, a step-up's easier
 * version, and the hint. `prescription` is today's.
 */
export function exerciseProgress(
  prescription: DeepReadonly<ExercisePrescription>,
  today: Today,
  context: ProgressionContext,
): ExerciseProgress {
  const exerciseId = prescription.exerciseId;
  const kind = progressionKind(exerciseId);
  const empty: ExerciseProgress = {
    exerciseId,
    kind,
    lastDoseChanged: false,
    noLoadRecorded: false,
  };
  if (kind === 'none') return empty;

  const exposures = exposuresFor(context.sessions, exerciseId);
  const last = exposures[0];
  if (!last) {
    const easierId = STEP_UP_FROM[exerciseId];
    const easier = easierId ? exposuresFor(context.sessions, easierId)[0] : undefined;
    return { ...empty, ...(easier ? { easier } : {}) };
  }
  const lastChapter = context.dayOf(last.date)?.chapter;
  const progress: ExerciseProgress = {
    ...empty,
    last,
    ...(lastChapter ? { lastChapter } : {}),
    lastDoseChanged: !!last.prescription && doseKey(last.prescription) !== doseKey(prescription),
  };
  const hint = progressionHint(kind, prescription, exposures, today, context);
  const loaded = kind !== 'hold' && kind !== 'assisted-pull-up';
  return {
    ...progress,
    hint,
    noLoadRecorded: loaded && !finite(last.load),
  };
}

/** The session the rule judges, walking back past non-blocking reductions. */
function findBasis(
  exposures: readonly Exposure[],
  context: ProgressionContext,
): { basis: Exposure; context?: BasisContext } | { hold: HoldReason; basis?: Exposure } {
  let skipped: { reason: BasisContext['reason']; week?: number } | undefined;
  for (const exposure of exposures) {
    if (hadPain(context, exposure)) return { hold: { code: 'pain-last' }, basis: exposure };
    if (wasYellow(context, exposure)) return { hold: { code: 'yellow-last' }, basis: exposure };
    const day = context.dayOf(exposure.date);
    if (day?.deload || exposure.reduced) {
      skipped ??= { reason: day?.deload ? 'deload' : 'reduced', week: day?.week };
      continue;
    }
    const basisWeek = day?.week;
    return {
      basis: exposure,
      ...(skipped
        ? {
            context: {
              reason: skipped.reason,
              ...(skipped.week !== undefined ? { skippedWeek: skipped.week } : {}),
              ...(basisWeek !== undefined ? { basisWeek } : {}),
            },
          }
        : {}),
    };
  }
  return { hold: { code: 'no-full-session' } };
}

function progressionHint(
  kind: ProgressionKind,
  prescription: DeepReadonly<ExercisePrescription>,
  exposures: readonly Exposure[],
  today: Today,
  context: ProgressionContext,
): ProgressionHint {
  const found = findBasis(exposures, context);
  const holdAt = (found.basis ?? exposures[0])?.load;
  const hold = (reason: HoldReason, basisContext?: BasisContext): ProgressionHint => ({
    type: 'hold',
    ...(finite(holdAt) ? { at: holdAt } : {}),
    reason,
    ...(basisContext ? { context: basisContext } : {}),
  });

  // Pain comes first; then today's gates, which the person can see on the readiness strip.
  if ('hold' in found && found.hold.code === 'pain-last') return hold(found.hold);
  // Strength never starts without a same-day check, so a missing check never reaches here.
  if (today.readiness && today.readiness !== 'green') return hold({ code: 'yellow-today' });
  if (context.dayOf(today.date)?.deload) return hold({ code: 'deload-week' });
  if ('hold' in found) return hold(found.hold);

  const { basis, context: basisContext } = found;
  const judged = basis.prescription ?? prescription;
  const done = basis.sets.filter((set) => set.completed !== false);
  const allDone =
    basis.sets.every((set) => set.completed !== false) && done.length >= (judged.sets ?? 1);

  const reps = repsRange(judged);
  const seconds = secondsRange(judged);
  const values = done.map((set) => (reps ? set.reps : (set.duration ?? undefined)));
  const unit: 'reps' | 'seconds' = reps ? 'reps' : 'seconds';
  const range = reps ?? seconds;
  if (!range) return hold({ code: 'no-full-session' }, basisContext);
  if (!allDone || values.some((value) => !finite(value) || value! < range.low)) {
    return hold({ code: 'below-target', target: range.high, unit }, basisContext);
  }

  if (!finite(basis.finalEffort)) return hold({ code: 'no-final-effort' }, basisContext);
  if (basis.finalEffort > 7) {
    return hold({ code: 'final-effort', effort: basis.finalEffort }, basisContext);
  }

  const atTop = values.every((value) => value! >= range.high);
  const todayReps = repsRange(prescription);
  const todaySeconds = secondsRange(prescription);
  const evidence: HintEvidence = {
    value: Math.min(...values.map((value) => value!)),
    unit,
    effort: basis.finalEffort,
  };
  const withContext = { evidence, ...(basisContext ? { context: basisContext } : {}) };
  const addLoad = (backToReps?: number): ProgressionHint => ({
    type: 'add-load',
    ...(finite(basis.load) ? { from: basis.load, to: basis.load + 5 } : {}),
    lowerBox: kind === 'squat',
    ...(backToReps !== undefined ? { backToReps } : {}),
    ...withContext,
  });

  switch (kind) {
    case 'barbell-upper':
    case 'squat':
    case 'carry':
      return atTop
        ? addLoad()
        : hold({ code: 'below-target', target: range.high, unit }, basisContext);
    case 'loaded': {
      const isRange = range.high > range.low;
      if (!isRange)
        return atTop
          ? addLoad()
          : hold({ code: 'below-target', target: range.high, unit }, basisContext);
      if (atTop) return addLoad(todayReps?.low ?? range.low);
      return { type: 'add-reps', aimFor: (todayReps ?? range).high, ...withContext };
    }
    case 'hold': {
      const target = todaySeconds ?? range;
      if (target.high <= target.low)
        return hold({ code: 'top-of-range', target: target.high }, basisContext);
      const best = Math.min(...values.map((value) => value!));
      if (best >= target.high)
        return hold({ code: 'top-of-range', target: target.high }, basisContext);
      return { type: 'add-seconds', aimFor: Math.min(target.high, best + 5), ...withContext };
    }
    case 'assisted-pull-up':
      return atTop
        ? { type: 'less-band', ...withContext }
        : hold({ code: 'below-target', target: range.high, unit }, basisContext);
    default:
      return hold({ code: 'no-full-session' }, basisContext);
  }
}

/** The best working set of an exposure: the heaviest load, then the most reps or seconds. */
export interface BestSet {
  load?: number;
  reps?: number;
  seconds?: number;
}

export function bestSet(exposure: Exposure): BestSet | undefined {
  const done = exposure.sets.filter((set) => set.completed !== false);
  let best: CompletedSet | undefined;
  for (const set of done) {
    if (!best || compareSets(set, best) > 0) best = set;
  }
  if (!best) return undefined;
  return {
    ...(finite(best.load) ? { load: best.load } : {}),
    ...(finite(best.reps) ? { reps: best.reps } : {}),
    ...(finite(best.duration) ? { seconds: best.duration } : {}),
  };
}

function amount(set: Pick<CompletedSet, 'reps' | 'duration'>): number {
  return set.reps ?? set.duration ?? 0;
}

function compareSets(a: CompletedSet, b: CompletedSet): number {
  return (a.load ?? 0) - (b.load ?? 0) || amount(a) - amount(b);
}

function compareBest(a: BestSet, b: BestSet): number {
  return (a.load ?? 0) - (b.load ?? 0) || (a.reps ?? a.seconds ?? 0) - (b.reps ?? b.seconds ?? 0);
}

export type ChangeDirection = 'up' | 'held' | 'lighter';

export interface ExerciseChange {
  exerciseId: string;
  direction: ChangeDirection;
  from: BestSet;
  to: BestSet;
  /** The newer session was reduced, so "lighter" reads "Lighter today (reduced)". */
  reduced: boolean;
}

function change(
  exerciseId: string,
  earlier: Exposure,
  later: Exposure,
): ExerciseChange | undefined {
  const from = bestSet(earlier);
  const to = bestSet(later);
  if (!from || !to) return undefined;
  const order = compareBest(to, from);
  return {
    exerciseId,
    direction: order > 0 ? 'up' : order < 0 ? 'lighter' : 'held',
    from,
    to,
    reduced: later.reduced,
  };
}

/**
 * "Compared with last time" for a just-saved session: each tracked exercise against its
 * previous exposure in any chapter. Exercises done for the first time are left out.
 */
export function compareWithLastTime(
  session: WorkoutSession,
  sessions: readonly WorkoutSession[],
): ExerciseChange[] {
  const earlier = sessions.filter(
    (item) => item.id !== session.id && newestFirst(session, item) < 0,
  );
  return session.exerciseResults.flatMap((result): ExerciseChange[] => {
    if (progressionKind(result.exerciseId) === 'none') return [];
    const [now] = exposuresFor([session], result.exerciseId);
    const [before] = exposuresFor(earlier, result.exerciseId);
    const found = now && before ? change(result.exerciseId, before, now) : undefined;
    return found ? [found] : [];
  });
}

export interface RecordRow {
  sessionId: string;
  date: LocalDate;
  chapter?: number;
  best: BestSet;
  tag?: 'deload' | 'reduced';
}

export interface ExerciseRecord {
  rows: RecordRow[];
  /** The first and the latest best sets, for "Since Day 1: 75 → 100 lb". */
  first?: BestSet;
  latest?: BestSet;
}

/** "Your record" on an exercise's guide: its best working set per session, newest first. */
export function exerciseRecord(exerciseId: string, context: ProgressionContext): ExerciseRecord {
  const rows = exposuresFor(context.sessions, exerciseId).flatMap((exposure): RecordRow[] => {
    const best = bestSet(exposure);
    if (!best) return [];
    const day = context.dayOf(exposure.date);
    const tag = day?.deload ? 'deload' : exposure.reduced ? 'reduced' : undefined;
    return [
      {
        sessionId: exposure.sessionId,
        date: exposure.date,
        ...(day ? { chapter: day.chapter } : {}),
        best,
        ...(tag ? { tag } : {}),
      },
    ];
  });
  return {
    rows,
    ...(rows.length ? { first: rows.at(-1)!.best, latest: rows[0].best } : {}),
  };
}

export interface ChapterSummary {
  lifts: ExerciseChange[];
  carriesAndHolds: ExerciseChange[];
  /** Exercises whose first and last full sessions match. */
  heldCount: number;
}

/**
 * "What changed this chapter": each tracked exercise's first against last full session in
 * the chapter. Deload and reduced sessions are left out, so a planned deload never reads
 * as going backwards.
 */
export function chapterSummary(chapter: number, context: ProgressionContext): ChapterSummary {
  const inChapter = context.sessions.filter(
    (session) => context.dayOf(session.date)?.chapter === chapter,
  );
  const ids = [
    ...new Set(inChapter.flatMap((session) => session.exerciseResults.map((r) => r.exerciseId))),
  ];
  const summary: ChapterSummary = { lifts: [], carriesAndHolds: [], heldCount: 0 };
  for (const exerciseId of ids) {
    const kind = progressionKind(exerciseId);
    if (kind === 'none') continue;
    const full = exposuresFor(inChapter, exerciseId).filter(
      (exposure) => !exposure.reduced && !context.dayOf(exposure.date)?.deload,
    );
    if (full.length < 2) continue;
    const found = change(exerciseId, full.at(-1)!, full[0]);
    if (!found) continue;
    if (found.direction === 'held') summary.heldCount += 1;
    else if (kind === 'carry' || kind === 'hold') summary.carriesAndHolds.push(found);
    else summary.lifts.push(found);
  }
  return summary;
}
