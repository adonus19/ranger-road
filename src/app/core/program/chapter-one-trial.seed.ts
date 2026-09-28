import type { TrialDefinition } from '../domain/models';

/** Revision 1 was the five-phase outline without the detailed program prescription. */
export const GATE_TRIAL_CONTENT_VERSION = 2;

/** Source: docs/rangers-road-full-program-content/01_THE_MUSTER.md. */
export const gateTrialDefinition: TrialDefinition = {
  id: 'gate-trial',
  chapterId: 'chapter-1',
  contentVersion: GATE_TRIAL_CONTENT_VERSION,
  phases: [
    {
      id: 'brisk-walk',
      title: '2-mile brisk walk',
      targetDistanceMiles: 2,
      instructions: ['Walk 2 miles at a brisk pace.'],
      requiredData: [
        'time',
        'RPE',
        'knee response',
        'back response',
        'recovery after 5 minutes',
      ],
      optionalData: ['average heart rate'],
    },
    {
      id: 'controlled-circuit',
      title: '3-round controlled circuit',
      instructions: [
        'Rest 5–10 minutes after the walk.',
        'Complete 3 controlled rounds and record the completion time. Do not race.',
      ],
      requiredData: ['completion time', 'completed repetitions and holds for each round'],
      circuit: {
        rounds: 3,
        movements: [
          { exerciseId: 'box-squat', reps: 10 },
          { exerciseId: 'push-up', reps: 8 },
          { exerciseId: 'assisted-pull-up', reps: 5 },
          { exerciseId: 'step-up', reps: 8, perSide: true },
          { exerciseId: 'suitcase-carry', durationSeconds: 30, perSide: true },
          { exerciseId: 'side-plank', durationSeconds: 20, perSide: true },
        ],
      },
    },
    {
      id: 'mind-reflection',
      title: 'Mind reflection',
      reflectionPrompts: [
        'One thing learned about your body',
        'One thing learned about your character',
        'One thing learned about your family',
      ],
    },
    {
      id: 'psalm-and-prayer',
      title: 'Psalm 121 + prayer',
      instructions: ['Read Psalm 121. Spend 10–15 quiet minutes in prayer.'],
      reflectionPrompts: ['What kind of husband and father am I trying to become?'],
    },
    {
      id: 'rangers-oath',
      title: "Write personal Ranger's Oath",
      instructions: [
        'Write a short personal oath based on strength for service, keeping your word, stewardship, wisdom, faith, and family leadership.',
      ],
    },
  ],
};
