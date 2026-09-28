# Reading and Fieldcraft

## Reading Philosophy

Do not overwhelm the user with book lists.

Use:
- one primary book at a time
- short assignments
- 10-minute reading blocks
- one useful reflection prompt

Potential early books:
- Habits of the Household — Justin Whitmel Earley
- The Ruthless Elimination of Hurry — John Mark Comer
- The Motive — Patrick Lencioni

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

```ts
interface FieldCard {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  mission?: string;
  safetyNotes?: string[];
  relatedSkills: string[];
}
```
