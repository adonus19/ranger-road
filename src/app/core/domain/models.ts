/** A local calendar date in YYYY-MM-DD form. Keep it separate from UTC timestamps. */
export type LocalDate = string;
export type IsoTimestamp = string;
export type DeepReadonly<T> = T extends (infer Item)[]
  ? ReadonlyArray<DeepReadonly<Item>>
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

export interface UserProfile {
  id: string;
  name: string;
  baselineDate: LocalDate;
  age?: number;
  height?: number;
  targetWeight?: number;
  targetWaist?: number;
  goals: string[];
  equipment: string[];
  trainingConstraints: string[];
  preferences: string[];
}

export interface Campaign {
  id: string;
  startDate: LocalDate;
  currentChapterId: string;
  status: string;
  /** End of Week 4 is a planning target, not a mandatory trial date. */
  trialTargetDate?: LocalDate;
  /** Version 2 adds the short lead-in before four full Monday–Sunday weeks. */
  scheduleVersion?: number;
}

export interface ChapterDefinition {
  id: string;
  number: number;
  name: string;
  theme: string;
  weeks: number[];
  objectives: string[];
  trialId: string;
}

export type MissionType =
  | 'strength'
  | 'conditioning'
  | 'restoration'
  | 'scripture'
  | 'prayer'
  | 'reflection'
  | 'leadership'
  | 'fieldcraft'
  | 'reading'
  | 'familyQuest'
  | 'trial';

/** A brisk-interval walk, as the written steps give it. The timer built from it is optional. */
export interface IntervalPlan {
  warmupMinutes?: number;
  rounds: number;
  briskSeconds: number;
  easySeconds: number;
  /** Only when the pack gives a length; otherwise the timer ends with a reminder to cool down. */
  cooldownMinutes?: number;
  /** The work block's name when it is not a brisk walk, such as "Step-ups" on the Tuesday climb. */
  workLabel?: string;
  /** What follows the timed blocks, such as the climb's slow step-downs. Shown when the timer ends. */
  finisher?: string;
}

export interface MissionDefinition {
  id: string;
  chapterId: string;
  week: number;
  day: number;
  missionType: MissionType;
  title: string;
  /** Fieldcraft requires readiness unless explicitly marked as nonexertional. Physical types always require it. */
  requiresReadiness?: boolean;
  estimatedMinutes?: number;
  required: boolean;
  contentReferences: string[];
  /** Content for the dated order; absent from mission snapshots saved before the full pack. */
  scriptureReference?: string;
  reflectionPrompt?: string;
  activityDetails?: string[];
  readingMinutes?: number;
  readingBookTitle?: string;
  optionalFamilyQuest?: string;
  /** Brisk intervals written as steps; an optional timer can be started from them. */
  intervals?: IntervalPlan;
  /** Exercises the written steps name, such as the climb's step-ups, linked to their guides. */
  exerciseGuideIds?: string[];
  /** A planned trial is completed through TrialResult, never the generic mission logger. */
  plannedTrialId?: string;
  /** Getting ready for the next Gate Trial attempt; screens show it only while the trial is pending. */
  trialPreparation?: string;
}

export interface MissionInstance {
  id: string;
  definitionId: string;
  date: LocalDate;
  status: string;
  reduced: boolean;
  notes?: string;
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
  /** Captured when work starts so later seed changes cannot redefine this mission. */
  definitionSnapshot?: DeepReadonly<MissionDefinition>;
}

export interface WorkoutDefinition {
  id: string;
  title: string;
  /** Static prescription revision; older saved workouts may not have one. */
  contentVersion?: number;
  warmup?: WorkoutStep[];
  exercises: ExercisePrescription[];
  finish?: WorkoutStep[];
  optionalFinish?: WorkoutStep[];
  notes?: string[];
}

export type WorkoutStep =
  | { kind: 'walk'; minutes: number; pace: 'easy' }
  | { kind: 'exercise'; prescription: ExercisePrescription };

