import { describe, expect, it } from 'vitest';
import { getTrialWindow } from './trial-window';

// Day 1 Monday Oct 5; Gate Trial passed Monday Nov 2, so Chapter II runs Nov 3 – Nov 29.
const start = '2026-10-05';
const gatePass = [{ trialId: 'gate-trial', date: '2026-11-02' }];

describe('getTrialWindow', () => {
  it('is closed before its chapter, then opens the Monday after Week 8', () => {
    expect(getTrialWindow(start, '2026-10-20', [], 'three-mile-trial').chapter).toBeNull();
    const week8 = getTrialWindow(start, '2026-11-25', gatePass, 'three-mile-trial');
    expect(week8.attemptToday).toBe(false);
    expect(week8.nextAttempt).toBe('2026-11-30');
    expect(getTrialWindow(start, '2026-11-30', gatePass, 'three-mile-trial').attemptToday).toBe(
      true,
    );
    expect(getTrialWindow(start, '2026-12-01', gatePass, 'three-mile-trial').nextAttempt).toBe(
      '2026-12-03',
    );
  });

  it('reports the pass and stops offering attempts', () => {
    const passed = [...gatePass, { trialId: 'three-mile-trial', date: '2026-11-30' }];
    const window = getTrialWindow(start, '2026-11-30', passed, 'three-mile-trial');
    expect(window.pass?.date).toBe('2026-11-30');
    expect(window.attemptToday).toBe(false);
  });
});
