import type {
  ChapterDefinition,
  IntervalPlan,
  MissionType,
  TrialDefinition,
  WorkoutDefinition,
} from '../domain/models';

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A documented weekly slot. */
export interface WeeklyMissionSlot {
  weekday: Weekday;
  title: string;
}

/**
 * Another documented way to do the day's main order, such as restoration in place of a
 * Friday walk. Each choice keeps its own mission ID so its history stays separate.
 */
export interface ChapterActivityAlternative {
  /** Added to the main order's mission ID. */
  idSuffix: string;
  title: string;
  missionType: MissionType;
  contentReferences: readonly string[];
  /** Nonexertional skill practice needs no readiness check. */
  nonexertional?: boolean;
  /** Show the week's fieldcraft description with this choice. */
  fieldcraftPractice?: boolean;
}

/** One day's main order, from the chapter's content pack. */
export interface ChapterActivityContent {
  title: string;
  missionType: MissionType;
  estimatedMinutes?: number;
  details?: readonly string[];
  /** A definition or guide whose prescription supplies the full activity. */
  definitionId?: string;
  /** A target in the manual, never an automatic trial completion. */
  plannedTrialId?: string;
  /** The day includes the week's fieldcraft, so its description is shown with the order. */
  fieldcraftPractice?: boolean;
  /** Getting ready for the next trial attempt; shown only while the trial is pending. */
  trialPreparation?: string;
  /** Brisk intervals as written steps; an optional timer can be started from them. */
  intervals?: IntervalPlan;
  /** The main order's own name when it is offered beside alternatives. */
  choiceTitle?: string;
  alternatives?: readonly ChapterActivityAlternative[];
  /** On a Red day, the order's wording when a nonexertional alternative stays open. */
  redDayOrder?: { title: string; guidance: string };
}

export interface ChapterDayContent {
  scriptureReference: string;
  activity: ChapterActivityContent;
  readingMinutes?: number;
  /** Shown in the Evening Watch. */
  reflectionPrompt?: string;
  /** A reflection about the day ahead, shown in the Morning Watch instead. */
  morningReflectionPrompt?: string;
  optionalFamilyQuest?: string;
}

export interface ChapterWeekContent {
  name: string;
  days: Record<Weekday, ChapterDayContent>;
  leadershipMission?: string;
  hearthMission?: string;
  /**
   * A Hearth mission in several parts; `hearthMission` then summarizes them in one line.
   * Keep lists the short labels; the leadership lesson gives each part in full.
   */
  hearthMissionParts?: readonly { label: string; text: string }[];
  reading?: string;
  readingBookTitle?: string;
  fieldcraft?: string;
}

/** A deload week's documented volume, as a guide rather than a save limit. */
export interface VolumeGuide {
  /** The campaign week the guide applies to. */
  week: number;
  plannedSets: number;
  aroundCompletedSets: number;
  aroundSkippedSets: number;
}

/** What a chapter's week asks of a workout session when it starts. */
export interface WorkoutWeekPlan {
  /** Saved with the session as its instructions. */
  note?: string;
  volumeGuide?: VolumeGuide;
  /** A deload week: the session is saved as reduced, so load never auto-progresses from it. */
  reduced: boolean;
}

/** Program content is kept separate from screens and historical user records. */
export interface ChapterSeed {
  chapter: ChapterDefinition;
  trial: TrialDefinition;
  weeklyRhythm: readonly WeeklyMissionSlot[];
  faithThemes: readonly string[];
  leadership: readonly string[];
  fieldcraft: readonly string[];
}

/** A chapter whose dated orders are in the app. */
export interface ChapterProgram extends ChapterSeed {
  /** The trial's name in orders and notes, such as "Gate Trial". */
  trialName: string;
  /** The trial's page: its plan, attempts, and saved record. */
  trialRoute: string;
  /** Chapter I alone leads in through Sunday when Day 1 is not a Monday. */
  leadsIn: boolean;
  /** Dated weeks in order; the first is `chapter.weeks[0]`. */
  weeks: readonly ChapterWeekContent[];
  /** A Monday or Thursday after the last week, while the trial waits for a pass. */
  trialAttempt: ChapterDayContent;
  workouts: readonly WorkoutDefinition[];
  /** Also open as needed, outside the dated order. */
  restorationId: string;
  workoutPlan(workoutId: string, week: number): WorkoutWeekPlan;
}
