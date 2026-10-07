import type { IntervalPlan } from '../domain/models';

export type { IntervalPlan } from '../domain/models';

export type IntervalPhase = 'warmup' | 'brisk' | 'easy' | 'cooldown';

export interface IntervalSegment {
  phase: IntervalPhase;
  /** 1-based round for brisk and easy blocks. */
  round?: number;
  seconds: number;
  /** Seconds from the start of the timer. */
  startsAt: number;
}

export interface IntervalProgress {
  done: boolean;
  index: number;
  segment: IntervalSegment | null;
  /** Whole seconds left in the current segment, rounded up. */
  remainingSeconds: number;
  totalSeconds: number;
}

export const INTERVAL_LIMITS = { rounds: [1, 20], seconds: [10, 600] } as const;

export function buildIntervalSegments(plan: IntervalPlan): IntervalSegment[] {
  const blocks: Omit<IntervalSegment, 'startsAt'>[] = [];
  if (plan.warmupMinutes) blocks.push({ phase: 'warmup', seconds: plan.warmupMinutes * 60 });
  for (let round = 1; round <= plan.rounds; round++) {
    blocks.push({ phase: 'brisk', round, seconds: plan.briskSeconds });
    blocks.push({ phase: 'easy', round, seconds: plan.easySeconds });
  }
  if (plan.cooldownMinutes) blocks.push({ phase: 'cooldown', seconds: plan.cooldownMinutes * 60 });
  let startsAt = 0;
  return blocks.map((block) => {
    const segment = { ...block, startsAt };
    startsAt += block.seconds;
    return segment;
  });
}

export function intervalProgress(
  segments: readonly IntervalSegment[],
  elapsedSeconds: number,
): IntervalProgress {
  const last = segments.at(-1);
  const totalSeconds = last ? last.startsAt + last.seconds : 0;
  if (!last || elapsedSeconds >= totalSeconds) {
    return { done: true, index: segments.length, segment: null, remainingSeconds: 0, totalSeconds };
  }
  let index = 0;
  while (index + 1 < segments.length && segments[index + 1].startsAt <= elapsedSeconds) index++;
  const segment = segments[index];
  return {
    done: false,
    index,
    segment,
    remainingSeconds: Math.ceil(segment.startsAt + segment.seconds - elapsedSeconds),
    totalSeconds,
  };
}

/** "1 minute", "90 seconds", "2 minutes". */
export function formatIntervalLength(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `${seconds} seconds`;
}

/** One plain line for the timer's summary, such as "6 rounds of 1 minute brisk / 2 minutes easy". */
export function describeIntervalPlan(plan: IntervalPlan): string {
  const rounds = `${plan.rounds} ${plan.rounds === 1 ? 'round' : 'rounds'}`;
  const core = `${rounds} of ${formatIntervalLength(plan.briskSeconds)} brisk / ${formatIntervalLength(plan.easySeconds)} easy`;
  return plan.warmupMinutes
    ? `${plan.warmupMinutes} ${plan.warmupMinutes === 1 ? 'minute' : 'minutes'} easy, then ${core}`
    : core;
}

/** Whole numbers within the limits; anything else cannot start a timer. */
export function isValidIntervalPlan(plan: IntervalPlan): boolean {
  const [minRounds, maxRounds] = INTERVAL_LIMITS.rounds;
  const [minSeconds, maxSeconds] = INTERVAL_LIMITS.seconds;
  return (
    Number.isInteger(plan.rounds) &&
    plan.rounds >= minRounds &&
    plan.rounds <= maxRounds &&
    [plan.briskSeconds, plan.easySeconds].every(
      (seconds) => Number.isInteger(seconds) && seconds >= minSeconds && seconds <= maxSeconds,
    )
  );
}