export interface ExercisePrescription {
  exerciseId: string;
  sets?: number;
  reps?: number | string;
  /** True for reps or holds prescribed on each side or leg. */
  perSide?: boolean;
  duration?: number;
  /** Explicit seconds; `duration` remains for older local definitions. */
  durationSeconds?: number | string;
  loadStrategy?: string;
  rpeTarget?: number;
  rpeCeiling?: number;
  progressionRule?: string;
  substitutionIds?: string[];
  notes?: string;
  /**
   * The skill track this slot follows (`pull`, `push`, ...). The written exercise is the track's
   * first step; a session's snapshot holds the step actually done. Older prescriptions have none.
   */
  trackId?: string;
  /**
   * A stance the person may choose instead, saved as its own exercise with its own history
   * (Chapter III's "Press half-kneeling instead"). Not a substitution: the session stays full.
   */
  stanceChoice?: string;
}

export interface CompletedSet {
  reps?: number;
  duration?: number;
  load?: number;
  /** Pounds of band help on an assisted pull-up; 0 means no band. Separate from load. */
  assistance?: number;
  rpe?: number;
  completed?: boolean;
}

export interface ExerciseResult {
  exerciseId: string;
  sets: CompletedSet[];
  painEvents: PainEvent[];
  substitutionId?: string;
  /** A person's own description of a modification; no prescription is inferred from it. */
  modificationNotes?: string;
  /** Set when a readiness swap replaced the written exercise: the exercise that was written. */
  swappedFrom?: string;
  /** Set when the person chose the other stance: the exercise that was written. */
  stanceFrom?: string;
}

export interface WorkoutSession {
  id: string;
  date: LocalDate;
  workoutDefinitionId: string;
  readinessId: string;
  exerciseResults: ExerciseResult[];
  sessionRpe?: number;
  notes?: string;
  /** Captured when work starts so later workout edits cannot redefine this session. */
  definitionSnapshot?: DeepReadonly<WorkoutDefinition>;
  /** Older local sessions predate these fields and remain readable. */
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
  outcome?: 'completed' | 'stopped';
  reduced?: boolean;
  warmupComplete?: boolean;
  finishComplete?: boolean;
  optionalFinishComplete?: boolean;
  /** Week-specific source instructions, captured beside the prescription. */
  sessionInstructions?: string[];
  /** Indices into definitionSnapshot.exercises in the order the person worked them; missing means written order. */
  exerciseOrder?: number[];
  /**
   * A custom Forge the person built from the library. Kept in history, but never an exposure:
   * it does not feed Last time, hints or chapter summaries. Older sessions have no kind.
   */
  kind?: 'custom';
  /** The warm-up was skipped (custom Forge only). */
  warmupSkipped?: boolean;
}

/**
 * The person tapped "Take this step" on a skill track. Append-only: a track's current step is
 * its newest row, or the track's first step when there is none.
 */
export interface TrackStepChoice {
  id: string;
  trackId: string;
  /** The step's exercise ID. */
  exerciseId: string;
  takenAt: IsoTimestamp;
}

/** A person's chosen exercise order for one workout, reused the next time it starts. */
export interface SavedExerciseOrder {
  /** The workout definition ID. */
  id: string;
  exerciseIds: string[];
  updatedAt: IsoTimestamp;
}

/** The only editable workout record. Completed sessions are separate append-only rows. */
export interface WorkoutDraft {
  id: string;
  date: LocalDate;
  workoutDefinitionId: string;
  readinessId: string;
  startedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  reduced: boolean;
  warmupComplete: boolean;
  finishComplete: boolean;
  optionalFinishComplete: boolean;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restStartedAt?: IsoTimestamp;
  definitionSnapshot: DeepReadonly<WorkoutDefinition>;
  exerciseResults: ExerciseResult[];
  sessionRpe?: number;
  notes?: string;
  sessionInstructions?: string[];
  /** Indices into definitionSnapshot.exercises in the order the person work them; missing means written order. */
  exerciseOrder?: number[];
  kind?: 'custom';
  warmupSkipped?: boolean;
}

export type ReadinessStatus = 'green' | 'yellow' | 'red';

export interface ReadinessRedFlags {
  significantSymptomIncrease: boolean;
  newNeurologicalOrRadiatingSymptoms: boolean;
  illness: boolean;
  otherConcerningSymptoms: boolean;
}

export interface ReadinessInput {
  date: LocalDate;
  sleepHours: number;
  /** Sleep quality is self-reported; hours alone do not set a readiness threshold. */
  poorSleep: boolean;
  energy: number;
  backPain: number;
  shoulderPain: number;
  neckPain: number;
  redFlags: ReadinessRedFlags;
}

