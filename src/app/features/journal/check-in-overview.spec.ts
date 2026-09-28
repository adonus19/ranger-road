import { describe, expect, it } from 'vitest';
import type { SavedMeasurement } from '../../core/domain/measurement';
import { describeCheckIn } from './check-in-overview';
import { measurementLines } from './measurement-summary';

const start = '2026-09-14';
const held: SavedMeasurement = {
  id: 'held',
  kind: 'check-in',
  date: '2026-10-12',
  recordedAt: '2026-10-12T12:00:00.000Z',
  weight: 221.6,
  waist: 41.5,
  restingHeartRate: 68,
  testsHeld: true,
};

describe('describeCheckIn', () => {
  it('says nothing before Day 1 and names the Day 1 check-in when it is due', () => {
    expect(describeCheckIn(start, '2026-09-13', [])).toBeNull();
    expect(describeCheckIn(start, '2026-09-16', [])).toMatchObject({
      title: 'Day 1 check-in',
      status: 'due',
      reminder: 'Record where you’re starting.',
      queryParams: {},
    });
  });

  it('offers the held tests unless today is Red, then reports when the next one opens', () => {
    expect(describeCheckIn(start, '2026-10-14', [held])).toMatchObject({
      title: 'Check-in tests',
      reminder: 'Add the tests a Red day held back.',
      queryParams: { part: 'tests' },
    });
    const onRed = describeCheckIn(start, '2026-10-14', [held], 'red');
    expect(onRed?.reminder).toBeUndefined();
    expect(onRed?.text).toBe('A Red day held the tests back. Add them on a better day.');

    const done = describeCheckIn(start, '2026-10-20', [{ ...held, testsHeld: undefined }]);
    expect(done).toMatchObject({ title: 'Monthly check-in', status: 'done' });
    expect(done?.text).toBe('Done on Day 29. The next one opens on Day 57.');
    expect(done?.reminder).toBeUndefined();
  });
});

describe('measurementLines', () => {
  it('keeps each line whole: no line ends on a separator', () => {
    expect(
      measurementLines({ ...held, testsHeld: undefined, squatDepth: 'below-parallel', capabilityRating: 4 }),
    ).toEqual(['221.6 lb · 41.5 in · 68 bpm', 'Squat below parallel', 'Capability 4']);
  });
});
