import type { CompletedSet } from '../domain/models';
import { getExerciseGuide } from './exercise-guides';
import { formatChapterNumeral } from './program-catalog';
import type {
  BasisContext,
  BestSet,
  ChangeDirection,
  ChapterSummary,
  ExerciseChange,
  ExerciseProgress,
  Exposure,
  HintEvidence,
  HoldReason,
  ProgressionHint,
} from './progression';

/** The words Forge uses for progression, from UX_SPEC.md "Progression in Forge". */

/** One saved set, as Last time shows it: "95 × 6", "— × 10", "25 lb × 40 s", "40 s". */
export function setLabel(set: CompletedSet): string {
  if (set.completed === false) return 'skipped';
  const load = set.load !== undefined && Number.isFinite(set.load) ? set.load : undefined;
  if (set.reps !== undefined) return `${load ?? '—'} × ${set.reps}`;
  if (set.duration !== undefined)
    return load !== undefined ? `${load} lb × ${set.duration} s` : `${set.duration} s`;
  return load !== undefined ? `${load} lb` : '—';
}

function dose(exposure: Exposure): string | undefined {
  const prescription = exposure.prescription;
  if (!prescription) return undefined;
  const amount =
    prescription.reps !== undefined
      ? `${prescription.reps}`
      : `${prescription.durationSeconds ?? prescription.duration} s`;
  return `${prescription.sets ?? 1} × ${amount}`;
}

/** "Last time", or "Last time (Chapter I, 3 × 8)" when the dose has changed since. */
export function lastTimeTitle(progress: ExerciseProgress): string {
  const last = progress.last;
  if (!last || !progress.lastDoseChanged) return 'Last time';
  const written = dose(last);
  const chapter = progress.lastChapter
    ? `Chapter ${formatChapterNumeral(progress.lastChapter)}`
    : '';
  const detail = [chapter, written].filter(Boolean).join(', ');
  return detail ? `Last time (${detail})` : 'Last time';
}

/** A step-up's first time: "Last on Supported Split Squat: 20 × 8". */
export function easierLine(easier: Exposure): string {
  const name = getExerciseGuide(easier.exerciseId)?.name ?? easier.exerciseId;
  const done = easier.sets.filter((set) => set.completed !== false);
  const shown = done.at(-1);
  return `Last on ${name}: ${shown ? setLabel(shown) : '—'}`;
}

function evidenceText(evidence: HintEvidence): string {
  const value = evidence.unit === 'reps' ? `${evidence.value}` : `${evidence.value} s`;
  return `all sets at ${value}, final effort ${evidence.effort}`;
}

const HOLD_REASONS: Record<HoldReason['code'], (reason: HoldReason) => string> = {
  'pain-last': () => 'pain noted last time',
  'yellow-today': () => 'Yellow today',
  'deload-week': () => 'deload week',
  'yellow-last': () => 'last session was Yellow',
  'final-effort': (reason) =>
    `final effort ${reason.code === 'final-effort' ? reason.effort : ''} last time`,
  'no-final-effort': () => 'no final effort recorded',
  'below-target': (reason) =>
    reason.code === 'below-target'
      ? `not every set reached ${reason.target}${reason.unit === 'seconds' ? ' s' : ' reps'}`
      : '',
  'top-of-range': (reason) =>
    reason.code === 'top-of-range' ? `${reason.target} s is the written time` : '',
  'no-full-session': () => 'no full session on record yet',
};

export interface HintCopy {
  /** "May add 5 lb → 100 lb" or "Hold at 95 lb". */
  action: string;
  /** "all sets at 6, final effort 6" or the hold's reason. */
  reason: string;
  /** A small up arrow marks a hint that allows more. */
  rising: boolean;
  /** "Week 4 was a deload; based on Week 3". */
  context?: string;
}

function contextText(context: BasisContext | undefined): string | undefined {
  if (!context) return undefined;
  const skipped =
    context.reason === 'deload'
      ? context.skippedWeek !== undefined
        ? `Week ${context.skippedWeek} was a deload`
        : 'Last time was a deload'
      : 'Last time was reduced';
  const basis =
    context.basisWeek !== undefined
      ? `based on Week ${context.basisWeek}`
      : 'based on the last full session';
  return `${skipped}; ${basis}`;
}