export interface ReadinessCheck extends ReadinessInput {
  id: string;
  checkedAt: IsoTimestamp;
  status: ReadinessStatus;
}

export interface PainEvent {
  id?: string;
  timestamp: IsoTimestamp;
  bodyArea: string;
  severity: number;
  exerciseId?: string;
  actionTaken: string;
  /** Links new append-only pain rows to the draft/session; older rows may lack it. */
  workoutSessionId?: string;
  /** Links a trial pain event to its resumable draft and any stopped attempt. */
  trialAttemptId?: string;
  trialPhaseId?: string;
}

/**
 * check-in: the Day 1 and every-28-days check-in. body: weight and/or waist on any day.
 * tests: the four tests, added later when a Red readiness day held them at the check-in.
 */
export type MeasurementKind = 'check-in' | 'body' | 'tests';

export type SquatDepth = 'above-parallel' | 'parallel' | 'below-parallel';

/** Readiness averages copied into a check-in when it is saved, so later checks cannot change it. */
export interface ReadinessSummary {
  from: LocalDate;
  to: LocalDate;
  /** Days with a readiness check; a day checked twice counts its latest check once. */
  checks: number;
  averageSleepHours?: number;
  averageBackPain?: number;
  averageShoulderPain?: number;
  averageNeckPain?: number;
}

export interface MeasurementEntry {
  id?: string;
  kind: MeasurementKind;
  date: LocalDate;
  recordedAt: IsoTimestamp;
  /** Pounds. */
  weight?: number;
  /** Inches, at the navel. */
  waist?: number;
  /** Beats per minute, at rest. */
  restingHeartRate?: number;
  /** mmHg. */
  bloodPressure?: { systolic: number; diastolic: number };
  /** One set, stopped at the first rep with broken form or rising pain. */
  pushups?: number;
  /** Older entries: the band used for clean reps as text, or "none". */
  pullupAssistance?: string;
  /** Pounds of band help for clean reps, 0 to 150; 0 means no band. */
  pullupAssistanceLb?: number;
  /** An optional note naming the band. */
  pullupBandNote?: string;
  squatDepth?: SquatDepth;
  /** Inches from fingertips to the floor; 0 when they touch it. */
  toeReach?: number;
  /** 1 to 5, as in the readiness check. */
  energy?: number;
  /** Perceived capability, 1 to 5. */
  capabilityRating?: number;
  /** True when a Red readiness day held the four tests for another day. */
  testsHeld?: boolean;
  readinessSummary?: ReadinessSummary;
}

export interface RoadSession {
  id?: string;
  date: LocalDate;
  distance: number;
  duration: number;
  elevationGain?: number;
  ruckLoad?: number;
  terrain: string;
  rpe: number;
  avgHeartRate?: number;
  painBefore?: number;
  painAfter?: number;
  /** The planned mission this walk fulfilled; older walks and unlinked walks have none. */
  missionId?: string;
  /** Set when a saved walk is corrected, so the change is visible. */
  editedAt?: IsoTimestamp;
}

/**
 * A Done tap for one of the day's smaller orders. Today only; undoing removes the row.
 * 'high-point-told' is Week 12's Hearth part (d): telling your spouse the high-point answer
 * after the High Country hike (decided 2026-11-09). 'seasonal' is the Advent or Christmas
 * family reading on its real date (core/program/seasonal-layer.ts); one row per day, even when
 * Advent 4 and Christmas Eve share December 24. Added without a database version change.
 */
export type DailyCheckItem = 'hearth' | 'reading' | 'family-quest' | 'high-point-told' | 'seasonal';

export interface DailyCheck {
  /** `${date}:${item}`, so a second tap on the same day is the same row. */
  id: string;
  date: LocalDate;
  item: DailyCheckItem;
  doneAt: IsoTimestamp;
}

/**
 * Activity the program does not prescribe (a long walk, cycling, swimming), logged by choice,
 * mainly in deload weeks. Only the name is required; the rest depends on the activity.
 */
export interface LightActivity {
  id: string;
  date: LocalDate;
  activity: string;
  /** Pounds. */
  weight?: number;
  sets?: number;
  reps?: number;
  /** Miles. */
  distance?: number;
  /** Minutes. */
  time?: number;
  createdAt: IsoTimestamp;
}

