# Exercise Library Specification

## Goal

Every named exercise must be understandable without assuming prior knowledge.

The active workout should never force the user to leave the app to figure out a movement.

## Each Exercise Must Support

- name
- one-sentence purpose
- category
- movement pattern
- required equipment
- difficulty
- primary targets
- secondary targets
- mobility/stability emphasis
- setup
- execution steps
- engagement cues
- common mistakes
- pain/modification guidance
- regressions
- progressions
- Ranger cue
- image sequence assets
- muscle map asset

## MVP Media

No video requirement.

Use generated visual sequences:
- start
- midpoint
- end
- optional arrows
- consistent model
- consistent camera angle
- consistent art direction

Also include:
- front/back body map from the neck down, with no head or face
- primary muscles highlighted
- secondary muscles distinguished

The headless map keeps attention on the trained movement. If the catalog does not name a target muscle, leave the map unhighlighted rather than guessing.

## Quick Help

Displayed inside workout:
- purpose
- 3–5 execution steps
- where to feel it
- top mistakes
- looped image sequence

## Full Guide

Adds:
- full setup
- detailed target list
- regressions/progressions
- pain substitutions
- muscle map
- extended notes

## Initial Exercises

- box squat
- bench press
- assisted pull-up
- supported split squat
- suitcase carry
- side plank
- goblet squat to box
- split squat, goblet squat, supported deep squat (Chapter II step-ups; each its own exercise with its own guide and images)
- hammer curl (optional, Chapter II Forge B)
- step-up
- one-arm DB row
- push-up
- glute bridge
- farmer carry
- bird dog
- calf raise
- single-leg balance
- slow step-down
- reverse lunge
- front-hold carry
- bear-hug carry
- elevated light hinge pattern
- cat-camel
- wall slide
- half-kneeling hip-flexor stretch
- open-book rotation
- ankle rock
- hamstring stretch
- supported squat hold

## Proposed Data Shape

```ts
interface ExerciseDefinition {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  category: ExerciseCategory;
  movementPattern: string;
  equipment: string[];
  difficulty: 'intro' | 'basic' | 'intermediate' | 'advanced';
  primaryTargets: MuscleTarget[];
  secondaryTargets: MuscleTarget[];
  mobilityTargets?: string[];
  setupSteps: string[];
  executionSteps: string[];
  engagementCues: string[];
  commonMistakes: string[];
  painGuidance: PainGuidance[];
  regressions: ExerciseReference[];
  progressions: ExerciseReference[];
  rangerCue?: string;
  media: {
    startImage?: string;
    midImages?: string[];
    endImage?: string;
    muscleMapFront?: string;
    muscleMapBack?: string;
  };
}
```
