/** Written guide content from the exercise catalog; media assets are authored separately. */
export const CHAPTER_ONE_EXERCISE_GUIDE_SOURCE =
  'docs/rangers-road-full-program-content/EXERCISE_CATALOG.md';

export interface ExerciseGuideContent {
  id: string;
  name: string;
  purpose: string;
  movementPattern?: string;
  targets?: string;
  how: string;
  feel?: string;
  avoid?: string;
  painAwareOptions?: string;
  progression?: string;
  safety?: string;
  rule?: string;
  stopOrSubstitute?: string;
  /** The easier exercise this one steps up from. */
  stepUpFrom?: string;
}

const chapterOneExerciseGuides: ExerciseGuideContent[] = [
  {
    id: 'box-squat',
    name: 'Box Squat',
    purpose:
      'Build lower-body strength and controlled squat mechanics while allowing depth to be limited.',
    movementPattern: 'Squat.',
    targets: 'Quads and glutes primarily; adductors and trunk stabilizers secondarily.',
    how: 'Stand in front of a stable box/bench, feet about shoulder width. Brace. Sit back and down under control until you lightly contact the box. Do not collapse or fully relax. Drive through the whole foot to stand.',
    feel: 'Quads, glutes, and trunk bracing.',
    avoid:
      'Crashing onto box, knees collapsing inward, weight rolling onto toes, losing trunk tension.',
    painAwareOptions: 'Raise box height, reduce load, use bodyweight.',
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    purpose: 'Build horizontal pressing strength.',
    movementPattern: 'Horizontal push.',
    targets: 'Chest and triceps primarily; front delts and upper-back stabilizers secondarily.',
    how: 'Eyes roughly under bar. Plant feet. Pull shoulder blades gently back/down. Lower bar under control toward lower chest/sternum. Press up without bouncing.',
    feel: 'Chest, triceps, stable upper back.',
    avoid: 'Excessive elbow flare, bar drifting toward neck, bouncing, loose feet/shoulders.',
    painAwareOptions:
      'Reduce load/range, slightly narrow grip, substitute push-up or dumbbell floor press.',
  },
  {
    id: 'assisted-pull-up',
    name: 'Assisted Pull-Up',
    purpose: 'Develop vertical pulling strength toward unassisted pull-ups.',
    targets: 'Lats and upper back; biceps, grip, and core.',
    how: 'Secure assistance band. Begin in an active hang. Pull elbows down and back. Bring chin toward/over bar if comfortable. Lower slowly.',
    feel: 'Lats, upper back, biceps, grip.',
    avoid: 'Swinging, shrugging, crashing down.',
    progression: 'Reduce band assistance after clean sets at top of rep range.',
  },
  {
    id: 'supported-split-squat',
    name: 'Supported Split Squat',
    purpose: 'Build unilateral leg strength and balance.',
    targets: 'Front-leg quads and glutes; hamstrings/adductors/core secondarily.',
    how: 'Split stance while lightly holding rack for balance. Lower vertically to comfortable depth. Push through front foot to rise.',
    feel: 'Front quad and glute.',
    avoid: 'Front knee collapsing inward, excessive forward lean, bouncing.',
    painAwareOptions: 'Shorten range, use more support, static split-stance hold.',
  },
  {
    id: 'suitcase-carry',
    name: 'Suitcase Carry',
    purpose: 'Build grip and anti-side-bend trunk strength.',
    targets: 'Obliques, grip, upper back, glutes.',
    how: 'Hold one weight at side. Stand tall and walk slowly without leaning or twisting.',
    feel: 'Side of trunk, grip, upper back, hips.',
    avoid: 'Leaning away from load, shrugging, rushing.',
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    purpose: 'Build lateral trunk stability.',
    targets: 'Obliques, glute medius, shoulder stabilizers.',
    how: 'Elbow under shoulder. Lift hips into straight line and breathe normally.',
    feel: 'Side of trunk and hip.',
    painAwareOptions: 'Bend knees; shorten hold.',
  },
  {
    id: 'goblet-squat-to-box',
    name: 'Goblet Squat to Box',
    purpose: 'Reinforce squat pattern with front-loaded counterbalance.',
    targets: 'Quads, glutes, core.',
    how: 'Hold dumbbell at chest. Brace, sit down under control to box, lightly touch, stand.',
    feel: 'Quads, glutes, upper trunk tension.',
  },
  {
    id: 'step-up',
    name: 'Step-Up',
    purpose: 'Build climbing and hiking strength.',
    targets: 'Quads and glutes primarily; calves/core secondarily.',
    how: 'Entire foot on stable step. Drive through top leg to stand. Control descent.',
    feel: 'Leg on the step.',
    avoid: 'Jumping off trailing leg, dropping quickly, step too high.',
  },
  {
    id: 'one-arm-db-row',
    name: 'One-Arm Dumbbell Row',
    purpose: 'Build upper-back pulling strength and posture.',
    targets: 'Lats/mid-back; biceps, rear delts, grip.',
    how: 'Support one hand on bench. Maintain neutral spine. Pull dumbbell toward hip/ribcage and lower slowly.',
    feel: 'Lat and mid-back.',
    avoid: 'Torso rotation and jerking.',
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    purpose: 'Build practical pressing and trunk strength.',
    targets: 'Chest/triceps; shoulders/core.',
    how: 'Rigid plank. Hands just outside shoulders. Lower under control with elbows angled back. Press while maintaining body line.',
    feel: 'Chest, triceps, core.',
    avoid: 'Sagging hips, craning neck, excessive elbow flare.',
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    purpose: 'Build hip extension and glute activation.',
    targets: 'Glutes primarily; hamstrings/core secondarily.',
    how: 'Lie on back, knees bent. Brace lightly. Drive through feet to raise hips without over-arching back.',
    feel: 'Glutes, some hamstrings.',
    avoid: 'Feeling the movement mainly in lower back.',
  },
  {
    id: 'farmer-carry',
    name: 'Farmer Carry',
    purpose: 'Build full-body carrying capacity, grip, and posture.',
    targets: 'Grip, traps, trunk; glutes/legs.',
    how: 'Hold weights at both sides. Stand tall, ribs controlled, walk steadily.',
    feel: 'Grip, upper back, trunk, whole-body tension.',
  },
  {
    id: 'bird-dog',
    name: 'Bird Dog',
    purpose: 'Build trunk stability and cross-body coordination.',
    targets: 'Deep trunk stabilizers, glutes, shoulder stabilizers.',
    how: 'Hands/knees. Extend opposite arm and leg without twisting or arching. Pause, return, alternate.',
    feel: 'Mild core and glute engagement rather than a large burn.',
  },
  {
    id: 'cat-camel',
    name: 'Cat-Camel',
    purpose: 'Gentle spinal movement and awareness.',
    how: 'On hands/knees, slowly alternate comfortable spinal flexion and extension.',
    rule: 'Gentle range only; not a forceful stretch.',
  },
  {
    id: 'half-kneeling-hip-flexor-stretch',
    name: 'Half-Kneeling Hip-Flexor Stretch',
    purpose: 'Improve hip-extension mobility.',
    how: 'Half kneel. Lightly tuck pelvis and shift forward until front of rear hip stretches.',
    feel: 'Front of rear hip, not lower back.',
  },
  {
    id: 'supported-squat-hold',
    name: 'Supported Squat Hold',
    purpose: 'Gradually improve squat-position comfort/mobility.',
    how: 'Hold rack or stable support and descend only to comfortable depth. Breathe while maintaining whole-foot contact.',
  },
  {
    id: 'wall-slide',
    name: 'Wall Slide',
    purpose: 'Encourage shoulder-blade control and overhead mobility.',
    how: 'Back against wall as tolerated. Slide arms upward without forcing range.',
    feel: 'Upper back/shoulder movement, not sharp shoulder pain.',
  },
  {
    id: 'open-book-rotation',
    name: 'Open-Book Rotation',
    purpose: 'Thoracic rotation mobility.',
    how: 'Lie on side with knees bent. Rotate top arm/chest open while keeping knees together.',
    feel: 'Mid/upper-back rotation.',
  },
];

const guidesById = new Map(chapterOneExerciseGuides.map((guide) => [guide.id, guide]));

export function getChapterOneExerciseGuide(id: string): ExerciseGuideContent | undefined {
  const guide = guidesById.get(id);
  return guide ? structuredClone(guide) : undefined;
}

export function listChapterOneExerciseGuides(): ExerciseGuideContent[] {
  return structuredClone(chapterOneExerciseGuides);
}
