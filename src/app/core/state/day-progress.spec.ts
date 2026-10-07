import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { MissionInstance } from '../domain/models';
import { RoadDatabase } from '../persistence/road-database';
import { JournalStore } from '../../features/journal/journal-store';
import { DayProgress, recordLabel } from './day-progress';
import { MissionHistory } from './mission-history';

const today = '2026-10-07';

function setup() {
  const name = `day-progress-${crypto.randomUUID()}`;
  const originalOpen = RoadDatabase.open.bind(RoadDatabase);
  vi.spyOn(RoadDatabase, 'open').mockImplementation(() => originalOpen(name));
  TestBed.configureTestingModule({
    providers: [
      { provide: MissionHistory, useValue: { forDate: async () => [] } },
      {
        provide: JournalStore,
        useValue: {
          listWatches: async () => [
            { date: today, type: 'morning-watch' },
            { date: '2026-10-06', type: 'evening-watch' },
          ],
        },
      },
    ],
  });
  return TestBed.inject(DayProgress);
}

describe('DayProgress', () => {
  it('marks a Done tap, keeps it after a reload, and undoes it', async () => {
    const progress = setup();
    await progress.refresh(today);
    expect(progress.isDone('hearth')).toBe(false);

    await progress.setDone(today, 'hearth', true);
    expect(progress.isDone('hearth')).toBe(true);
    await progress.refresh(today);
    expect(progress.isDone('hearth')).toBe(true);
    await progress.refresh('2026-10-08');
    expect(progress.isDone('hearth')).toBe(false);

    await progress.refresh(today);
    await progress.setDone(today, 'hearth', false);
    await progress.refresh(today);
    expect(progress.isDone('hearth')).toBe(false);
  });

  it('shows only today’s saved watches', async () => {
    const progress = setup();
    await progress.refresh(today);
    expect(progress.morningWatch()).toBe(true);
    expect(progress.eveningWatch()).toBe(false);
  });

  it('words outcomes neutrally: Done for full, Recorded for anything else', () => {
    const base = { id: 'a', definitionId: 'd', date: today, status: 'completed', reduced: false };
    expect(recordLabel(null)).toBeNull();
    expect(recordLabel(base as MissionInstance)).toBe('Done');
    expect(recordLabel({ ...base, reduced: true } as MissionInstance)).toBe('Recorded');
    expect(recordLabel({ ...base, status: 'rest' } as MissionInstance)).toBe('Recorded');
  });
});
