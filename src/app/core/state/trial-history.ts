import { Injectable } from '@angular/core';
import type { LocalDate, TrialAttempt, TrialDraft, TrialResult } from '../domain/models';
import type { SavedGateTrialResult } from '../domain/trial';
import type { RecordedTrialPainEvent, TrialPainInput } from '../domain/trial-draft';
import { RoadDatabase } from '../persistence/road-database';

/** Gate Trial history uses the existing versioned IndexedDB store and short-lived connections. */
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

  async add(result: SavedGateTrialResult): Promise<void> {
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

  async startDraft(date: LocalDate): Promise<TrialDraft> {
    const database = await RoadDatabase.open();
    try {
      return await database.startTrialDraft(date);
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

  finishDraft(draftId: string, outcome: 'completed'): Promise<SavedGateTrialResult>;
  finishDraft(draftId: string, outcome: 'stopped'): Promise<TrialAttempt>;
  async finishDraft(
    draftId: string,
    outcome: 'completed' | 'stopped',
  ): Promise<SavedGateTrialResult | TrialAttempt> {
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

  async painForAttempt(attemptId: string): Promise<RecordedTrialPainEvent[]> {
    const database = await RoadDatabase.open();
    try {
      return await database.getTrialPainForAttempt(attemptId);
    } finally {
      database.close();
    }
  }
}
