import { describe, expect, it } from 'vitest';
import {
  allowedMissionOutcomes,
  createMissionRecord,
  missionNeedsReadiness,
} from '../domain/mission';
import {
  chapterOneWatchContent,
  getChapterOneActivityChoicesForDate,
  getChapterOneMissionsForDate,
} from './chapter-one-missions';

describe('Chapter I date-specific missions', () => {
  it('uses the dated Scripture and restoration plan while preserving daily watch IDs', () => {
    const missions = getChapterOneMissionsForDate('2026-09-07', '2026-09-09');

    expect(missions.map((mission) => mission.title)).toEqual([
      'Morning Watch',
      'Restoration',
      'Evening Watch',
    ]);
    expect(missions.map((mission) => mission.missionType)).toEqual([
      'scripture',
      'restoration',
      'reflection',
    ]);
    expect(missions.every((mission) => mission.chapterId === 'chapter-1')).toBe(true);
    expect(missions.every((mission) => mission.week === 1 && mission.day === 3)).toBe(true);
    expect(missions[0].scriptureReference).toBe('James 1:19–25');
    expect(missions[1].contentReferences).toEqual(['chapter-1-restoration']);
    expect(missions[1].readingMinutes).toBe(10);
    expect(chapterOneWatchContent['morning-watch']).toContain(
      'What does my family need from me today?',
    );
  });

  it('uses the Week 1 Thursday content in a lead-in, then restarts full Week 1 on Monday', () => {
    const dayOne = getChapterOneMissionsForDate('2026-09-10', '2026-09-10');
    const dayEight = getChapterOneMissionsForDate('2026-09-10', '2026-09-17');

    expect(dayOne[1]).toMatchObject({
      week: 0,
      day: 4,
      title: 'Forge B',
      missionType: 'strength',
      contentReferences: ['chapter-1-forge-b'],
    });
    expect(dayOne[1].id).toBe('chapter-1-lead-in-day-4-weekly');
    expect(dayEight[1]).toMatchObject({ week: 1, day: 4, title: 'Forge B' });
    expect(dayEight[1].id).not.toBe(dayOne[1].id);
    expect(getChapterOneMissionsForDate('2026-09-10', '2026-09-21')[1]).toMatchObject({
      week: 2,
      day: 1,
    });
  });

  it('keeps the Week 4 template after day 28 without auto-scheduling the Gate Trial', () => {
    const dayTwentyEight = getChapterOneMissionsForDate('2026-09-07', '2026-10-04');
    const dayTwentyNine = getChapterOneMissionsForDate('2026-09-07', '2026-10-05');
    const dayThirtySix = getChapterOneMissionsForDate('2026-09-07', '2026-10-12');
    expect(dayTwentyEight).toHaveLength(3);
    expect(dayTwentyEight[1]).toMatchObject({ week: 4, day: 7, missionType: 'reflection' });
    expect(missionNeedsReadiness(dayTwentyEight[1])).toBe(false);
    expect(dayTwentyEight.some((mission) => mission.missionType === 'trial')).toBe(false);
    expect(dayTwentyNine).toHaveLength(3);
    expect(dayTwentyNine[1]).toMatchObject({
      week: 4,
      day: 1,
      title: 'Forge A at reduced effort',
      missionType: 'strength',
    });
    expect(dayThirtySix[1].id).toBe(dayTwentyNine[1].id);
    expect(dayThirtySix.some((mission) => mission.missionType === 'trial')).toBe(false);
    expect(getChapterOneMissionsForDate('2026-09-07', '2026-09-06')).toEqual([]);
  });

  it('rejects invalid dates before creating any mission', () => {
    expect(() => getChapterOneMissionsForDate('2026-02-30', '2026-03-01')).toThrow(RangeError);
    expect(() => getChapterOneMissionsForDate('2026-09-07', '2026-09-31')).toThrow(RangeError);
  });
});

