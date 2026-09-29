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
- currentChapterId
- status
- trialTargetDate? (planning date; Chapter I uses the first Gate Trial attempt, the Monday after Week 4. Attempts then follow the Monday and Thursday rule whatever an older saved date says)
- scheduleVersion? (Chapter I version 2 adds a short lead-in before four complete Monday–Sunday weeks; version 3 moves a generated target (Day 1 + 27, or the Sunday that closes Week 4) to the first Gate Trial attempt, leaving any other saved date as it was; older campaigns may lack it)

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
- sessionInstructions? (a copy of dated source instructions, such as the Week 4 deload note)

New completed and stopped sessions are immutable, append-only snapshots. A stopped session retains partial sets and pain history without counting as a completed exposure for previous-load context. Previous loads are displayed for reference only; the app does not calculate or apply the next load.

### WorkoutDraft

- id, date, workoutDefinitionId, readinessId
- startedAt, updatedAt
- reduced, warmupComplete, finishComplete, optionalFinishComplete
- currentExerciseIndex, currentSetIndex, restStartedAt?
- definitionSnapshot, exerciseResults[], sessionInstructions?, sessionRpe?, notes?

Only one workout draft may be active. It is updated as sets are recorded, can resume at its current set after a reload, and is removed in the same transaction that appends its completed or stopped session. Starting and completing a workout validates the latest same-day readiness check. A newer Red check blocks further Forge sets and Forge completion, while ending as stopped preserves the partial record. The seeded Chapter I restoration remains available on Red when appropriate. Yellow or Red readiness marks a permitted draft reduced. Pain rated 5 or higher during Forge also blocks further set saves and completed outcome; the pain record itself can still be saved immediately, and the partial session can be stopped. A new check after the last draft save must be reviewed before completion. Each planned set must be explicitly marked done or skipped before a completed outcome; a stopped session may retain unmarked sets.

### ExerciseResult

- exerciseId
- sets[]
- painEvents[]
- substitutionId?
- modificationNotes? (the person's own description of a change; it does not create a new prescribed substitution)

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
- pullupAssistance? (the band used, or "none")
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
- photoAsset?
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

Only one trial draft may be active. Starting requires an attempt day (a Monday or Thursday after Week 4), no completed result for the trial yet, and the latest same-day Green readiness check. Draft autosave keeps partial observations even if readiness later turns Yellow or Red. Advancing past either physical phase and saving a completed result requires the latest same-day Green check. Pain at 3 or more, or a reduce, substitute, or end-exercise response, prevents that attempt from being recorded as a full completed Gate Trial. The person can stop and retain the partial attempt.

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
A completed Gate Trial result is the pass. Chapter II's first day is derived from the first completed result: the day after a Monday pass, the Monday after any other pass, or the first attempt day for an older result saved before the trial window. Chapter I completion is today being on or after that day. None of this mutates the Campaign or TrialResult.
