import type { TrialDefinition } from '../domain/models';

export const THREE_MILE_TRIAL_CONTENT_VERSION = 1;

/**
 * Source: docs/rangers-road-full-program-content/02_THE_ROAD.md. The phases and the data each
 * records follow the pack; the recording flow is built separately from this definition.
 */
export const threeMileTrialDefinition: TrialDefinition = {
  id: 'three-mile-trial',
  chapterId: 'chapter-2',
  contentVersion: THREE_MILE_TRIAL_CONTENT_VERSION,
  phases: [
    {
      id: 'three-mile-walk',
      title: '3 continuous miles',
      targetDistanceMiles: 3,
      instructions: ['Walk 3 continuous miles.'],
      requiredData: [
        'time',
        'RPE',
        'knee discomfort',
        'back discomfort',
        'recovery after 5 minutes',
      ],
      optionalData: ['splits', 'average heart rate'],
    },
    {
      id: 'suitcase-carry',
      title: '30-lb suitcase carry',
      instructions: [
        'Carry a 30-lb suitcase for 60 seconds in the right hand, then 60 seconds in the left.',
      ],
      requiredData: ['grip difficulty', 'core difficulty', 'posture difficulty'],
    },
    {
      id: 'stair-test',
      title: 'Three-flight stair test',
      instructions: ['Climb three flights of stairs at a steady pace, if appropriate.'],
      requiredData: ['breathlessness (1–10)'],
    },
    {
      id: 'leadership-reflection',
      title: 'Leadership reflection',
      reflectionPrompts: [
        'When someone in my family speaks, do they experience me as attentive?',
        'Name one behavior to change.',
      ],
    },
    {
      id: 'psalm-and-prayer',
      title: 'Psalm 121 + prayer',
      instructions: [
        'Read Psalm 121. Pray specifically for your spouse, each child, your future family, and your personal growth.',
      ],
    },
  ],
};
