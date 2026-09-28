import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import type { ReadinessCheck } from '../domain/models';
import { createGateTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { RoadDatabase } from '../persistence/road-database';
import { TrialHistory } from './trial-history';

const readiness: ReadinessCheck = {
  id: 'gate-green',
  date: '2026-10-22',
  checkedAt: '2026-10-22T11:00:00.000Z',
  sleepHours: 7,
  poorSleep: false,
  energy: 3,
  backPain: 0,
  shoulderPain: 0,
  neckPain: 0,
  redFlags: {
    significantSymptomIncrease: false,
    newNeurologicalOrRadiatingSymptoms: false,
    illness: false,
    otherConcerningSymptoms: false,
  },
  status: 'green',
};

describe('TrialHistory', () => {
  it('saves offline and returns completed trials newest first', async () => {
    const name = `trial-history-${crypto.randomUUID()}`;
    const originalOpen = RoadDatabase.open.bind(RoadDatabase);
    const open = vi.spyOn(RoadDatabase, 'open').mockImplementation(() => originalOpen(name));
    try {
      const database = await RoadDatabase.open();
      await database.putCampaign({
        id: 'primary',
        startDate: '2026-09-25',
        currentChapterId: 'chapter-1',
        status: 'active',
      });
      await database.addReadinessCheck(readiness);
      database.close();

      const history = new TrialHistory();
      const base = {
        ...completeGateTrialInput(readiness),
        postMissionFunction: 'Present afterward.',
      };
      const first = createGateTrialResult({ ...base, id: 'first', recordedAt: '2026-10-22T16:00:00.000Z' });
      const second = createGateTrialResult({ ...base, id: 'second', recordedAt: '2026-10-22T17:00:00.000Z' });
      await history.add(first);
      await history.add(second);

      expect((await history.forTrial('gate-trial')).map((record) => record.id))
        .toEqual(['second', 'first']);
    } finally {
      open.mockRestore();
    }
  });
});
