import { describe, expect, it } from 'vitest';
import type { TrialResult } from '../domain/models';
import { getChapterOneSchedule } from './campaign';
import {
  getNextAttempt,
  getNextChapterStart,
  isTrialAvailable,
  resolveCampaignPosition,
  withTrialDay,
  type TrialRecord,
} from './campaign-position';
import type { ChapterProgram } from './chapter-program';
import { chapterOneProgram } from './chapter-one.program';
import {
  getActivityChoices,
  getDayMissions,
  getDayOrders,
  getWorkoutChoices,
} from './chapter-orders';

const gateAttempt = chapterOneProgram.trialAttempt!;

/** A stand-in Chapter II with the real shape: weeks 5–8 and its own trial. */
const chapterTwo: ChapterProgram = {
  ...chapterOneProgram,
  chapter: { ...chapterOneProgram.chapter, id: 'chapter-2', number: 2, weeks: [5, 6, 7, 8] },
  trial: { ...chapterOneProgram.trial, id: 'three-mile-trial', chapterId: 'chapter-2' },
  trialName: 'Three-Mile Trial',
  leadsIn: false,
  trialAttempt: {
    ...gateAttempt,
    activity: {
      ...gateAttempt.activity,
      title: 'Three-Mile Trial',
      plannedTrialId: 'three-mile-trial',
    },
  },
};
const programs = [chapterOneProgram, chapterTwo];

const pass = (trialId: string, date: string): TrialRecord => ({ trialId, date });
// A Monday Day 1: Week 4 ends Sunday 2026-11-01; the first Gate Trial attempt is 2026-11-02.
const start = '2026-10-05';

