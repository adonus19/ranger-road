import { Injectable } from '@angular/core';
import type {
  LocalDate,
  SavedExerciseOrder,
  WorkoutDraft,
  WorkoutSession,
} from '../domain/models';
import type { RecordedWorkoutPainEvent, WorkoutPainInput, WorkoutStart } from '../domain/workout';
import { RoadDatabase } from '../persistence/road-database';

/** Short-lived IndexedDB connections keep the workout player resumable offline. */
@Injectable({ providedIn: 'root' })
export class WorkoutHistory {
  async active(): Promise<WorkoutDraft | undefined> {
    return this.withDatabase((database) => database.getActiveWorkoutDraft());
  }

  async start(input: WorkoutStart): Promise<WorkoutDraft> {
    return this.withDatabase((database) => database.startWorkoutDraft(input));
  }

  async saveDraft(draft: WorkoutDraft): Promise<WorkoutDraft> {
    return this.withDatabase((database) => database.saveWorkoutDraft(draft));
  }

  async recordPain(draftId: string, input: WorkoutPainInput): Promise<RecordedWorkoutPainEvent> {
    return this.withDatabase((database) => database.recordWorkoutPain(draftId, input));
  }

  async complete(draftId: string): Promise<WorkoutSession> {
    return this.withDatabase((database) => database.finishWorkoutDraft(draftId, 'completed'));
  }

  /** Keeps partial sets and pain when a session must end without completion. */
  async stop(draftId: string): Promise<WorkoutSession> {
    return this.withDatabase((database) => database.finishWorkoutDraft(draftId, 'stopped'));
  }

  async forDate(date: LocalDate): Promise<WorkoutSession[]> {
    return this.withDatabase((database) => database.getWorkoutSessionsForDate(date));
  }

  async savedOrder(workoutDefinitionId: string): Promise<SavedExerciseOrder | undefined> {
    return this.withDatabase((database) => database.getExerciseOrder(workoutDefinitionId));
  }

  async rememberOrder(workoutDefinitionId: string, exerciseIds: string[]): Promise<void> {
    return this.withDatabase((database) =>
      database.putExerciseOrder({
        id: workoutDefinitionId,
        exerciseIds,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async forgetOrder(workoutDefinitionId: string): Promise<void> {
    return this.withDatabase((database) => database.deleteExerciseOrder(workoutDefinitionId));
  }

  private async withDatabase<T>(work: (database: RoadDatabase) => Promise<T>): Promise<T> {
    const database = await RoadDatabase.open();
    try {
      return await work(database);
    } finally {
      database.close();
    }
  }
}
