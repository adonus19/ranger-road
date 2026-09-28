# App Content Mapping

These documents should be transformed into structured seed content rather than hard-coded UI.

## Suggested Content Hierarchy

Campaign
-> Chapter
-> Week
-> Day
-> Mission(s)

In Chapter I, Week 0 means the short Day 1–Sunday lead-in (only when Day 1 is not Monday). It uses Week 1's matching weekday content, then Weeks 1–4 run as complete Monday–Sunday weeks. Give lead-in mission definitions separate IDs from full Week 1; historical attempts keep their original definition snapshots when this schedule changes.

## Daily Mission Types

- `forge`
- `road`
- `restoration`
- `scripture`
- `reflection`
- `reading`
- `leadership`
- `hearth`
- `fieldcraft`
- `familyQuest`
- `trialPrep`
- `trial`

## Forge Prescription

Each exercise prescription should store:
- exerciseId
- sets
- reps or duration
- load strategy
- RPE ceiling
- progression rule
- substitution IDs
- chapter/week notes

## Scripture Mission

Store:
- reference only
- prompt
- theme
- optional prayer cue

Do not embed a proprietary Bible translation.

## Reflection Mission

Store:
- prompt
- response type: text/voice
- optional chapter milestone flag

## Trial

Represent as ordered phases:
- instructions
- required data
- optional data
- completion rules
- safety notes
- reflection prompts

## Exercise Media

For MVP:
- start frame
- 1–3 transition frames
- end frame
- front body map
- back body map

No video dependency.

## Important Implementation Rule

Completed historical mission instances should snapshot enough of the prescription to remain readable even if future program definitions change.