export interface CarryResult {
  type: string;
  load: number;
  duration: number;
  distance?: number;
  side?: string;
}

export interface JournalEntry {
  id?: string;
  date: LocalDate;
  type: string;
  prompt: string;
  response: string;
  voiceAsset?: string;
}

export interface ScriptureAssignment {
  reference: string;
  prompt: string;
  chapterId: string;
  week: number;
  day: number;
}

export interface ReadingAssignment {
  bookId: string;
  assignment: string;
  minutes?: number;
  prompt?: string;
}

export interface FieldCard {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  mission?: string;
  safetyNotes?: string[];
  relatedSkills?: string[];
}

export interface SkillCompetency {
  skillId: string;
  status: 'learned' | 'practiced' | 'demonstrated';
  date: LocalDate;
  notes?: string;
}

export interface TrialPhase {
  id: string;
  title: string;
  /** Physical target where the program gives an exact walking distance. */
  targetDistanceMiles?: number;
  description?: string;
  instructions?: string[];
  requiredData?: string[];
  optionalData?: string[];
  safetyNotes?: string[];
  reflectionPrompts?: string[];
  circuit?: TrialCircuitPrescription;
}

export interface TrialCircuitMovement {
  exerciseId: string;
  reps?: number;
  durationSeconds?: number;
  perSide?: boolean;
}

export interface TrialCircuitPrescription {
  rounds: number;
  movements: TrialCircuitMovement[];
}

export interface TrialDefinition {
  id: string;
  chapterId: string;
  /** Definition revision; absent on trials saved before detailed program content arrived. */
  contentVersion?: number;
  phases: TrialPhase[];
  /**
   * Skill parts (CHAPTERS_AND_TRIALS.md, Skill Parts in Trials): the track steps first passed in
   * this trial's chapter, copied in when an attempt starts. Absent on the seed and on older rows.
   */
  skillParts?: TrialSkillPart[];
}

/** One track step a trial asks the person to show. */
export interface TrialSkillPart {
  trackId: string;
  stepExerciseId: string;
  /** The step just below, which also completes the part. Absent for a track's first step. */
  stepBelowExerciseId?: string;
  /** The session date of the step's first pass. */
  passedOn: LocalDate;
}

export type TrialSkillOutcome = 'demonstrated' | 'step-below' | 'set-aside-for-pain';

/** What the person recorded for one skill part. A draft may not have an outcome yet. */
export interface TrialSkillPartResult {
  trackId: string;
  stepExerciseId: string;
  outcome?: TrialSkillOutcome;
  /** The step, or the step below; absent when the part was set aside for pain. */
  exerciseIdDone?: string;
  /** Optional reps or seconds for each set, as for a Forge set. */
  sets?: { reps?: number; seconds?: number }[];
}

export interface TrialCircuitMovementResult {
  exerciseId: string;
  reps?: number;
  /** A draft may have only one side recorded; completion requires both. */
  repsBySide?: { left?: number; right?: number };
  durationSeconds?: number;
  durationSecondsBySide?: { left?: number; right?: number };
  /** The actual assistance, box height, or load can be recorded without setting a passing weight. */
  setup?: string;
  loadPounds?: number;
}

export interface TrialCircuitRoundResult {
  round: number;
  movements: TrialCircuitMovementResult[];
}

export interface TrialPhaseResult {
  phaseId: string;
  notes?: string;
  metrics?: Record<string, number | string | boolean>;
  /** Prompt-keyed written answers remain separate for later review. */
  responses?: Record<string, string>;
  circuitRounds?: TrialCircuitRoundResult[];
}

export interface TrialResult {
  id: string;
  trialId: string;
  date: LocalDate;
  phaseResults: TrialPhaseResult[];
  reflection: string;
  photoAsset?: string;
  postMissionFunction?: string;
  /** New results retain the content the person actually completed; older v1 rows may lack it. */
  definitionSnapshot?: DeepReadonly<TrialDefinition>;
  /** The same-day readiness check used when completing a physical trial. */
  readinessId?: string;
  /** Time saved, separate from the trial's local date. */
  recordedAt?: IsoTimestamp;
  /** One result per skill part in the snapshot, in the same order. Absent on older rows. */
  skillResults?: TrialSkillPartResult[];
  /** A trial in pieces on separate days (the High Country Trial): each piece's day and check. */
  pieces?: TrialPieceRecord[];
}

