import { describe, expect, it } from 'vitest';
import { RestClock, formatRest } from './rest-clock';

const start = '2026-10-07T12:00:00.000Z';
const at = (seconds: number) => Date.parse(start) + seconds * 1000;

describe('RestClock', () => {
  it('counts up from the set time', () => {
    const clock = new RestClock();
    clock.sync(start);
    expect(clock.elapsed(at(75))).toBe(75);
  });

  it('freezes while paused and carries on from there', () => {
    const clock = new RestClock();
    clock.sync(start);
    clock.pause(at(20));
    expect(clock.elapsed(at(90))).toBe(20);
    clock.resume(at(90));
    expect(clock.elapsed(at(100))).toBe(30);
  });

  it('resets to zero, staying paused if it was paused', () => {
    const clock = new RestClock();
    clock.sync(start);
    clock.reset(at(40));
    expect(clock.elapsed(at(50))).toBe(10);
    clock.pause(at(50));
    clock.reset(at(60));
    expect(clock.elapsed(at(90))).toBe(0);
    expect(clock.paused).toBe(true);
  });

  it('starts fresh for the next set and reads zero with no rest', () => {
    const clock = new RestClock();
    clock.sync(start);
    clock.pause(at(10));
    clock.sync('2026-10-07T12:05:00.000Z');
    expect(clock.paused).toBe(false);
    clock.sync(undefined);
    expect(clock.elapsed(at(999))).toBe(0);
  });

  it('formats minutes and seconds', () => {
    expect(formatRest(300)).toBe('5:00');
    expect(formatRest(65)).toBe('1:05');
  });
});
