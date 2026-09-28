import type { RoadSession } from '../../core/domain/models';

const AMOUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** The parts of a walk's summary, in the units the person entered. */
export function roadSessionParts(session: RoadSession): string[] {
  return [
    `${AMOUNT.format(session.distance)} mi`,
    `${AMOUNT.format(session.duration)} min`,
    session.terrain,
    `Effort ${session.rpe}`,
  ];
}

/** "2.1 mi · 41 min · Gravel trail · Effort 6". */
export function describeRoadSession(session: RoadSession): string {
  return roadSessionParts(session).join(' · ');
}

/** "Pain 2 before, 3 after", or null when neither was recorded. */
export function describeRoadPain(session: RoadSession): string | null {
  const parts: string[] = [];
  if (session.painBefore !== undefined) {
    parts.push(`${session.painBefore} before`);
  }
  if (session.painAfter !== undefined) {
    parts.push(`${session.painAfter} after`);
  }
  return parts.length ? `Pain ${parts.join(', ')}` : null;
}
