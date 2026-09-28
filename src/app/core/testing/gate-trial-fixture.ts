import type { ReadinessCheck, TrialCircuitRoundResult } from '../domain/models';
import type { GateTrialResultInput } from '../domain/trial';
import { gateTrialDefinition } from '../program/chapter-one-trial.seed';

/** Test data follows the versioned seed so circuit validation is exercised, not bypassed. */
export function completeGateTrialRounds(): TrialCircuitRoundResult[] {
  const movements = gateTrialDefinition.phases.find((phase) => phase.id === 'controlled-circuit')!.circuit!.movements;
  return [1, 2, 3].map((round) => ({
    round,
    movements: movements.map((movement) => ({
      exerciseId: movement.exerciseId,
      ...(movement.reps !== undefined
        ? movement.perSide
          ? { repsBySide: { left: movement.reps, right: movement.reps } }
          : { reps: movement.reps }
        : {}),
      ...(movement.durationSeconds !== undefined
        ? movement.perSide
          ? { durationSecondsBySide: {
            left: movement.durationSeconds,
            right: movement.durationSeconds,
          } }
          : { durationSeconds: movement.durationSeconds }
        : {}),
    })),
  }));
}

export function completeGateTrialInput(readiness: ReadinessCheck): GateTrialResultInput {
  return {
    id: 'gate-result-1',
    date: readiness.date,
    recordedAt: `${readiness.date}T16:00:00.000Z`,
    readiness,
    distanceMiles: 2,
    walkDurationMinutes: 36,
    walkRpe: 5,
    kneeResponse: 'Steady.',
    backResponse: 'Steady.',
    recoveryAfterFiveMinutes: 'Breathing settled.',
    circuitDurationMinutes: 22,
    circuitRounds: completeGateTrialRounds(),
    restAfterWalkMinutes: 7,
    mindReflection: {
      body: 'The walk felt manageable.',
      character: 'I stayed patient.',
      family: 'I kept capacity for home.',
    },
    psalmAndPrayerCompleted: true,
    prayerMinutes: 12,
    faithReflection: 'I want to serve with patience.',
    rangersOath: 'I will show up with care.',
  };
}
