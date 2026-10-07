import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntervalPlan } from '../../core/domain/models';
import { IntervalTimer } from './interval-timer';

const plan: IntervalPlan = { warmupMinutes: 1, rounds: 2, briskSeconds: 60, easySeconds: 120 };

function setup(inputs: { plan?: IntervalPlan | null; editable?: boolean } = {}) {
  const fixture = TestBed.createComponent(IntervalTimer);
  if (inputs.plan !== undefined) fixture.componentRef.setInput('plan', inputs.plan);
  if (inputs.editable) fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const text = (selector: string) => root.querySelector(selector)?.textContent?.trim();
  const press = (label: string) => {
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
    fixture.detectChanges();
  };
  const advance = (seconds: number) => {
    vi.advanceTimersByTime(seconds * 1000);
    fixture.detectChanges();
  };
  return { fixture, root, text, press, advance };
}

describe('IntervalTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is closed and idle until the person starts it', () => {
    const { root, text } = setup({ plan });
    expect(root.querySelector('details')?.open).toBe(false);
    expect(text('.timer__plan')).toBe(
      '1 minute easy, then 2 rounds of 1 minute brisk / 2 minutes easy.',
    );
    expect(root.querySelector('.timer__face')).toBeNull();
    vi.advanceTimersByTime(60_000);
    expect(root.querySelector('.timer__face')).toBeNull();
  });

  it('counts down and moves from warm-up to brisk to easy', () => {
    const { text, press, advance, root } = setup({ plan });
    press('Start timer');
    expect(text('.timer__phase')).toBe('Warm up');
    expect(text('.timer__clock')).toBe('1:00');
    advance(30);
    expect(text('.timer__clock')).toBe('0:30');
    advance(30);
    expect(text('.timer__phase')).toBe('Brisk');
    expect(text('.timer__round')).toBe('Round 1 of 2');
    expect(text('.timer__next')).toBe('Next: Easy');
    expect(root.querySelector('.visually-hidden[role="status"]')?.textContent).toContain('Brisk');
    advance(60);
    expect(text('.timer__phase')).toBe('Easy');
    expect(text('.timer__clock')).toBe('2:00');
  });

  it('pauses without losing time and resumes where it stopped', () => {
    const { text, press, advance } = setup({ plan });
    press('Start timer');
    advance(90);
    expect(text('.timer__clock')).toBe('0:30');
    press('Pause');
    advance(600);
    expect(text('.timer__clock')).toBe('0:30');
    press('Resume');
    advance(10);
    expect(text('.timer__clock')).toBe('0:20');
  });

  it('catches up after the phone sleeps through several switches', () => {
    const { text, press, fixture } = setup({ plan });
    press('Start timer');
    vi.setSystemTime(Date.now() + 200_000);
    vi.advanceTimersByTime(250);
    fixture.detectChanges();
    expect(text('.timer__phase')).toBe('Easy');
    expect(text('.timer__round')).toBe('Round 1 of 2');
  });

  it('ends with a reminder to finish easy when the plan gives no cooldown length', () => {
    const { text, press, advance, root } = setup({ plan });
    press('Start timer');
    advance(60 + 2 * 180);
    expect(text('.timer__done p')).toBe('Intervals done. Finish the walk at an easy pace.');
    expect(root.querySelector('.timer__face')).toBeNull();
    press('Reset');
    expect(root.querySelector('.timer__start')).not.toBeNull();
  });

  it('stops and resets on Stop', () => {
    const { press, advance, root } = setup({ plan });
    press('Start timer');
    advance(20);
    press('Stop');
    expect(root.querySelector('.timer__start')).not.toBeNull();
    advance(100);
    expect(root.querySelector('.timer__face')).toBeNull();
  });

  it('remembers the sound switch on this device and defaults to on', () => {
    const first = setup({ plan });
    const box = first.root.querySelector<HTMLInputElement>('.timer__sound input')!;
    expect(box.checked).toBe(true);
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(localStorage.getItem('rangers-road.interval-timer-sound')).toBe('off');
    TestBed.resetTestingModule();
    const second = setup({ plan });
    expect(second.root.querySelector<HTMLInputElement>('.timer__sound input')!.checked).toBe(false);
  });

  it('lets the person set their own rounds and times, and rejects out-of-range numbers', () => {
    const { fixture, root, press, text } = setup({ editable: true });
    const fields = root.querySelectorAll<HTMLInputElement>('.timer__fields input');
    expect(text('.timer__plan')).toBe('5 rounds of 1 minute brisk / 2 minutes easy.');
    fields[0].value = '3';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = '45';
    fields[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(text('.timer__plan')).toBe('3 rounds of 45 seconds brisk / 2 minutes easy.');
    fields[2].value = '5';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelector('.timer__plan')).toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('1 to 20 rounds');
    expect(root.querySelector<HTMLButtonElement>('.timer__start')!.disabled).toBe(true);
    fields[2].value = '60';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    press('Start timer');
    expect(text('.timer__phase')).toBe('Brisk');
    expect(text('.timer__round')).toBe('Round 1 of 3');
  });

  it('shows nothing to run without a plan or editing', () => {
    const { root } = setup({ plan: null });
    expect(root.querySelector('.timer__start')!.hasAttribute('disabled')).toBe(true);
  });
});
