import { describe, expect, it } from 'vitest';
import { chapterOneDefinition } from '../core/program/chapter-one.seed';
import { formatChapterLine } from '../core/program/program-catalog';
import { formatLongDate, formatShortDate } from './format-date';

describe('display formatting', () => {
  it('reads a civil date as written, without shifting it across time zones', () => {
    expect(formatLongDate('2026-10-05')).toBe('Monday, October 5');
    expect(formatLongDate('2026-03-08')).toBe('Sunday, March 8');
  });

  it('shortens a civil date for history rows', () => {
    expect(formatShortDate('2026-09-26')).toBe('Sat, Sep 26');
    expect(formatShortDate('2026-03-08')).toBe('Sun, Mar 8');
  });

  it('builds the chapter line from the chapter definition', () => {
    expect(formatChapterLine(chapterOneDefinition)).toBe('Chapter I · Weeks 1–4');
  });
});