describe('Chapter I main activity choices', () => {
  it('separates the documented Week 3 knot practice from restoration', () => {
    const date = '2026-09-23';
    const [restoration, skill] = getChapterOneActivityChoicesForDate('2026-09-07', date);
    const legacy = getChapterOneMissionsForDate('2026-09-07', date)[1];

    expect(restoration).toMatchObject({
      id: legacy.id,
      title: 'Restoration',
      missionType: 'restoration',
    });
    expect(skill).toMatchObject({
      id: `${legacy.id}-skill`,
      title: 'Knot practice',
      missionType: 'fieldcraft',
      requiresReadiness: false,
      contentReferences: ['chapter-1-content-v1-week-3-day-3-fieldcraft'],
      activityDetails: ['Learn and practice square knot, bowline, and two half hitches.'],
    });
    expect(legacy.title).toBe('Restoration and knot practice');
    expect(missionNeedsReadiness(restoration)).toBe(true);
    expect(missionNeedsReadiness(skill)).toBe(false);
    expect(allowedMissionOutcomes(restoration, null, date)).toEqual(['rest']);
    expect(allowedMissionOutcomes(skill, null, date)).toEqual(['full', 'reduced', 'rest']);
    expect(() =>
      createMissionRecord({
        id: 'restoration-attempt',
        definition: restoration,
        date,
        outcome: 'full',
        recordedAt: '2026-09-23T12:00:00.000Z',
      }),
    ).toThrow(/Check readiness/);

    const record = createMissionRecord({
      id: 'skill-attempt',
      definition: skill,
      date,
      outcome: 'full',
      recordedAt: '2026-09-23T12:00:00.000Z',
    });
    expect(record.definitionSnapshot).toMatchObject({
      id: skill.id,
      title: 'Knot practice',
      missionType: 'fieldcraft',
      requiresReadiness: false,
    });
  });

  it('keeps weeks without a specified fieldcraft activity on restoration', () => {
    expect(getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-09')).toHaveLength(1);
    expect(getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-30')).toHaveLength(1);
    const [restoration, tools] = getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-16');
    expect(restoration.title).toBe('Restoration');
    expect(tools.title).toBe('Tool inspection');
    expect(tools.activityDetails?.[0]).toContain('Inspect axe/maul');
  });

  it('offers both documented Friday routes as physical work', () => {
    const date = '2026-09-11';
    const [conditioning, restoration] = getChapterOneActivityChoicesForDate('2026-09-07', date);
    const legacy = getChapterOneMissionsForDate('2026-09-07', date)[1];

    expect(conditioning).toMatchObject({
      id: legacy.id,
      title: '20–25-minute easy walk',
      missionType: 'conditioning',
    });
    expect(restoration).toMatchObject({
      id: `${legacy.id}-restoration`,
      title: 'Restoration',
      missionType: 'restoration',
    });
    expect(restoration.estimatedMinutes).toBeUndefined();
    expect(restoration.activityDetails).toBeUndefined();
    expect(legacy.title).toBe('20–25-minute easy walk');
    expect([conditioning, restoration].every(missionNeedsReadiness)).toBe(true);
    expect(allowedMissionOutcomes(restoration, null, date)).toEqual(['rest']);
  });

  it('keeps the Week 4 Saturday Gate Trial as a plan that the generic logger cannot complete', () => {
    const [morning, planned, evening] = getChapterOneMissionsForDate('2026-09-07', '2026-10-03');
    expect(morning.scriptureReference).toBe('2 Timothy 4:7');
    expect(planned).toMatchObject({
      title: 'Gate Trial',
      missionType: 'trial',
      plannedTrialId: 'gate-trial',
      contentReferences: ['gate-trial'],
    });
    expect(allowedMissionOutcomes(planned, null, '2026-10-03')).toEqual([]);
    expect(() =>
      createMissionRecord({
        id: 'generic-trial',
        definition: planned,
        date: '2026-10-03',
        outcome: 'full',
        recordedAt: '2026-10-03T12:00:00.000Z',
      }),
    ).toThrow(/trial flow/);
    expect(evening.title).toBe('Evening Watch');
  });

  it('keeps other days and the Week 4 template stable', () => {
    const monday = getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-07');
    expect(monday).toEqual([getChapterOneMissionsForDate('2026-09-07', '2026-09-07')[1]]);
    expect(getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-06')).toEqual([]);

    const fourthWeek = getChapterOneActivityChoicesForDate('2026-09-07', '2026-09-30');
    const afterTarget = getChapterOneActivityChoicesForDate('2026-09-07', '2026-10-07');
    expect(afterTarget.map((choice) => choice.id)).toEqual(fourthWeek.map((choice) => choice.id));
    expect(afterTarget.map((choice) => choice.missionType)).toEqual(['restoration']);
  });
});