/**
 * One piece of a trial taken on its own day, such as the High Country Trial's hike. Its Green
 * check is its own; `completedAt` is set once every part of the piece is finished as written.
 */
export interface TrialPieceRecord {
  pieceId: string;
  date: LocalDate;
  readinessId: string;
  startedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
}

export type RecoveryEnergy = 'low' | 'steady' | 'good';
export type RecoverySoreness = 'sore' | 'a-little' | 'not-sore';
export type RecoveryIrritability = 'irritable' | 'a-little' | 'calm';
export type RecoveryCapacity = 'not-really' | 'partly' | 'fully';

/**
 * Post-mission function, assessed 60–120 minutes after a completed trial. Each area is
 * one of three plain words, never a number, linked to the immutable result it follows.
 */
export interface PostMissionFunction {
  id: string;
  trialId: string;
  trialResultId: string;
  /** End of physical effort, copied from the linked result for a readable delay. */
  effortEndedAt: IsoTimestamp;
  recordedAt: IsoTimestamp;
  /** Whole minutes between completion and this record. */
  minutesAfter: number;
  energy: RecoveryEnergy;
  soreness: RecoverySoreness;
  irritability: RecoveryIrritability;
  helpAtHome: RecoveryCapacity;
  familyLife: RecoveryCapacity;
  note?: string;
}

/** Only one Gate Trial draft can be active. Partial phase entries are kept in order. */
export interface TrialDraft {
  id: string;
  trialId: string;
  date: LocalDate;
  /** The Green check at start; completion also checks the latest same-day check. */
  readinessId: string;
  startedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Incremented for every draft write so stale tabs cannot replace newer entries. */
  revision: number;
  /** Index of the phase currently shown, from Road (0) through Oath (4). */
  currentPhaseIndex: number;
  definitionSnapshot: DeepReadonly<TrialDefinition>;
  phaseResults: TrialPhaseResult[];
  painEvents: PainEvent[];
  photoAsset?: string;
  /** One slot per skill part in the snapshot; absent when the trial has none. */
  skillResults?: TrialSkillPartResult[];
  /**
   * A trial in pieces on separate days: finished pieces, then the open one. Absent on the
   * trials taken in one sitting and on older rows.
   */
  pieces?: TrialPieceRecord[];
}

/**
 * An immutable historical record when an in-progress trial (or one piece of it) is stopped,
 * or postponed. A postponement (weather, or a turnaround under the Navigation II criteria) is
 * not a failed attempt.
 */
export interface TrialAttempt extends Omit<TrialDraft, 'updatedAt'> {
  outcome: 'stopped' | 'postponed-for-weather';
  stoppedAt: IsoTimestamp;
  /** The optional reason given for a postponement. */
  weatherReason?: string;
}

export interface HearthMission {
  id: string;
  title: string;
  description: string;
  startDate: LocalDate;
  endDate?: LocalDate;
  status: string;
  reflection?: string;
}

export interface CapabilityMilestone {
  id: string;
  description: string;
}

export interface CapabilityGoal {
  id: string;
  title: string;
  contributors: string[];
  milestones: CapabilityMilestone[];
}

export interface CapabilityProgress {
  capabilityGoalId: string;
  milestoneId: string;
  status: string;
  achievedDate?: LocalDate;
}

/** Media slots are optional until the generated sequence assets are produced. */
export interface ExerciseMedia {
  startImage?: string;
  midImages?: string[];
  endImage?: string;
  muscleMapFront?: string;
  muscleMapBack?: string;
}

export interface ExerciseDefinition {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  category: string;
  movementPattern: string;
  equipment: string[];
  difficulty: 'intro' | 'basic' | 'intermediate' | 'advanced';
  primaryTargets: string[];
  secondaryTargets: string[];
  mobilityTargets?: string[];
  setupSteps: string[];
  executionSteps: string[];
  engagementCues: string[];
  commonMistakes: string[];
  painGuidance: string[];
  regressions: string[];
  progressions: string[];
  rangerCue?: string;
  media: ExerciseMedia;
}
