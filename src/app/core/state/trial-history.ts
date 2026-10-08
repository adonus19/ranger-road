import { Injectable } from '@angular/core';
import type {
  LocalDate,
  PostMissionFunction,
  TrialAttempt,
  TrialDraft,
  TrialResult,
} from '../domain/models';
import type { RecoveryInput } from '../domain/post-mission-function';
import type { SavedTrialResult } from '../domain/trial';
import type { RecordedTrialPainEvent, TrialPainInput } from '../domain/trial-draft';
import { RoadDatabase } from '../persistence/road-database';
import { chapterPrograms } from '../program/program-catalog';

/** Trial history uses the existing versioned IndexedDB store and short-lived connections. */
@Injectable({ providedIn: 'root' })
export class TrialHistory {
  async forTrial(trialId: string): Promise<TrialResult[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getTrialResultsForTrial(trialId);
    } finally {
      database.close();
    }
  }

  async add(result: SavedTrialResult): Promise<void> {
    const database = await RoadDatabase.open();
    try {
      await database.addTrialResult(result);
    } finally {
      database.close();
    }
  }

  async activeDraft(): Promise<TrialDraft | undefined> {
    const database = await RoadDatabase.open();
    try {
      return await database.getActiveTrialDraft();
    } finally {
      database.close();
    }
  }

  async startDraft(date: LocalDate, trialId = 'gate-trial'): Promise<TrialDraft> {
    const database = await RoadDatabase.open();
    try {
      return await database.startTrialDraft(date, trialId);
    } finally {
      database.close();
    }
  }

  async saveDraft(edited: TrialDraft): Promise<TrialDraft> {
    const database = await RoadDatabase.open();
    try {
      return await database.saveTrialDraft(edited);
    } finally {
      database.close();
    }
  }

  async recordPain(draftId: string, input: TrialPainInput): Promise<RecordedTrialPainEvent> {
    const database = await RoadDatabase.open();
    try {
      return await database.recordTrialPain(draftId, input);
    } finally {
      database.close();
    }
  }

  finishDraft(draftId: string, outcome: 'completed'): Promise<SavedTrialResult>;
  finishDraft(draftId: string, outcome: 'stopped'): Promise<TrialAttempt>;
  async finishDraft(
    draftId: string,
    outcome: 'completed' | 'stopped',
  ): Promise<SavedTrialResult | TrialAttempt> {
    const database = await RoadDatabase.open();
    try {
      return outcome === 'completed'
        ? await database.finishTrialDraft(draftId, 'completed')
        : await database.finishTrialDraft(draftId, 'stopped');
    } finally {
      database.close();
    }
  }

  async stoppedForTrial(trialId: string): Promise<TrialAttempt[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getStoppedTrialAttemptsForTrial(trialId);
    } finally {
      database.close();
    }
  }

  async recoveries(): Promise<PostMissionFunction[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getPostMissionFunctions();
    } finally {
      database.close();
    }
  }

  async addRecovery(input: RecoveryInput): Promise<PostMissionFunction> {
    const database = await RoadDatabase.open();
    try {
      return await database.addPostMissionFunction(input);
    } finally {
      database.close();
    }
  }

  async painForAttempt(attemptId: string): Promise<RecordedTrialPainEvent[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getTrialPainForAttempt(attemptId);
    } finally {
      database.close();
    }
  }
}

/** Completed results for every chapter trial in the app: they place a date in the campaign. */
export async function loadCampaignTrials(
  history: Pick<TrialHistory, 'forTrial'>,
): Promise<TrialResult[]> {
  const results = await Promise.all(
    chapterPrograms.map((program) => history.forTrial(program.trial.id)),
  );
  return results.flat();
}