describe('resolveCampaignPosition', () => {
  it('returns nothing before Day 1 and rejects invalid dates', () => {
    expect(resolveCampaignPosition(start, '2026-10-04')).toBeNull();
    expect(() => resolveCampaignPosition(start, '2026-10-32')).toThrow(RangeError);
  });

  it('agrees with the Chapter I schedule for every day through the trial window', () => {
    for (const startDate of ['2026-10-05', '2026-10-08', '2026-10-11']) {
      for (let offset = 0; offset < 50; offset++) {
        const date = new Date(Date.UTC(2026, 9, 5 + offset)).toISOString().slice(0, 10);
        const schedule = getChapterOneSchedule(startDate, date);
        const chapter = resolveCampaignPosition(startDate, date)?.chapter;
        if (!schedule) {
          expect(chapter).toBeUndefined();
          continue;
        }
        expect(chapter).toMatchObject({
          week: schedule.week,
          contentWeek: schedule.contentWeek,
          weekday: schedule.weekday,
          afterLastWeek: schedule.afterTarget,
          attemptDay: schedule.attemptDay,
          campaignDay: schedule.campaignDay,
        });
      }
    }
  });

  it('stays in Chapter I without a pass, repeating Week 4 every day with the Gate Trial open', () => {
    const monday = resolveCampaignPosition(start, '2026-11-02', [], programs)!;
    expect(monday.chapter.program.chapter.id).toBe('chapter-1');
    expect(monday.chapter).toMatchObject({ week: 4, afterLastWeek: true, attemptDay: false });
    // Monday repeats Week 4's lighter Forge A while the trial waits.
    expect(getDayMissions(monday.chapter)[1]).toMatchObject({
      id: 'chapter-1-week-4-day-1-weekly',
      contentReferences: ['chapter-1-forge-a'],
    });
    expect(isTrialAvailable(monday.chapter)).toBe(true);
    const tuesday = resolveCampaignPosition(start, '2026-11-03', [], programs)!;
    expect(tuesday.chapter.attemptDay).toBe(false);
    expect(getNextAttempt(tuesday.chapter, '2026-11-03')).toBe('2026-11-03');
    expect(getNextAttempt(tuesday.chapter, '2026-11-06')).toBe('2026-11-06');
    expect(getNextAttempt(tuesday.chapter, '2026-10-20')).toBe('2026-11-02');
    const week4 = resolveCampaignPosition(start, '2026-10-29', [], programs)!;
    expect(isTrialAvailable(week4.chapter)).toBe(false);
  });

  it('makes the trial the order of a day it was taken on, after the last week only', () => {
    const tuesday = resolveCampaignPosition(start, '2026-11-03', [], programs)!.chapter;
    const taken = withTrialDay(tuesday, '2026-11-03', [pass('gate-trial', '2026-11-03')]);
    expect(taken.attemptDay).toBe(true);
    expect(getDayMissions(taken)[1]).toMatchObject({
      id: 'chapter-1-gate-trial-attempt-day-2-weekly',
      plannedTrialId: 'gate-trial',
    });
    // Another trial's day, or a day inside the chapter, keeps its own order.
    expect(withTrialDay(tuesday, '2026-11-03', [pass('three-mile-trial', '2026-11-03')])).toBe(
      tuesday,
    );
    // A moved Forge session on that day is dropped, not rescheduled.
    const moved = { ...tuesday, makeup: { primary: tuesday, optional: [], note: 'Moved.' } };
    expect(withTrialDay(moved, '2026-11-03', [pass('gate-trial', '2026-11-03')]).makeup).toBe(
      undefined,
    );
    const week4 = resolveCampaignPosition(start, '2026-10-27', [], programs)!.chapter;
    expect(withTrialDay(week4, '2026-10-27', [pass('gate-trial', '2026-10-27')])).toBe(week4);
  });

  it('starts Chapter II on Tuesday after a Monday pass, counting that Monday as Week 5', () => {
    const trials = [pass('gate-trial', '2026-11-02')];
    const passDay = resolveCampaignPosition(start, '2026-11-02', trials, programs)!;
    expect(passDay.chapter.program.chapter.id).toBe('chapter-1');
    expect(passDay.chapter).toMatchObject({ attemptDay: true, nextStart: '2026-11-03' });

    const tuesday = resolveCampaignPosition(start, '2026-11-03', trials, programs)!;
    expect(tuesday.awaitingNextChapter).toBe(false);
    expect(tuesday.chapter).toMatchObject({
      week: 5,
      contentWeek: 5,
      weekday: 2,
      leadIn: false,
      start: '2026-11-03',
      firstMonday: '2026-11-02',
      firstAttempt: '2026-11-30',
      campaignDay: 30,
    });
    expect(tuesday.chapter.program.chapter.id).toBe('chapter-2');
    expect(resolveCampaignPosition(start, '2026-11-29', trials, programs)!.chapter.week).toBe(8);
    const firstAttempt = resolveCampaignPosition(start, '2026-11-30', trials, programs)!;
    expect(firstAttempt.chapter).toMatchObject({ week: 8, afterLastWeek: true, attemptDay: false });
  });

  it('keeps Week 4’s easy days through Sunday after a Thursday pass, then starts Monday', () => {
    const trials = [pass('gate-trial', '2026-11-05')];
    const friday = resolveCampaignPosition(start, '2026-11-06', trials, programs)!;
    expect(friday.chapter.program.chapter.id).toBe('chapter-1');
    expect(friday.chapter).toMatchObject({ week: 4, attemptDay: false, nextStart: '2026-11-09' });
    const passDay = resolveCampaignPosition(start, '2026-11-05', trials, programs)!;
    expect(passDay.chapter.attemptDay).toBe(true);
    const monday = resolveCampaignPosition(start, '2026-11-09', trials, programs)!;
    expect(monday.chapter).toMatchObject({ week: 5, weekday: 1, firstAttempt: '2026-12-07' });
    expect(monday.chapter.program.chapter.id).toBe('chapter-2');
  });

  it('uses the first completed result as the pass and ignores other trials', () => {
    const trials = [
      pass('gate-trial', '2026-11-09'),
      pass('some-other-trial', '2026-10-20'),
      pass('gate-trial', '2026-11-05'),
    ];
    const position = resolveCampaignPosition(start, '2026-11-07', trials, programs)!;
    expect(position.chapter.pass?.date).toBe('2026-11-05');
  });

  it('starts Chapter II on the first attempt day for a pass saved before the window opened', () => {
    expect(getNextChapterStart('2026-10-31', '2026-11-02')).toBe('2026-11-02');
    const trials = [pass('gate-trial', '2026-10-31')];
    const position = resolveCampaignPosition(start, '2026-11-02', trials, programs)!;
    expect(position.chapter).toMatchObject({ week: 5, weekday: 1, start: '2026-11-02' });
  });

  it('shows the passed chapter as complete while the next chapter is not in the app', () => {
    const trials = [pass('gate-trial', '2026-11-02')];
    const passDay = resolveCampaignPosition(start, '2026-11-02', trials, [chapterOneProgram])!;
    expect(passDay.awaitingNextChapter).toBe(false);
    const next = resolveCampaignPosition(start, '2026-11-03', trials, [chapterOneProgram])!;
    expect(next.awaitingNextChapter).toBe(true);
    expect(next.chapter.program.chapter.id).toBe('chapter-1');
    expect(next.chapter.pass?.date).toBe('2026-11-02');
    expect(next.chapter.attemptDay).toBe(false);
  });

  it('carries the pass through to the third chapter', () => {
    const trials = [pass('gate-trial', '2026-11-02'), pass('three-mile-trial', '2026-12-03')];
    const sunday = resolveCampaignPosition(start, '2026-12-06', trials, programs)!;
    expect(sunday.chapter.program.chapter.id).toBe('chapter-2');
    expect(sunday.chapter.nextStart).toBe('2026-12-07');
    const monday = resolveCampaignPosition(start, '2026-12-07', trials, programs)!;
    expect(monday.awaitingNextChapter).toBe(true);
  });
});

