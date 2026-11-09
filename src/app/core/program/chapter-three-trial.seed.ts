import type { TrialDefinition } from '../domain/models';

export const HIGH_COUNTRY_TRIAL_CONTENT_VERSION = 1;

/**
 * Source: docs/rangers-road-full-program-content/03_THE_HIGH_COUNTRY.md (High Country Trial).
 * The parts as the plan shows them. The recording flow, the hike and circuit on separate days,
 * weather postponement and the winter stand-in are built with the trial itself (ticket 04).
 */
export const highCountryTrialDefinition: TrialDefinition = {
  id: 'high-country-trial',
  chapterId: 'chapter-3',
  contentVersion: HIGH_COUNTRY_TRIAL_CONTENT_VERSION,
  phases: [
    {
      id: 'pre-start-plan',
      title: 'Pre-start plan',
      instructions: [
        'Before you set out, write down the direction, the major junctions, the expected distance and elevation, and your turnaround point and turnaround time.',
      ],
      requiredData: [
        'direction',
        'major junctions',
        'expected distance',
        'expected elevation',
        'turnaround point',
        'turnaround time',
      ],
    },
    {
      id: 'hike',
      title: 'The hike',
      instructions: [
        'Hike a real, well-maintained mountain trail at a steady effort. Pick a clear-weather day.',
      ],
      requiredData: ['time', 'distance', 'RPE', 'knee response', 'back response'],
      optionalData: ['elevation gain, if known'],
      safetyNotes: ['A Green day with no pain at 3 or more.'],
    },
    {
      id: 'location-estimate',
      title: 'Location estimate',
      instructions: ['At least once, estimate where you are before checking your phone.'],
    },
    {
      id: 'high-point',
      title: 'High point',
      instructions: ['Spend 5 quiet minutes at the highest practical point.'],
      reflectionPrompts: ['What have I been climbing toward that is actually worth reaching?'],
    },
    {
      id: 'circuit',
      title: 'The circuit',
      instructions: [
        'On a later Green day, two rounds: 10 step-ups per leg, 10 push-ups, 5 assisted pull-ups, a 45-second farmer carry, and a 30-second side plank per side.',
        'Within 48 hours of the hike is the target, not a rule.',
      ],
    },
  ],
};
