# Data Model

## Core Entities

### UserProfile

- id
- name
- baseline date
- age
- height
- target weight
- target waist
- goals
- equipment
- training constraints
- preferences

### Campaign

- id
- startDate
- currentChapterId (the chapter the campaign began in, always Chapter I; today's chapter is derived, see Campaign Position)
- status
- trialTargetDate? (planning date; Chapter I uses the Gate Trial's first day, the Monday after Week 4. From then it can be taken any day, whatever an older saved date says)
- scheduleVersion? (Chapter I version 2 adds a short lead-in before four complete Monday–Sunday weeks; version 3 used Week 4 Saturday as its generated planning date; version 4 moves the generated target for each older version—Day 1 + 27, the closing Sunday, or Week 4 Saturday—to the first Monday Gate Trial attempt. A separately chosen date stays as saved; older campaigns may lack this field.)

### Campaign Position (derived, never stored)

Today's chapter, week, and weekday come from Day 1 and the saved trial results, so a restored copy always lands in the same place. Chapter I starts on Day 1, with a short lead-in when Day 1 is not a Monday. Each later chapter starts the day after its predecessor's trial pass if that was a Monday, otherwise the following Monday. Its first week is the Monday–Sunday week that holds that first day, so after a Monday pass the trial day counts as the new chapter's first Monday. Campaign week numbers run across chapters (Chapter II is Weeks 5–8). After a chapter's last week, its trial can be taken any day until its pass (see Any-day trials below). Days that are not a trial repeat the last week. A day is a trial day when a trial draft or kept attempt is dated that day, or the pass is; that is read from the saved drafts, attempts and results, never stored. A chapter whose orders are not in the app yet shows the previous chapter as complete from its first day.

Mission IDs name the chapter and week (`chapter-2-week-5-day-3-weekly`), the chapter and trial on a day the trial is taken (`chapter-2-three-mile-trial-attempt-day-1-weekly`; older records from Monday and Thursday attempt days keep the same form), or Chapter I's lead-in (`chapter-1-lead-in-day-4-weekly`). Chapter I's IDs are unchanged by the multi-chapter schedule.

### ChapterProgram (seed content, not stored)

A chapter is in the app once its program is registered in order: its ChapterDefinition and TrialDefinition, the trial's name and page, whether it leads in, its dated weeks, its attempt-day content, its workouts and restoration, and each workout's week plan (instructions, deload set guide, and whether the session is saved as reduced). A day's documented alternatives, such as Friday restoration or nonexertional skill practice, and its Red-day wording live in the dated content, not in screen code.

### ChapterDefinition

- id
- number
- name
- theme
- weeks
- objectives
- trialId

### MissionDefinition

- id
- chapterId
- week (0 for a short Chapter I lead-in, 1–4 for full Monday–Sunday weeks)
- day
- missionType
- title
- requiresReadiness? (fieldcraft defaults to a same-day training readiness check; set `false` only for an explicitly nonexertional skill such as Chapter I tool inspection or basic knots. Strength, conditioning, restoration, and trials always require readiness regardless of this value.)
- estimatedMinutes
- required
- content references
- scriptureReference? (dated Chapter I Morning Watch; reference only, without Bible translation text)
- reflectionPrompt? (dated reflection, when the program supplies one)
- activityDetails?, readingMinutes?, readingBookTitle?, optionalFamilyQuest? (dated program content; the Week 1 book title is kept in saved mission snapshots)
- intervals? (an interval walk as written steps: `warmupMinutes?`, `rounds`, `briskSeconds`, `easySeconds`, `cooldownMinutes?`, and from Chapter III `workLabel?` such as "Step-ups" and `finisher?`, the line shown when the optional timer ends)
- exerciseGuideIds? (exercises a written order names, such as the Tuesday climb's step-ups and slow step-downs, linked to their guides)
- plannedTrialId? (a plan shown in Today's Mission; completion is stored as a TrialResult)

Mission types:

- strength
- conditioning
- restoration
- scripture
- prayer
- reflection
- leadership
- fieldcraft
- reading
- familyQuest
- trial

### MissionInstance

- id
- definitionId
- date
- status
- reduced
- notes
- startedAt
- completedAt
- definitionSnapshot? (keeps completed history independent of later content changes)

### WorkoutDefinition

- id
- title
- contentVersion? (prescription revision retained in a completed session snapshot)
- warmup[]?
- exercises[]
- finish[]?, optionalFinish[]?
- notes[]?

### ExercisePrescription

- exerciseId
- sets
- reps
- duration
- durationSeconds? (explicit seconds for holds and carries)
- perSide?
- loadStrategy
- rpeTarget?, rpeCeiling?
- progressionRule?, substitutionIds?
- notes

Chapter I Forge A, Forge B, and restoration definitions use the exact sets, reps, holds, and warm-ups in the [Muster content pack](rangers-road-full-program-content/01_THE_MUSTER.md). Week 4 deload instructions remain attached to dated missions; a future workout player must show and honor them before it starts a session.

### WorkoutSession

- id
- date
- workoutDefinitionId
- readinessId
- exerciseResults[]
- sessionRpe
- notes
- definitionSnapshot? (keeps completed history independent of later content changes)
- startedAt?, completedAt?, outcome? (`completed` or `stopped`; older local rows may lack these fields)
- reduced?, warmupComplete?, finishComplete?, optionalFinishComplete?
- exerciseOrder? (the order the person worked the exercises in, as indices into `definitionSnapshot.exercises`; older rows lack it and read as the written order)
- sessionInstructions? (a copy of dated source instructions, such as the Week 4 deload note)

New completed and stopped sessions are immutable, append-only snapshots. A stopped session retains partial sets and pain history without counting as a completed exposure for previous-load context. Last-time sets, the progression hint, the comparison on save, the exercise record and the chapter summary are all derived from these saved sessions and are never stored. They are displayed for reference only; the app does not apply or require the next load. A completed, non-substituted session including the exercise is an exposure, in any chapter; a session saved as `reduced` is not a full session. Why it was reduced is derived, not stored: Yellow readiness comes from the session's saved readiness check, pain from its pain events on that exercise, and a planned deload from the chapter's week plan for the session's date. Any other reduced session (an accepted make-up reduction, or sets the person skipped) is treated as reduced for a non-blocking reason.

### WorkoutDraft

- id, date, workoutDefinitionId, readinessId
- startedAt, updatedAt
- reduced, warmupComplete, finishComplete, optionalFinishComplete
- currentExerciseIndex, currentSetIndex, restStartedAt? (these stay indices into `definitionSnapshot.exercises`, whatever order is shown)
- exerciseOrder? (the displayed order as indices into the snapshot; absent means the written order)
- definitionSnapshot, exerciseResults[], sessionInstructions?, sessionRpe?, notes?

Only one workout draft may be active. It is updated as sets are recorded, can resume at its current set after a reload, and is removed in the same transaction that appends its completed or stopped session. Starting and completing a workout validates the latest same-day readiness check. A newer Red check blocks further Forge sets and Forge completion, while ending as stopped preserves the partial record. Each chapter's Restoration (`chapter-<n>-restoration`) remains available on Red when appropriate. Yellow or Red readiness marks a permitted draft reduced. Pain rated 5 or higher during Forge also blocks further set saves and completed outcome; the pain record itself can still be saved immediately, and the partial session can be stopped. A new check after the last draft save must be reviewed before completion. Each planned set must be explicitly marked done or skipped before a completed outcome; a stopped session may retain unmarked sets.

### ExerciseResult

- exerciseId
- sets[] (each set: reps?, duration?, load?, rpe?, completed?, assistance?)
- painEvents[]
- substitutionId?
- swappedFrom? (the written exercise, when a readiness swap replaced it)
- stanceFrom? (the written exercise, when the person chose the prescription's other stance)
- modificationNotes? (the person's own description of a change; it does not create a new prescribed substitution)

Each set may carry `assistance?` (pounds of band help on an assisted pull-up, 0 for no band, stacked bands added together). It is separate from `load`. Sets saved before it existed simply lack it. For assisted pull-ups, less assistance is the better set, with more reps breaking a tie.

### ReadinessCheck

- id
- date
- checkedAt
- sleepHours
- poorSleep (self-reported; no fixed hours threshold)
- energy
- backPain
- shoulderPain
- neckPain
- redFlags: significant symptom increase, new neurological/radiating symptoms, illness, other concerning symptoms
- status

### PainEvent

- id? (required on new workout-linked events; older rows may lack it)
- timestamp
- bodyArea
- severity
- exerciseId?
- actionTaken
- workoutSessionId? (links new standalone pain rows to a draft/session; older rows may lack it)

New workout pain events are appended immediately in their own historical store and copied into the active draft in the same transaction. They remain available if the session stops; a later draft update cannot remove them.

Gate Trial pain uses the same append-only store, with `trialAttemptId` and `trialPhaseId` linking it to the active draft and any stopped attempt. Its response is `continue`, `reduce`, `substitute`, or `end-exercise`. It is saved immediately and cannot be removed by a later draft autosave.

### MeasurementEntry

- id
- kind: check-in | body | tests (body: weight and/or waist on any day; tests: the four tests added after a Red day held them)
- date
- recordedAt
- weight (pounds; needed in a check-in)
- waist (inches; needed in a check-in)
- restingHeartRate (beats per minute; needed in a check-in)
- bloodPressure? { systolic, diastolic } (mmHg)
- pushups? (one set)
- pullupAssistance? (older entries: the band used as text, or "none")
- pullupAssistanceLb? (new entries: pounds of band help, 0 to 150, 0 for no band)
- pullupBandNote? (optional note on the band, up to 60 characters)
- squatDepth? above-parallel | parallel | below-parallel
- toeReach? (inches from fingertips to floor; 0 when touching)
- energy? (1–5)
- capabilityRating? (perceived capability, 1–5)
- testsHeld? (true when a Red readiness day held the four tests)
- readinessSummary? { from, to, checks, averageSleepHours?, averageBackPain?, averageShoulderPain?, averageNeckPain? } (copied from the readiness checks when a check-in is saved)

Measurement entries are append-only; held tests are added as a new `tests` entry, never by editing the check-in.

### RoadSession

- date (the completed session's local date)
- createdAt? (when the session was saved; older local records may not have this timestamp)
- distance (miles)
- duration (minutes)
- elevationGain? (feet)
- ruckLoad? (pounds)
- terrain (free text)
- rpe (1–10)
- avgHeartRate? (beats per minute)
- painBefore? (0–10)
- painAfter? (0–10)

### CarryResult

- type
- load
- duration
- distance?
- side?

### JournalEntry

- date
- type
- prompt
- response
- voiceAsset?

### ScriptureAssignment

- reference
- prompt
- chapterId
- week
- day

### ReadingAssignment

- bookId
- assignment
- minutes?
- prompt?

### FieldCard

- id
- title
- summary
- keyPoints
- mission
- safetyNotes

### SkillCompetency

- skillId
- status: learned|practiced|demonstrated
- date
- notes

### TrialDefinition

- id
- chapterId
- contentVersion? (new detailed Gate Trial definitions use a revision; older snapshots may lack one)
- phases[] (ordered instructions, required and optional data, safety notes, reflection prompts, and the circuit prescription where applicable)

### TrialResult

- id
- trialId
- date
- phaseResults (new completed Gate Trial results contain all five phases in order: Road, Gate Circuit, Mind, Spirit, Oath)
  - Road: 2-mile walk time, RPE, knee and back response, recovery after 5 minutes; average heart rate optional
  - Gate Circuit: completion time, at least 5 minutes of rest after the walk, completed reps or holds for every prescribed station in each of three rounds, and `effortEndedAt` when the person advances from the circuit to Mind
  - Mind: the three written responses about body, character, and family
  - Spirit: Psalm 121 and prayer confirmation, at least 10 minutes of prayer, and the husband/father reflection
  - Oath: the written personal Ranger's Oath
- Rest or prayer may last longer than the pack's suggested 5–10 and 10–15 minutes when needed for safety. Record actual durations on new completed results.
- reflection (for the Gate Trial, the mind reflection)
- photoAsset? (legacy and optional; no trial asks for a photo from 2026-11-09, and older rows read unchanged)
- postMissionFunction? (in the person's words, not a score; omit from an immediate completion and assess 60–120 minutes after the effort as described in `NUTRITION_AND_RECOVERY.md`)
- readinessId? (required on newly saved completed physical trials; optional only for older local rows)
- recordedAt? (required on new results; older local rows may lack it)
- definitionSnapshot? (a copy of the completed trial's definition, required on new results; older local rows may lack it)

New completed results are immutable. The later post-mission function answer is a separate linked follow-up record, so the completed result is never rewritten.

### PostMissionFunction

- id, trialId, trialResultId
- effortEndedAt (copied from the linked trial's Gate Circuit timestamp; older trials fall back to their final save time)
- recordedAt, minutesAfter (elapsed from physical effort)
- energy, soreness, irritability, helpAtHome, familyLife (one plain-language choice each)
- note? (optional, up to 500 characters)

The check opens 60 minutes after physical effort and suggests 60–120 minutes as the assessment window. It is saved once for a completed result in the append-only `postMissionFunctions` store. Keep offers a reminder for 12 hours after the physical effort; Road history continues to offer the check afterward. A legacy result with its old inline `postMissionFunction` remains readable and does not receive a second reminder.

### TrialDraft

- id, trialId, date, readinessId (the Green check used to start)
- startedAt, updatedAt, revision (rejects stale writes from another tab)
- currentPhaseIndex (Road through Oath, in documented order)
- definitionSnapshot, phaseResults[] (five ordered slots; partial data and individual circuit sides can be saved)
- painEvents[] (copies of immediately appended trial-linked pain history)
- photoAsset? (optional attachment reference carried into a completed or stopped snapshot)

Only one trial draft may be active. Starting requires that the trial's chapter has ended (any day after its last week; the Gate Trial included from 2026-11-09), no completed result for the trial yet, and the latest same-day Green readiness check. Draft autosave keeps partial observations even if readiness later turns Yellow or Red. Advancing past either physical phase and saving a completed result requires the latest same-day Green check. Pain at 3 or more, or a reduce, substitute, or end-exercise response, prevents that attempt from being recorded as a full completed Gate Trial. The person can stop and retain the partial attempt.

### TrialAttempt

- stopped outcome, stoppedAt
- the trial draft's identifying fields, definition snapshot, current phase, partial phase results, and pain history

Stopped attempts are immutable, append-only records in `trialAttempts`. They do not count as completed trial results. Stopping and removing the active draft happen in one transaction.

### HearthMission

- id
- title
- description
- startDate
- endDate
- status
- reflection

### CapabilityGoal

- id
- title
- contributors[]
- milestones[]

### CapabilityProgress

- capabilityGoalId
- milestoneId
- status
- achievedDate

## Persistence

MVP:

- IndexedDB
- schema versioning
- schema version 2 adds `workoutDrafts` without changing existing version 1 history stores or rows
- schema version 3 adds `trialDrafts` and `trialAttempts` without changing version 1 or 2 history and workout draft rows
- schema version 4 adds `postMissionFunctions` without changing version 1–3 historical rows or drafts
- a saved copy (Journal, Your records): one JSON file, `rangers-road-records-YYYY-MM-DD.json`, holding `format` (`rangers-road-records`), `version` (1), `databaseVersion`, `savedAt`, and `stores`, with every store's rows exactly as saved, read in one transaction
- restore: refuses an unrelated, damaged, or newer-version file before touching anything. A copy from an older schema restores with the later stores empty. After the person confirms, every store is cleared and refilled from the copy in one transaction

Later:

- optional authenticated cloud sync
- conflict-aware merge

## Critical Requirement

Historical records are immutable except explicit user edits.
Restoring a saved copy is the one operation that replaces history. It runs only after the person confirms, and it replaces every store in a single transaction, so a failure leaves the device unchanged.
Program definition updates must not rewrite prior completed sessions.
When Chapter I scheduling changes, reconcile only the campaign's generated planning date. Preserve any separately chosen target date and every historical row. Dated mission attempts retain their definition snapshots and remain readable even when their old week-based ID differs from the newly scheduled order.
A completed trial result is the pass for its chapter. The next chapter's first day is derived from the first completed result: the day after a Monday pass, the Monday after any other pass, or the trial's first day (the Monday after the last week) for an older result saved before the trial window. A chapter is complete once today is on or after that day. None of this mutates the Campaign or TrialResult.

## RoadSession additions

`missionId?` links a walk to the planned mission it fulfilled (today's walks only). `editedAt?` marks a corrected walk. A walk may be edited (`createdAt` kept) or removed; mission records stay append-only.

## DailyCheck (database version 5)

Store `dailyChecks`: `{ id: "<date>:<item>", date, item: 'hearth' | 'reading' | 'family-quest' (| 'seasonal', planned for the Advent and Christmas layer), doneAt }`. A Done tap writes the row; Undo deletes it. Included in backups; a backup made before version 5 restores with no checks.

## Make-up schedule and Light Activity (database version 6)

The make-up schedule (`core/program/makeup-schedule.ts`, applied as `ChapterDay.makeup`) is derived from saved Forge sessions and mission records and is never stored; moved sessions keep their original mission ids so records still match. Light Activity is store `lightActivities`: `{ id, date, activity (required), weight? (lb), sets?, reps?, distance? (miles), time? (minutes), createdAt }`. It can be added or removed, is included in backups, and a backup made before version 6 restores with none.

## Saved exercise order (database version 7)

Store `exerciseOrders`: `{ id: <workoutDefinitionId>, exerciseIds: string[], updatedAt }`. One row per workout (for example a Chapter II Forge A), written when the person changes the order, removed by "Use written order". It is included in backups, and a backup made before version 7 restores with none. Like the campaign row, saved orders are left out of the record counts shown before saving or restoring a copy. When a workout starts, the saved order applies only if its exercise IDs are exactly the workout's current exercise IDs; otherwise the row is ignored and the written order is used, with a one-line note. Make-ups and deload weeks use the saved order. The upgrade only adds the store and leaves every existing record unchanged.

## Any-day trials and the High Country Trial (decided 2026-11-09, built in session 4)

The shape below is for the Chapter III build (session 4). Every change only adds optional fields, so the database version and older rows are unchanged unless the build finds it needs a new store.

- **Any day.** For the Three-Mile Trial and later trials, `TrialDraft` start requires only that the chapter's last week has ended, no completed result for the trial, and a same-day Green check for a physical piece. The content pack's day is a `suggestedDay` in the seed, used for display only. A trial started on a day replaces that day's order; a moved Forge on that day is dropped, not rescheduled (confirmed 2026-11-09).
- **Pieces.** A trial definition may list pieces on separate days (`pieces[]`, each with its phases). A completed piece is stored on the draft with its own `date` and `readinessId`; the draft stays the only active draft between days. A passed piece stays passed. Stopping a later piece keeps the stopped attempt in `trialAttempts` and does not undo earlier pieces. The completed `TrialResult` is dated by its last piece, and that date is the pass for deriving the next chapter's first day (the day after a Monday pass, else the following Monday).
- **Weather.** `TrialAttempt.outcome` gains `postponed-for-weather` (also used for a turnaround under the Navigation II criteria), with optional `weatherReason?` text. It is not a stopped or failed attempt, does not appear as one in history, and removes nothing from the draft.
- **Stand-in.** `HighCountryHikePhase.standIn?: { weatherReason?: string }`. A stand-in hike records the same fields as the hike (time, distance, RPE, knee and back) plus `elevationGain?` (recorded, never required), `terrain` (outdoor or indoor track), checkpoint location estimates, and the halfway reflection. No treadmill value exists.
- **Hike phase fields.** Pre-start plan (direction, junctions, expected distance, expected elevation, turnaround point, turnaround time), time, distance, gain if known, RPE, knee, back, location estimate before checking the phone, and the high-point reflection. The circuit phase holds two rounds of the five stations. Skill parts follow the circuit and reuse `skillResults`.
- **Chapter counted for a pass.** The chapter of a step pass is worked out only up to the last chapter in the app. With Chapter III registered, a step first passed after the Three-Mile Trial counts for Chapter III and joins the High Country Trial (checked in session 4). A pass after the High Country Trial's pass still counts as Chapter III until Chapter IV is in the app; fix that when Chapter IV is built.
- **As built (no new store; the database version stays 9).** `TrialDraft.pieces?`, `TrialAttempt.pieces?` and `TrialResult.pieces?` hold `TrialPieceRecord { pieceId, date, readinessId, startedAt, completedAt? }`; the High Country pieces are `hike` (phases 0–3, pain limit 4) and `circuit` (phase 4 and skill parts, pain limit 3), in `HIGH_COUNTRY_PIECES` (`core/domain/high-country-trial.ts`). The draft's own `date` and `readinessId` stay those of the day it began; the open piece's day governs its Green check (`trialActiveDate`). A piece is finished with `completeTrialPiece`, the next opened with `startTrialPiece` (a later day than the one before, with that day's latest Green check). `TrialAttempt.outcome` is `stopped` or `postponed-for-weather` with optional `weatherReason`. Stopping or postponing a piece writes an attempt (id `<draft>-<piece>-<revision>` while the draft stays open) holding that piece's pain notes; a stopped first piece ends the draft as for any trial; a stopped circuit clears its rounds and skill outcomes for a fresh retry; a postponement keeps every entry. The seed is content version 2 with a structured `circuit` (2 rounds: step-up 10 per side, push-up 10, assisted pull-up 5, farmer carry 45 s, side plank 30 s per side); version 1 was text only and never saved. Phase fields: plan `responses` direction, junctions, expectedDistance, expectedElevation, turnaroundPoint, turnaroundTime; hike `metrics` durationMinutes, distanceMiles, rpe, elevationGainFeet?, standIn? and `responses` knee, back, terrain (`outdoor` | `indoor-track`, stand-in only), weatherReason?; location `responses` `estimate-1` (required), `estimate-2`, `estimate-3`, `actual-n` optional; high point `metrics.quietMinutesDone` and `responses.reflection` (the result's `reflection`). The result is dated by the circuit's day. Trial days (`RoadDatabase.getTrialDays`) include every piece's day. Week 12 Hearth part (d) is a `dailyChecks` row with `item: 'high-point-told'` (no store change).
- **Seasonal layer.** Seed content, never stored: for each year, the dates (Advent 1 to 4 on the four Sundays before December 25, Christmas Eve, Christmas Day) with theme, reference and family question. The Done mark is a `dailyChecks` row with `item: 'seasonal'` (the id is `<date>:seasonal`). Older backups restore with no such rows. Adding the item changes no store, so the database version stays at its current number.

## Forge expansion (planned)

Approved 2026-10-16; rules in `RANGERS_ROAD_PROGRAM.md` (Forge from Chapter II, Readiness Gates, Skill Tracks, The Optional Forge). This section is the planned shape. The database version is set when the tickets are built, and every upgrade only adds stores or optional fields, leaving existing records unchanged.

### Exercise definitions (seed content)

Each new exercise is a seeded ExerciseDefinition with its guide text from `EXERCISE_CATALOG.md`. Additions:

- `builderGroup`: lower body | push | pull | carry | core | arms | mobility (the custom Forge builder's grouping)
- `defaultDose?`: the catalog default the builder uses when the chapter's Forge A and B do not prescribe the exercise

Built in ticket 06 as `CUSTOM_FORGE_LIBRARY` in `core/program/custom-forge-library.ts`, keyed by exercise ID beside the guides, rather than as fields on each guide. A test checks that every guide has a group.
- `images`: `sequence` or `text-only`. A sequence shows only once its pictures are verified; until then the text guide shows.

### SkillTrack (seed content, not stored)

- id (`pull`, `push`, `handstand`, `planche`)
- slot (the workout and slot it fills, such as Forge A vertical pull)
- firstChapter (handstand and planche: V)
- optional? (the planche stretch item)
- steps[]: { exerciseId, earliestChapter, criteria }

A chapter's prescription names the track for a slot, not a fixed exercise; the session's definition snapshot records the step actually done.

Built in ticket 08 as `SKILL_TRACKS` in `core/program/skill-tracks.ts`. Each step has `exerciseId`, `earliestChapter`, `passedWhen` (the catalog text), `criteria?` (the part the sets can show: `sets`, and per set `reps` or `top-of-range`, `seconds`, `maxAssistance`; or `totalReps` over the session) and `unchecked?` (the part the person judges). A slot is an ExercisePrescription with an optional `trackId`; its written exercise is the track's first step. Chapter II's Forge A assisted pull-up is `pull` and its Forge B push-up is `push`. When a session starts, each slot takes the current step (`withCurrentSteps`), and the snapshot keeps `trackId`. A custom Forge's picks carry no `trackId`.

### TrackStep store (database version 9, built 2026-11-03)

Store `trackSteps`, append-only: `{ id, trackId, exerciseId, takenAt }` (TrackStepChoice), written when the person taps "Take this step". Only the step right after the current one, or the one right before it ("Go back a step"), can be written; the newest row is the current step, so going back is one more added row and nothing is edited or removed. A track's current step is its newest row whose exercise is still in the track, or step 1 when there is none. Rows are never rewritten. Taken before the slot's first set, the same transaction puts the step into the active draft; otherwise only the row is written. Version 9 adds only this store and leaves every existing record unchanged. Included in backups and counted with the records; a backup made before version 9 restores with every track at step 1.

Whether a step is **passed** and whether the next step is **available** are derived from saved sessions and the campaign position, never stored (`core/program/skill-track-progress.ts`). Only completed Forge A, B and C sessions count; custom Forge sessions do not (decided 2026-10-16). A result with `swappedFrom`, `substitutionId`, `modificationNotes` or a pain event never counts, nor does a Yellow day's session. A step's first pass is the oldest session that meets it, with its chapter from the campaign position.

### Custom Forge sessions (database version 8, built 2026-10-16)

A custom session is a WorkoutSession with `workoutDefinitionId` `custom-forge` and `kind: 'custom'`. Its `definitionSnapshot` is built from the picks: the exercises in the order set in the builder, their doses and set counts, and the chapter's standard warm-up. Later changes to the library never change a saved session. `exerciseOrder` records any reordering during the session, as for any session. A `warmupSkipped?` flag records a skipped warm-up. Version 8 adds no store; it marks the copies that can hold `kind`, and older rows read exactly as before. A backup made before version 8 restores with no custom sessions.

- A custom session is never an exposure: Last time, hints, "Compared with last time" and the chapter summary ignore it (a row with the `custom-forge` ID and no `kind` is treated the same way). An exercise's record lists it with a "custom" tag, and "Since Day 1" leaves it out.
- "Start from last time's list" reads the newest custom session's snapshot and order, with its set counts and any reps or seconds the person set. An exercise the builder no longer lists is dropped from the list, not from the saved session. Nothing new is stored for it.
- The builder's groups and the catalog defaults are content in `core/program/custom-forge-library.ts`. An exercise that no chapter in the app prescribes and the catalog gives no default is left out of the builder until one does, so no dose is made up.
- A custom session never remembers a saved order (`exerciseOrders`): its order is its own snapshot.
- In a deload week (and the trial days that repeat it) a custom session starts on Reduced with the instruction "Keep it light."; the person chooses reduced or normal, and the saved `reduced` flag follows that choice.
- Whether the optional Forge was done this week is derived from completed Forge C or custom sessions dated Monday through Sunday of that week. A stopped session does not count.

Forge C is a seeded WorkoutDefinition for Chapter I (`chapter-1-forge-c`) whose sessions are ordinary exposures. Its curl is chosen for the week when the session starts, and the session's `definitionSnapshot` records the curl actually done. No store or field was added for it. Whether the card shows is worked out each time from the dated orders, the make-up planner's three-Forge week and the saved sessions (`optional-forge.ts`).

### Readiness swaps

A swap taken on a readiness gate is saved under the exercise actually done: the draft's prescription and the ExerciseResult hold the new exercise, and the result's `swappedFrom?` names the written one. The session is marked reduced, so no load rises after it. The written exercise's next hint holds ("swapped for your shoulder last time") until it is done as written again. Older sessions have no `swappedFrom` and read unchanged; the field is optional, so the database version is unchanged. A press stance choice on a back-pain day is saved as `stance?: 'seated' | 'half-kneeling' | 'standing'` on the ExerciseResult.

### Press stance choice (Chapter III, built 2026-11-09)

A prescription may name `stanceChoice?`, another exercise the person may do instead. Chapter III's Forge B one-arm press names `half-kneeling-one-arm-db-press`. Before the first set (and before any pain note) "Press half-kneeling instead" puts that exercise into the draft's prescription and ExerciseResult, with the same sets and reps; the result's `stanceFrom?` names the written exercise, and the prescription's `stanceChoice` now names the seated one, so "Press seated instead" goes back. It is not a substitution or a readiness swap: the session is not marked reduced, and the half-kneeling press's completed sessions are its own exposures, with its own Last time, hint and history. The seated press's hint is not held by it. Older sessions have neither field and read unchanged; the database version is unchanged.

Open for Chapter IV: the back-pain press rule says it reuses this choice, while the paragraph above plans a `stance?` field. Settle which when Chapter IV is built.

### Skill parts in trials

When a trial attempt starts, the steps first passed during that chapter are copied into the attempt's `definitionSnapshot` as skill parts, so later passes never change a saved trial. Each skill part's result:

- trackId, stepExerciseId
- outcome: `demonstrated` | `step-below` | `set-aside-for-pain`
- exerciseIdDone (the step or the one below)
- sets? (reps or seconds, as for a Forge set)

A completed trial result needs every skill part to have an outcome. `set-aside-for-pain` requires a same-day readiness check that meets that step's pain gate.

Built in ticket 09 (no new store, so the database version stays 9). `TrialDefinition.skillParts?` holds `{ trackId, stepExerciseId, stepBelowExerciseId?, passedOn }` in the attempt's snapshot only; the seed never has it. `TrialDraft`, `TrialAttempt` and `TrialResult` gain `skillResults?`, one per part in the same order: `{ trackId, stepExerciseId, outcome?, exerciseIdDone?, sets?: { reps?, seconds? }[] }`. `exerciseIdDone` follows the outcome and is absent when the part is set aside, which also drops any sets. Starting an attempt reads every saved workout session and readiness check in the same transaction and works out the parts (`skillPartsForTrial` in `core/domain/trial-skill-parts.ts`) from `stepPasses`; the chapter of a pass is its campaign chapter, or the track's first chapter when that is later. A step's gate is `painGate` on the step in `skill-tracks.ts`. Moving past the last physical phase and completing the trial both require every part to have an outcome; completion and the storage check also refuse a result whose parts and outcomes do not match. Skill-part pain uses phase ID `skill-parts`. Older drafts, attempts and results have neither field and read, save and restore exactly as before.
