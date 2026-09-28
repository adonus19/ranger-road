import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoadDatabase } from '../../core/persistence/road-database';
import { JournalStore, MORNING_PROMPT } from './journal-store';

const openDatabase = RoadDatabase.open.bind(RoadDatabase);

function isolatedStore(): { store: JournalStore; name: string } {
  const name = `journal-test-${crypto.randomUUID()}`;
  vi.spyOn(RoadDatabase, 'open').mockImplementation(() => openDatabase(name));
  return { store: new JournalStore(), name };
}

afterEach(() => vi.restoreAllMocks());

describe('JournalStore', () => {
  it('keeps separate immutable Morning Watch records on the same day', async () => {
    const { store, name } = isolatedStore();
    const first = await store.saveMorning('2026-09-26', '  Listen before solving.  ');
    const second = await store.saveMorning('2026-09-26', 'Make time after dinner.');

    const database = await openDatabase(name);
    const saved = await database.getAllHistorical('journalEntries');
    expect(saved).toHaveLength(2);
    expect(saved.map((entry) => entry.response)).toContain('Listen before solving.');
    expect(saved.map((entry) => entry.response)).toContain('Make time after dinner.');
    expect(first.prompt).toBe(MORNING_PROMPT);
    await expect(
      database.addHistorical('journalEntries', first as typeof first & { id: string }),
    ).rejects.toThrow();
    database.close();
    expect(second.id).not.toBe(first.id);
  });

  it('keeps the Evening prompts with readable answers and lists watches newest first', async () => {
    const { store, name } = isolatedStore();
    await store.saveMorning('2026-09-25', 'Be present.');
    const evening = await store.saveEvening('2026-09-26', {
      win: '  Called my daughter. ',
      missedStandard: '',
      gratitude: ' Quiet dinner. ',
      tomorrow: ' Ask what would help. ',
    });
    const database = await openDatabase(name);
    await database.addHistorical('journalEntries', {
      id: 'trial-reflection-1',
      date: '2026-09-26',
      type: 'trial-reflection',
      prompt: 'Trial reflection',
      response: 'Kept for later Journal support.',
    });
    database.close();

    expect(evening.prompt).toBe('Win\nMissed standard\nGratitude\nTomorrow');
    expect(evening.response).toBe(
      'Win: Called my daughter.\nGratitude: Quiet dinner.\nTomorrow: Ask what would help.',
    );
    expect((await store.listWatches()).map((entry) => entry.type)).toEqual([
      'evening-watch',
      'morning-watch',
    ]);
  });

  it('does not save an empty or whitespace-only watch', async () => {
    const { store } = isolatedStore();
    await expect(store.saveMorning('2026-09-26', '  ')).rejects.toThrow('Write a short answer');
    await expect(
      store.saveEvening('2026-09-26', {
        win: '',
        missedStandard: ' ',
        gratitude: '',
        tomorrow: '',
      }),
    ).rejects.toThrow('Write at least one line');
    expect(await store.listWatches()).toEqual([]);
  });
});
