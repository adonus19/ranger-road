import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { RoadDatabase } from '../persistence/road-database';
import { RoadHistory } from './road-history';

describe('RoadHistory', () => {
  it('shows recent sessions in date order and uses save time within a day', async () => {
    const name = `road-history-${crypto.randomUUID()}`;
    const originalOpen = RoadDatabase.open.bind(RoadDatabase);
    const open = vi.spyOn(RoadDatabase, 'open').mockImplementation(() => originalOpen(name));

    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const history = new RoadHistory();
      const base = { distance: 1, duration: 20, terrain: 'Path', rpe: 3 };
      vi.setSystemTime('2026-09-25T12:00:00.000Z');
      await history.add({ ...base, id: 'older-day', date: '2026-09-25' });
      vi.setSystemTime('2026-09-26T12:00:00.000Z');
      await history.add({ ...base, id: 'z-first', date: '2026-09-26' });
      vi.setSystemTime('2026-09-26T12:01:00.000Z');
      await history.add({ ...base, id: 'a-later', date: '2026-09-26' });

      expect((await history.recent(2)).map((session) => session.id)).toEqual(['a-later', 'z-first']);
      expect((await history.forDate('2026-09-26')).map((session) => session.id)).toEqual(['a-later', 'z-first']);
      expect(await history.recent(0)).toEqual([]);
      await expect(history.recent(-1)).rejects.toThrow();
    } finally {
      vi.useRealTimers();
      open.mockRestore();
    }
  });
});
