import { Injectable } from '@angular/core';
import type { JournalEntry, LocalDate } from '../../core/domain/models';
import { RoadDatabase } from '../../core/persistence/road-database';

export type WatchKind = 'morning' | 'evening';

export interface EveningAnswers {
  win: string;
  missedStandard: string;
  gratitude: string;
  tomorrow: string;
}

export const MORNING_PROMPT = 'What does my family need from me today?';
export const EVENING_PROMPTS = [
  { key: 'win', label: 'Win' },
  { key: 'missedStandard', label: 'Missed standard' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'tomorrow', label: 'Tomorrow' },
] as const;

export function isWatchEntry(entry: JournalEntry): boolean {
  return entry.type === 'morning-watch' || entry.type === 'evening-watch';
}

export function watchTitle(entry: JournalEntry): string {
  return entry.type === 'morning-watch' ? 'Morning Watch' : 'Evening Watch';
}

/** Format a civil date at local noon so a stored date never shifts across time zones. */
export function formatJournalDate(date: LocalDate): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

@Injectable({ providedIn: 'root' })
export class JournalStore {
  async listWatches(): Promise<JournalEntry[]> {
    const database = await RoadDatabase.open();
    try {
      const records = await database.getAllHistorical('journalEntries');
      return records
        .filter(isWatchEntry)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    } finally {
      database.close();
    }
  }

  async saveMorning(date: LocalDate, answer: string): Promise<JournalEntry> {
    const response = answer.trim();
    if (!response) {
      throw new Error('Write a short answer before saving.');
    }
    return this.save({
      id: this.newId(date),
      date,
      type: 'morning-watch',
      prompt: MORNING_PROMPT,
      response,
    });
  }

  async saveEvening(date: LocalDate, answers: EveningAnswers): Promise<JournalEntry> {
    const lines = EVENING_PROMPTS.flatMap(({ key, label }) => {
      const answer = answers[key].trim();
      return answer ? [`${label}: ${answer}`] : [];
    });
    if (!lines.length) {
      throw new Error('Write at least one line before saving.');
    }
    return this.save({
      id: this.newId(date),
      date,
      type: 'evening-watch',
      prompt: EVENING_PROMPTS.map(({ label }) => label).join('\n'),
      response: lines.join('\n'),
    });
  }

  private async save(entry: JournalEntry & { id: string }): Promise<JournalEntry> {
    const database = await RoadDatabase.open();
    try {
      await database.addHistorical('journalEntries', entry);
      return entry;
    } finally {
      database.close();
    }
  }

  private newId(date: LocalDate): string {
    return `journal-${date}-${new Date().toISOString()}-${crypto.randomUUID()}`;
  }
}
