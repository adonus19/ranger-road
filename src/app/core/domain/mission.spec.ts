import { describe, expect, it } from 'vitest';
import type { MissionDefinition, ReadinessCheck } from './models';
import { allowedMissionOutcomes, createMissionRecord, missionNeedsReadiness } from './mission';

const definition: MissionDefinition = {
  id: 'chapter-1-week-1-day-1-weekly',
  chapterId: 'chapter-1',
  week: 1,
  day: 1,
  missionType: 'strength',
  title: 'Strength / Forge A or Forge B',
  required: true,
  contentReferences: [],
};

const green: ReadinessCheck = {
  id: 'readiness-green',
  date: '2026-09-07',
  checkedAt: '2026-09-07T11:00:00.000Z',
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

const yellow: ReadinessCheck = {
  ...green,
  id: 'readiness-yellow',
  poorSleep: true,
  status: 'yellow',
};

const red: ReadinessCheck = {
  ...green,
  id: 'readiness-red',
  energy: 1,
  status: 'red',
};

const base = {
  id: 'mission-attempt-1',
  definition,
  date: '2026-09-07',
  recordedAt: '2026-09-07T13:00:00.000Z',
};

describe('mission outcomes', () => {
  it('requires readiness for physical types even when a definition tries to opt out', () => {
    for (const missionType of ['strength', 'conditioning', 'restoration', 'trial'] as const) {
      expect(missionNeedsReadiness({ ...definition, missionType })).toBe(true);
      expect(missionNeedsReadiness({ ...definition, missionType, requiresReadiness: false })).toBe(true);
    }
  });

  it('requires readiness for fieldcraft by default and exempts only explicit nonexertional work', () => {
    const fieldcraft = { ...definition, missionType: 'fieldcraft' as const };
    expect(missionNeedsReadiness(fieldcraft)).toBe(true);
    expect(missionNeedsReadiness({ ...fieldcraft, requiresReadiness: true })).toBe(true);
    expect(missionNeedsReadiness({ ...fieldcraft, requiresReadiness: false })).toBe(false);
    expect(missionNeedsReadiness({ ...definition, missionType: 'scripture' })).toBe(false);
    expect(missionNeedsReadiness({ ...definition, missionType: 'reflection' })).toBe(false);
    expect(missionNeedsReadiness({ ...definition, missionType: 'leadership', requiresReadiness: true })).toBe(true);
  });

  it('offers only outcomes allowed by same-day readiness', () => {
    expect(allowedMissionOutcomes(definition, null, base.date)).toEqual(['rest']);
    expect(allowedMissionOutcomes(definition, { ...green, date: '2026-09-06' }, base.date))
      .toEqual(['rest']);
    expect(allowedMissionOutcomes(definition, green, base.date))
      .toEqual(['full', 'reduced', 'restoration', 'rest']);
    expect(allowedMissionOutcomes(definition, yellow, base.date))
      .toEqual(['reduced', 'restoration', 'rest']);
    expect(allowedMissionOutcomes(definition, red, base.date))
      .toEqual(['restoration', 'rest']);
    expect(allowedMissionOutcomes({ ...definition, missionType: 'scripture' }, red, base.date))
      .toEqual(['full', 'reduced', 'rest']);
    expect(allowedMissionOutcomes(definition, { ...red, status: 'green' }, base.date))
      .toEqual(['rest']);
  });

  it('allows a full green mission and captures its original definition', () => {
    const planned = structuredClone(definition);
    const record = createMissionRecord({ ...base, definition: planned, outcome: 'full', readiness: green });
    planned.title = 'Changed program content';

    expect(record).toMatchObject({
      definitionId: definition.id,
      status: 'completed',
      reduced: false,
      completedAt: base.recordedAt,
    });
    expect(record.definitionSnapshot?.title).toBe(definition.title);
  });

  it('permits reduced or restoration outcomes on yellow, but no full physical mission', () => {
    expect(() => createMissionRecord({ ...base, outcome: 'full', readiness: yellow })).toThrow(/Yellow/);
    expect(createMissionRecord({ ...base, outcome: 'reduced', readiness: yellow })).toMatchObject({
      status: 'completed',
      reduced: true,
    });
    expect(createMissionRecord({ ...base, outcome: 'restoration', readiness: yellow })).toMatchObject({
      status: 'restoration',
      reduced: true,
    });
  });

  it('permits only restoration or rest on red, even when restoration was planned', () => {
    expect(() => createMissionRecord({ ...base, outcome: 'full', readiness: red })).toThrow(/Red/);
    expect(() => createMissionRecord({ ...base, outcome: 'reduced', readiness: red })).toThrow(/Red/);
    expect(() => createMissionRecord({
      ...base,
      definition: { ...definition, missionType: 'restoration' },
      outcome: 'full',
      readiness: red,
    })).toThrow(/Red/);
    expect(createMissionRecord({ ...base, outcome: 'restoration', readiness: red }).status).toBe(
      'restoration',
    );
    expect(createMissionRecord({ ...base, outcome: 'rest', notes: 'Illness today.' })).toMatchObject({
      status: 'rest',
      reduced: false,
      notes: 'Illness today.',
    });
  });

  it('requires a same-day, internally consistent readiness check for physical work', () => {
    expect(() => createMissionRecord({ ...base, outcome: 'full' })).toThrow(/Check readiness/);
    expect(() => createMissionRecord({
      ...base,
      outcome: 'full',
      readiness: { ...green, date: '2026-09-06' },
    })).toThrow(/Check readiness/);
    expect(() => createMissionRecord({
      ...base,
      outcome: 'full',
      readiness: { ...red, status: 'green' },
    })).toThrow(/does not match/);
  });

  it('keeps nonphysical watch practice available on a red day', () => {
    const watch = { ...definition, missionType: 'scripture' as const, title: 'Morning Watch' };
    expect(createMissionRecord({ ...base, definition: watch, outcome: 'full' }).status).toBe(
      'completed',
    );
    expect(() => createMissionRecord({ ...base, definition: watch, outcome: 'restoration' })).toThrow(
      /physical training/,
    );
  });

  it('enforces same-day readiness for exertional fieldcraft while allowing explicit nonexertional skill work', () => {
    const fieldcraft = { ...definition, missionType: 'fieldcraft' as const };
    const nonexertional = { ...fieldcraft, requiresReadiness: false };

    expect(allowedMissionOutcomes(fieldcraft, null, base.date)).toEqual(['rest']);
    expect(allowedMissionOutcomes(fieldcraft, { ...green, date: '2026-09-06' }, base.date))
      .toEqual(['rest']);
    expect(allowedMissionOutcomes(fieldcraft, red, base.date)).toEqual(['restoration', 'rest']);
    expect(() => createMissionRecord({ ...base, definition: fieldcraft, outcome: 'full' }))
      .toThrow(/Check readiness/);
    expect(() => createMissionRecord({ ...base, definition: fieldcraft, outcome: 'full', readiness: red }))
      .toThrow(/Red/);
    expect(createMissionRecord({ ...base, definition: nonexertional, outcome: 'full' }))
      .toMatchObject({ status: 'completed', reduced: false });
  });

  it('requires a reason for rest', () => {
    expect(() => createMissionRecord({ ...base, outcome: 'rest', notes: '   ' })).toThrow(
      /reason for rest/,
    );
  });
});
