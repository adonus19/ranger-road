import type { ExerciseGuideContent } from './chapter-one-exercise-guides';

/** Chapter II's new exercises, verbatim from the exercise catalog. */
export const chapterTwoExerciseGuides: readonly ExerciseGuideContent[] = [
  {
    id: 'split-squat',
    name: 'Split Squat',
    purpose:
      "Build single-leg strength and balance without holding a rack. Chapter II's step-up from Supported Split Squat.",
    movementPattern: 'Lunge / split stance.',
    targets: 'Front-leg quads and glutes; hamstrings, adductors, and core secondarily.',
    how: 'Take a long split stance with feet hip-width apart, front foot flat and back heel lifted. Keep your torso tall and brace. Lower straight down under control until the back knee is just above the floor or as deep as feels comfortable. Push through the whole front foot to rise. Finish all reps on one side, then switch.',
    feel: 'Front quad and glute, with some stretch in the back hip.',
    avoid:
      'Front knee collapsing inward, leaning far forward, bouncing out of the bottom, a stance so short the front heel lifts.',
    painAwareOptions:
      'Shorten the range, touch a hand to a wall or rack for balance, or go back to Supported Split Squat.',
    stepUpFrom: 'Supported Split Squat.',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    purpose:
      "Build squat strength with a front-loaded counterbalance and no box to rest on. Chapter II's step-up from Goblet Squat to Box.",
    movementPattern: 'Squat.',
    targets: 'Quads, glutes, core.',
    how: 'Hold one dumbbell against your chest with both hands. Stand with feet about shoulder width. Brace, then sit down and back under control to a comfortable depth, keeping heels flat and chest tall. Drive through the whole foot to stand.',
    feel: 'Quads, glutes, upper trunk tension.',
    avoid:
      'Heels lifting, knees collapsing inward, rounding forward, dropping quickly into the bottom.',
    painAwareOptions: 'Squat to a box or bench again, shorten the depth, or lighten the dumbbell.',
    stepUpFrom: 'Goblet Squat to Box.',
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    purpose: 'Build calf and ankle capacity for walking/hiking.',
    how: 'Rise onto balls of feet under control, pause, lower slowly.',
    feel: 'Calves.',
    avoid: 'Bouncing.',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    purpose:
      'Optional light arm work that supports carrying and pulling. It is an add-on to Forge B and never replaces a main exercise.',
    movementPattern: 'Elbow flexion.',
    targets: 'Biceps and the forearm muscles that help grip.',
    how: 'Stand tall holding a light dumbbell in each hand with palms facing your thighs. Keep elbows beside your ribs. Bend the elbows to raise the weights until your thumbs approach your shoulders, then lower slowly. Keep the wrists straight.',
    feel: 'Front of the upper arm and forearm.',
    avoid:
      'Swinging the body, letting elbows drift forward, leaning back, going heavy enough that form breaks.',
    painAwareOptions:
      'Lighter weights, one arm at a time, sit on a bench, or skip it; it is optional.',
  },
  {
    id: 'supported-deep-squat',
    name: 'Supported Deep Squat',
    purpose:
      "Improve comfort in a deep squat position by holding it for time. Chapter II's step-up from Supported Squat Hold.",
    targets: 'Hips, ankles, and the whole lower body, with trunk position.',
    how: 'Hold a rack or stable support in front of you. Lower into the deepest squat that feels comfortable, with your whole foot on the floor and your chest up. Breathe slowly and stay relaxed for the hold, then stand up.',
    feel: 'Stretch through the hips, groin, and ankles; no sharp or pinching pain at the knee or hip.',
    avoid: 'Heels lifting, bouncing, forcing depth, holding your breath, pain at the knee or hip.',
    painAwareOptions:
      'Use more support, sit higher, shorten the hold, or go back to Supported Squat Hold.',
    stepUpFrom: 'Supported Squat Hold.',
  },
  {
    id: 'ankle-rock',
    name: 'Ankle Rock',
    purpose: 'Improve ankle dorsiflexion for squats and walking.',
    how: 'Keep heel down and gently drive knee forward over toes.',
    feel: 'Ankle/calf, not knee pain.',
  },
  {
    id: 'neutral-spine-hamstring-stretch',
    name: 'Neutral-Spine Hamstring Stretch',
    purpose: 'Improve posterior-chain flexibility without rounding low back aggressively.',
    how: 'Hinge from hips toward a straightened leg while keeping spine neutral.',
    feel: 'Back of thigh.',
  },
];

/** Short display steps segmented from each catalog How. */
export const chapterTwoQuickHelpSteps: Readonly<Record<string, readonly string[]>> = {
  'split-squat': [
    'Take a long split stance, feet hip-width apart, front foot flat and back heel lifted.',
    'Keep your torso tall and brace.',
    'Lower straight down until the back knee is just above the floor, or as deep as is comfortable.',
    'Push through the whole front foot to rise. Finish one side, then switch.',
  ],
  'goblet-squat': [
    'Hold one dumbbell against your chest with both hands, feet about shoulder width.',
    'Brace, then sit down and back under control to a comfortable depth.',
    'Keep your heels flat and chest tall.',
    'Drive through the whole foot to stand.',
  ],
  'calf-raise': [
    'Rise onto the balls of your feet under control.',
    'Pause at the top.',
    'Lower slowly.',
  ],
  'hammer-curl': [
    'Stand tall with a light dumbbell in each hand, palms facing your thighs.',
    'Keep your elbows beside your ribs and your wrists straight.',
    'Bend your elbows until your thumbs approach your shoulders.',
    'Lower slowly.',
  ],
  'supported-deep-squat': [
    'Hold a rack or stable support in front of you.',
    'Lower into the deepest squat that feels comfortable, whole foot on the floor, chest up.',
    'Breathe slowly and stay relaxed for the hold.',
    'Stand up.',
  ],
  'ankle-rock': [
    'Keep your heel down.',
    'Gently drive your knee forward over your toes.',
    'Return and repeat.',
  ],
  'neutral-spine-hamstring-stretch': [
    'Straighten one leg.',
    'Hinge from your hips toward it.',
    'Keep your spine neutral.',
  ],
};