describe('chapter orders', () => {
  it('names the chapter, week, and trial in mission IDs and orders', () => {
    const trials: TrialResult[] = [
      { id: 'gate', trialId: 'gate-trial', date: '2026-11-02', phaseResults: [], reflection: '' },
    ];
    const week5 = resolveCampaignPosition(start, '2026-11-04', trials, programs)!.chapter;
    expect(getDayMissions(week5).map((mission) => mission.id)).toEqual([
      'chapter-2-week-5-day-3-morning-watch',
      'chapter-2-week-5-day-3-weekly',
      'chapter-2-week-5-day-3-evening-watch',
    ]);
    const attempt = withTrialDay(
      resolveCampaignPosition(start, '2026-11-30', trials, programs)!.chapter,
      '2026-11-30',
      [pass('three-mile-trial', '2026-11-30')],
    );
    expect(getDayMissions(attempt)[1]).toMatchObject({
      id: 'chapter-2-three-mile-trial-attempt-day-1-weekly',
      plannedTrialId: 'three-mile-trial',
      week: 8,
    });
    expect(getDayOrders(attempt, 'yellow')[1]).toMatchObject({
      title: 'Three-Mile Trial waits for Green',
      guidance: 'A full Three-Mile Trial needs a Green readiness day.',
    });
  });

  it('keeps Chapter I’s mission IDs and workout choices', () => {
    const lead = resolveCampaignPosition('2026-10-08', '2026-10-08')!.chapter;
    expect(getDayMissions(lead)[1].id).toBe('chapter-1-lead-in-day-4-weekly');
    const friday = resolveCampaignPosition(start, '2026-10-09')!.chapter;
    expect(getActivityChoices(friday).map((choice) => choice.id)).toEqual([
      'chapter-1-week-1-day-5-weekly',
      'chapter-1-week-1-day-5-weekly-restoration',
    ]);
    expect(getWorkoutChoices(friday)).toEqual(['chapter-1-restoration']);
    const monday = resolveCampaignPosition(start, '2026-10-05')!.chapter;
    expect(getWorkoutChoices(monday)).toEqual(['chapter-1-forge-a', 'chapter-1-restoration']);
  });
});
