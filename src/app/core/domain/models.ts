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
}

export interface CompletedSet {
  reps?: number;
  duration?: number;
  load?: number;
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
  /** The band used for clean reps, or "none". */
  pullupAssistance?: string;
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

/** A Done tap for one of the day's smaller orders. Today only; undoing removes the row. */
export type DailyCheckItem = 'hearth' | 'reading' | 'family-quest';

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
}

/** An immutable historical record when an in-progress trial is stopped. */
export interface TrialAttempt extends Omit<TrialDraft, 'updatedAt'> {
  outcome: 'stopped';
  stoppedAt: IsoTimestamp;
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