export function hintCopy(hint: ProgressionHint): HintCopy {
  const context = contextText(hint.context);
  const extra = context ? { context } : {};
  switch (hint.type) {
    case 'add-load': {
      const target = hint.to !== undefined ? ` → ${hint.to} lb` : '';
      const box = hint.lowerBox ? ', or a lower box' : '';
      const back = hint.backToReps !== undefined ? `, back to ${hint.backToReps} reps` : '';
      return {
        action: `May add 5 lb${target}${box}${back}`,
        reason: evidenceText(hint.evidence),
        rising: true,
        ...extra,
      };
    }
    case 'add-reps':
      return {
        action: `May add a rep, up to ${hint.aimFor}`,
        reason: `final effort ${hint.evidence.effort}`,
        rising: true,
        ...extra,
      };
    case 'add-seconds':
      return {
        action: `May hold longer, up to ${hint.aimFor} s`,
        reason: `final effort ${hint.evidence.effort}`,
        rising: true,
        ...extra,
      };
    case 'less-band':
      return {
        action: 'May use less band help',
        reason: evidenceText(hint.evidence),
        rising: true,
        ...extra,
      };
    case 'hold':
      return {
        action: hint.at !== undefined ? `Hold at ${hint.at} lb` : 'Hold',
        reason: HOLD_REASONS[hint.reason.code](hint.reason),
        rising: false,
        ...extra,
      };
  }
}

export const NO_LOAD_LINE = 'Add the weight to track it.';
export const FIRST_TIME_LINE = 'First time on record';

/** "100 × 6", "100 lb × 40 s", "8 reps", "40 s". */
export function bestSetLabel(best: BestSet): string {
  if (best.reps !== undefined)
    return best.load !== undefined ? `${best.load} × ${best.reps}` : `${best.reps} reps`;
  if (best.seconds !== undefined) {
    return best.load !== undefined ? `${best.load} lb × ${best.seconds} s` : `${best.seconds} s`;
  }
  return best.load !== undefined ? `${best.load} lb` : '—';
}

/** "95 → 100 lb", "6 → 7 reps", "40 → 45 s", or both sets in full when two things changed. */
export function changeLabel(change: Pick<ExerciseChange, 'from' | 'to'>): string {
  const { from, to } = change;
  if (from.load !== undefined && to.load !== undefined && from.load !== to.load) {
    return `${from.load} → ${to.load} lb`;
  }
  if (from.reps !== undefined && to.reps !== undefined) return `${from.reps} → ${to.reps} reps`;
  if (from.seconds !== undefined && to.seconds !== undefined)
    return `${from.seconds} → ${to.seconds} s`;
  return `${bestSetLabel(from)} → ${bestSetLabel(to)}`;
}

/** A change as the lists read it: "95 → 100 lb", or "40 → 45 s per side" for work on each side. */
export function changeText(change: ExerciseChange): string {
  const label = changeLabel(change);
  const perSide = change.perSide && /( s| reps)$/.test(label) ? ' per side' : '';
  return `${label}${perSide}`;
}

export function directionLabel(direction: ChangeDirection, reduced: boolean): string | undefined {
  if (direction !== 'lighter') return undefined;
  return reduced ? 'Lighter today (reduced)' : 'Lighter today';
}

/** "4 held steady", or nothing when none held. */
export function heldLine(count: number): string | undefined {
  return count ? `${count} held steady` : undefined;
}

/** "Since Day 1: 75 → 100 lb", from the first and latest best sets. */
export function sinceDayOneLine(first: BestSet, latest: BestSet): string {
  return `Since Day 1: ${changeLabel({ from: first, to: latest })}`;
}

/** One row of a progression list: a name, what changed, and an optional quiet note. */
export interface ProgressLine {
  label: string;
  value?: string;
  note?: string;
}

function nameOf(exerciseId: string): string {
  return getExerciseGuide(exerciseId)?.name ?? exerciseId;
}

/**
 * "Compared with last time", in the order the design gives: what went up, one line counting
 * what held, then anything lighter. No colors and no praise.
 */
export function compareLines(changes: readonly ExerciseChange[]): ProgressLine[] {
  const ups = changes
    .filter((item) => item.direction === 'up')
    .map((item) => ({ label: nameOf(item.exerciseId), value: changeText(item) }));
  const held = heldLine(changes.filter((item) => item.direction === 'held').length);
  const lighter = changes
    .filter((item) => item.direction === 'lighter')
    .map((item) => ({
      label: nameOf(item.exerciseId),
      value: changeText(item),
      note: directionLabel(item.direction, item.reduced),
    }));
  return [...ups, ...(held ? [{ label: held }] : []), ...lighter];
}

export interface SummaryLines {
  lifts: ProgressLine[];
  carriesAndHolds: ProgressLine[];
  held?: string;
}

function summaryLine(item: ExerciseChange): ProgressLine {
  return {
    label: nameOf(item.exerciseId),
    value: changeText(item),
    ...(item.direction === 'lighter' ? { note: 'Lower than the first full session' } : {}),
  };
}

/** "What changed this chapter": lifts, then carries and holds, then a count of the rest. */
export function summaryLines(summary: ChapterSummary): SummaryLines {
  const held = heldLine(summary.heldCount);
  return {
    lifts: summary.lifts.map(summaryLine),
    carriesAndHolds: summary.carriesAndHolds.map(summaryLine),
    ...(held ? { held } : {}),
  };
}
