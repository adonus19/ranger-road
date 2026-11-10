# Reading and Fieldcraft

## Reading Philosophy

Do not overwhelm the user with book lists.

Use:
- one primary book at a time
- short assignments
- 10-minute reading blocks
- one useful reflection prompt

The campaign reading plan (one suggested book per chapter, tied to that chapter's leadership theme) is in [Field Manual Content](rangers-road-full-program-content/FIELD_MANUAL.md). *Habits of the Household* by Justin Whitmel Earley is the Chapter I book. When a book is finished, the next one on the list begins; the chapter beside each title is where it fits best, not a deadline.

Book completion is not tied to rigid monthly deadlines.

## Fieldcraft Philosophy

Teach small concepts and apply them quickly.

Use short Field Cards.

## Fieldcraft Sequence

### Chapter I
- tool inspection
- basic knots

### Chapter II
Navigation I:
- cardinal direction
- trail maps
- landmarks
- basic distance awareness

### Chapter III
Navigation II:
- contours
- elevation
- ridges/valleys
- route time
- weather
- turnaround criteria

A written field card with no pictures; a contour diagram may be added later, only once verified. Field mission on Week 11's Saturday rehearsal: predict the elevation gain and the turnaround point from the map, then check afterward. The optional daughter quest is on the same walk.

### Chapter IV
Load management:
- pack organization
- hydration
- footwear
- blister prevention

### Chapter V
Tool competence:
- axe/maul safety
- work zone
- fatigue awareness
- maintenance

### Chapter VI
First Aid I:
- scene safety
- call for help
- cuts/bleeding
- sprains
- heat illness
- dehydration
- emergency recognition

### Chapter VII
Integration:
- Navigation III
- First Aid I review
- Tool Competence
- Improvisation

### Chapter VIII
Situational Awareness:
- exits
- people
- terrain
- weather
- hazards
- family position

### Chapter IX
Demonstration:
- navigation
- first aid
- practical skill

## Field Card Shape

A card teaches one practical skill. Tool cards use titled sections of checks; knot cards use numbered steps with a way to check the result. Chapter I's, Chapter II's (Navigation I) and Chapter III's (Navigation II, written only) approved cards are in [Field Manual Content](rangers-road-full-program-content/FIELD_MANUAL.md) and in `src/app/core/program/field-manual.seed.ts`.

```ts
interface FieldCard {
  id: string;
  title: string;
  skill: 'tool' | 'knot';
  week: number;
  when: string;
  summary: string;
  mission?: string;
  useFor?: string;
  avoid?: string;
  steps?: string[];
  memoryAid?: string;
  check?: string;
  sections?: { heading: string; items: string[] }[];
  closing?: string;
  /**
   * Checked step pictures, one panel per written step, two per row at 1004px wide,
   * added only after they are checked against the real knot or tool.
   * `height` is 1548 for four steps (the default) and 2316 for six.
   */
  sequence?: { src: string; alt: string; height?: number };
  relatedSkills: string[];
}
```

When a week practices several cards together (Chapter I Week 3's three knots), a practice page lists them with the practice plan, the equipment, and a safety line.
