import { describe, expect, it } from 'vitest';
import { isBackupReminderDue } from './backup-reminder';

// 2026-10-11 is a Sunday; the week runs Monday 2026-10-05 to Sunday 2026-10-11.
describe('isBackupReminderDue', () => {
  const sunday = '2026-10-11';

  it('shows on a Sunday with no copy ever saved', () => {
    expect(isBackupReminderDue(sunday, null, null)).toBe(true);
  });

  it('stays quiet on every other day', () => {
    for (const day of ['2026-10-05', '2026-10-08', '2026-10-10', '2026-10-12']) {
      expect(isBackupReminderDue(day, null, null)).toBe(false);
    }
  });

  it('stays quiet once a copy was saved this week, even on Monday morning', () => {
    expect(isBackupReminderDue(sunday, '2026-10-05T12:00:00', null)).toBe(false);
    expect(isBackupReminderDue(sunday, '2026-10-11T08:00:00', null)).toBe(false);
  });

  it('shows when the last copy is from an earlier week', () => {
    expect(isBackupReminderDue(sunday, '2026-10-04T20:00:00', null)).toBe(true);
  });

  it('hides for the day after "Not today", and returns the next Sunday', () => {
    expect(isBackupReminderDue(sunday, null, sunday)).toBe(false);
    expect(isBackupReminderDue('2026-10-18', null, sunday)).toBe(true);
  });
});
