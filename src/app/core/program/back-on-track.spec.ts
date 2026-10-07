import { describe, expect, it } from 'vitest';
import type { MissionInstance } from '../domain/models';
import { needsBackOnTrack } from './back-on-track';

const start = '2026-10-05'; // Monday, Day 1
const record = { id: 'r', definitionId: 'd', status: 'rest' } as MissionInstance;
const none = () => [] as MissionInstance[];

describe('needsBackOnTrack', () => {
  it('offers the note after two ordered days in a row with nothing recorded', () => {
    expect(needsBackOnTrack(start, '2026-10-08', [], none)).toBe(true); // Tue, Wed missed
  });

  it('stays quiet when either day has a record, including a recorded Rest', () => {
    expect(
      needsBackOnTrack(start, '2026-10-08', [], (d) => (d === '2026-10-07' ? [record] : [])),
    ).toBe(false);
    expect(
      needsBackOnTrack(start, '2026-10-08', [], (d) => (d === '2026-10-06' ? [record] : [])),
    ).toBe(false);
  });

  it('does not count Sunday, or days before Day 1', () => {
    expect(needsBackOnTrack(start, '2026-10-12', [], none)).toBe(false); // Sat, Sun
    expect(needsBackOnTrack(start, '2026-10-06', [], none)).toBe(false); // Day 1 and before
  });

  it('looks only at the two days before today, never further back', () => {
    expect(
      needsBackOnTrack(start, '2026-10-09', [], (d) => (d === '2026-10-08' ? [record] : [])),
    ).toBe(false);
  });
});
