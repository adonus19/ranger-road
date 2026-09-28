import type { SquatDepth } from '../domain/models';

/** How to take each check-in measure. Documented in docs/RANGERS_ROAD_PROGRAM.md, Measurements. */
export const CHECK_IN_HELP = {
  restingHeartRate: 'Sit quietly for 5 minutes, then count for 60 seconds.',
  bloodPressure: 'From a home cuff, if you have one.',
  tests: 'Stop any test at the first sign of rising pain.',
  testsHeld: 'Your readiness today is Red, so the tests wait for another day.',
  pushups: 'One set. Stop at the first rep with broken form.',
  pullupAssistance: 'The band you used for clean reps, or none.',
  squatDepth: 'How low you can sit back with good form and no pain.',
  toeReach: 'Stand tall, knees straight, and reach down slowly. Measure fingertips to floor; 0 if you touch it.',
  energy: '1 is very low; 5 is high.',
  capability: 'How capable you feel for what your days ask of you. 1 is not at all; 5 is fully.',
} as const;

export const SQUAT_DEPTH_CHOICES: readonly { value: SquatDepth; label: string }[] = [
  { value: 'above-parallel', label: 'Above parallel' },
  { value: 'parallel', label: 'Parallel' },
  { value: 'below-parallel', label: 'Below parallel' },
];
