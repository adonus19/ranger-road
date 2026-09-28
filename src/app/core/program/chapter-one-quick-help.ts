import { getChapterOneExerciseGuide } from './chapter-one-exercise-guides';

/** Short display steps segmented from the catalog's How instructions. */
const quickHelpSteps: Record<string, readonly string[]> = {
  'box-squat': [
    'Stand in front of a stable box or bench, feet about shoulder width.',
    'Brace and sit back and down under control.',
    'Lightly contact the box without collapsing or fully relaxing.',
    'Drive through the whole foot to stand.',
  ],
  'bench-press': [
    'Set your eyes roughly under the bar and plant your feet.',
    'Pull your shoulder blades gently back and down.',
    'Lower the bar under control toward your lower chest or sternum.',
    'Press up without bouncing.',
  ],
  'assisted-pull-up': [
    'Secure the assistance band and begin in an active hang.',
    'Pull your elbows down and back.',
    'Bring your chin toward or over the bar if comfortable.',
    'Lower slowly.',
  ],
  'supported-split-squat': [
    'Take a split stance and lightly hold the rack for balance.',
    'Lower vertically to a comfortable depth.',
    'Push through your front foot to rise.',
  ],
  'suitcase-carry': [
    'Hold one weight at your side.',
    'Stand tall.',
    'Walk slowly without leaning or twisting.',
  ],
  'side-plank': [
    'Place your elbow under your shoulder.',
    'Lift your hips into a straight line.',
    'Breathe normally.',
  ],
  'goblet-squat-to-box': [
    'Hold a dumbbell at your chest.',
    'Brace and sit down under control to the box.',
    'Lightly touch the box.',
    'Stand after lightly touching the box.',
  ],
  'step-up': [
    'Put your entire foot on a stable step.',
    'Drive through the top leg to stand.',
    'Control your descent.',
  ],
  'one-arm-db-row': [
    'Support one hand on a bench.',
    'Maintain a neutral spine.',
    'Pull the dumbbell toward your hip or ribcage and lower slowly.',
  ],
  'push-up': [
    'Start in a rigid plank with hands just outside your shoulders.',
    'Lower under control with your elbows angled back.',
    'Press up while maintaining your body line.',
  ],
  'glute-bridge': [
    'Lie on your back with knees bent.',
    'Brace lightly.',
    'Drive through your feet to raise your hips without over-arching your back.',
  ],
  'farmer-carry': [
    'Hold weights at both sides.',
    'Stand tall with your ribs controlled.',
    'Walk steadily.',
  ],
  'bird-dog': [
    'Start on hands and knees.',
    'Extend opposite arm and leg without twisting or arching.',
    'Pause, return, and alternate sides.',
  ],
  'cat-camel': [
    'Start on hands and knees.',
    'Slowly alternate spinal flexion and extension.',
    'Stay in a comfortable, gentle range.',
  ],
  'half-kneeling-hip-flexor-stretch': [
    'Begin in a half-kneeling position.',
    'Lightly tuck your pelvis.',
    'Shift forward until the front of the rear hip stretches.',
  ],
  'supported-squat-hold': [
    'Hold a rack or stable support.',
    'Descend only to a comfortable depth.',
    'Breathe while keeping your whole foot in contact with the floor.',
  ],
  'wall-slide': [
    'Place your back against a wall as tolerated.',
    'Slide your arms upward.',
    'Do not force the range.',
  ],
  'open-book-rotation': [
    'Lie on your side with knees bent.',
    'Rotate your top arm and chest open.',
    'Keep your knees together.',
  ],
};

export function getChapterOneQuickHelpSteps(exerciseId: string): string[] | undefined {
  if (!getChapterOneExerciseGuide(exerciseId)) return undefined;
  const steps = quickHelpSteps[exerciseId];
  return steps ? [...steps] : undefined;
}
