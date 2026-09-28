import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Campaign, ReadinessCheck, TrialDraft } from '../domain/models';
import { createGateTrialResult } from '../domain/trial';
import { completeGateTrialInput } from '../testing/gate-trial-fixture';
import { RoadDatabase } from './road-database';

const date = new Date().toISOString().slice(0, 10);
const checkedAt = new Date(Date.now() - 60_000).toISOString();
const green: ReadinessCheck = {
  id: 'trial-green',
  date,
  checkedAt,
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
const campaign: Campaign = {
  id: 'primary',
  startDate: date,
  currentChapterId: 'chapter-1',
  status: 'active',
};

async function preparedDatabase(): Promise<{ name: string; database: RoadDatabase }> {
  const name = `gate-draft-${crypto.randomUUID()}`;
  const database = await RoadDatabase.open(name);
  await database.putCampaign(campaign);
  await database.addReadinessCheck(green);
  return { name, database };
}

describe('Gate Trial draft persistence', () => {
  it('resumes partial entries and saves pain immediately, then keeps a stopped attempt', async () => {
    const { name, database } = await preparedDatabase();
    const started = await database.startTrialDraft(date);
    await expect(database.startTrialDraft(date)).rejects.toThrow(/active Gate Trial/);
    const edit = structuredClone(started);
    edit.phaseResults[0] = {
      phaseId: 'brisk-walk',
      metrics: { distanceMiles: 1.1, durationMinutes: 19 },
      responses: { knee: 'A little sore.' },
    };
    const partial = await database.saveTrialDraft(edit);
    expect(partial.revision).toBe(2);
    const pain = await database.recordTrialPain(started.id, {
      phaseId: 'brisk-walk',
      bodyArea: 'Knee',
      severity: 3,
      actionTaken: 'reduce',
    });
    expect(pain.trialAttemptId).toBe(started.id);
    await expect(database.saveTrialDraft(partial)).rejects.toThrow(/changed/);
    expect((await database.getAllHistorical('painEvents')).map((event) => event.id)).toEqual([
      pain.id,
    ]);
    expect(await database.getTrialPainForAttempt(started.id)).toEqual([pain]);
    database.close();

    const reopened = await RoadDatabase.open(name);
    const resumed = await reopened.getActiveTrialDraft();
    expect(resumed?.phaseResults[0]).toEqual(partial.phaseResults[0]);
    expect(resumed?.painEvents).toEqual([pain]);
    expect(resumed?.revision).toBe(3);
    const stopped = await reopened.finishTrialDraft(started.id, 'stopped');
    expect(stopped).toMatchObject({ id: started.id, outcome: 'stopped' });
    expect(stopped.phaseResults[0]).toEqual(partial.phaseResults[0]);
    expect(stopped.painEvents).toEqual([pain]);
    expect(await reopened.getActiveTrialDraft()).toBeUndefined();
    expect(await reopened.getTrialResultsForTrial('gate-trial')).toEqual([]);
    expect(await reopened.getStoppedTrialAttemptsForTrial('gate-trial')).toEqual([stopped]);
    reopened.close();
  });

  it('keeps partial edits after readiness turns Yellow but refuses physical advancement', async () => {
    const { database } = await preparedDatabase();
    const started = await database.startTrialDraft(date);
    await database.addReadinessCheck({
      ...green,
      id: 'trial-yellow',
      checkedAt: new Date().toISOString(),
      poorSleep: true,
      status: 'yellow',
    });
    const partial = structuredClone(started);
    partial.phaseResults[0] = {
      phaseId: 'brisk-walk',
      responses: { knee: 'Pain rose, so I stopped.' },
    };
    const saved = await database.saveTrialDraft(partial);
    expect(saved.phaseResults[0].responses?.['knee']).toContain('stopped');
    await expect(
      database.saveTrialDraft({ ...saved, currentPhaseIndex: 1 }),
    ).rejects.toThrow();
    expect(await database.getActiveTrialDraft()).toEqual(saved);
    await database.finishTrialDraft(started.id, 'stopped');
    database.close();
  });

  it('moves through the five phases and atomically appends a complete result', async () => {
    const { name, database } = await preparedDatabase();
    let draft: TrialDraft = await database.startTrialDraft(date);
    const completed = createGateTrialResult({
      ...completeGateTrialInput(green),
      recordedAt: new Date().toISOString(),
    });
    for (let index = 0; index < 4; index += 1) {
      const edited = structuredClone(draft);
      edited.phaseResults[index] = completed.phaseResults[index];
      edited.currentPhaseIndex = index + 1;
      draft = await database.saveTrialDraft(edited);
    }
    const oath = structuredClone(draft);
    oath.phaseResults[4] = completed.phaseResults[4];
    draft = await database.saveTrialDraft(oath);
    const result = await database.finishTrialDraft(draft.id, 'completed');
    expect(result.phaseResults).toEqual(completed.phaseResults);
    expect(result.postMissionFunction).toBeUndefined();
    expect(await database.getActiveTrialDraft()).toBeUndefined();
    database.close();

    const reopened = await RoadDatabase.open(name);
    expect(await reopened.getTrialResultsForTrial('gate-trial')).toEqual([result]);
    expect(await reopened.getStoppedTrialAttemptsForTrial('gate-trial')).toEqual([]);
    await expect(reopened.finishTrialDraft(draft.id, 'completed')).rejects.toThrow(/not found/);
    reopened.close();
  });

  it('keeps the draft when a later non-Green check blocks completion', async () => {
    const { database } = await preparedDatabase();
    let draft: TrialDraft = await database.startTrialDraft(date);
    const completed = createGateTrialResult({
      ...completeGateTrialInput(green),
      recordedAt: new Date().toISOString(),
    });
    for (let index = 0; index < 4; index += 1) {
      const edited = structuredClone(draft);
      edited.phaseResults[index] = completed.phaseResults[index];
      edited.currentPhaseIndex = index + 1;
      draft = await database.saveTrialDraft(edited);
    }
    draft = await database.saveTrialDraft({
      ...draft,
      phaseResults: [...draft.phaseResults.slice(0, 4), completed.phaseResults[4]],
    });
    await database.addReadinessCheck({
      ...green,
      id: 'trial-red',
      checkedAt: new Date().toISOString(),
      energy: 1,
      status: 'red',
    });
    await expect(database.finishTrialDraft(draft.id, 'completed')).rejects.toThrow(/Green/);
    expect((await database.getActiveTrialDraft())?.id).toBe(draft.id);
    expect(await database.getTrialResultsForTrial('gate-trial')).toEqual([]);
    await database.finishTrialDraft(draft.id, 'stopped');
    database.close();
  });
});
