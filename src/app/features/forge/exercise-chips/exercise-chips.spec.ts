import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ExerciseChips } from './exercise-chips';

function render() {
  const fixture = TestBed.createComponent(ExerciseChips);
  fixture.componentRef.setInput('chips', [
    { index: 1, name: 'Bench Press', marked: 2, total: 3 },
    { index: 0, name: 'Box Squat', marked: 3, total: 3 },
  ]);
  fixture.componentRef.setInput('current', 1);
  fixture.detectChanges();
  return fixture;
}

describe('ExerciseChips', () => {
  it('shows each exercise with its marked count in the order given', () => {
    const buttons = [...render().nativeElement.querySelectorAll('button')] as HTMLElement[];
    expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Bench Press2/3',
      'Box Squat3/3',
    ]);
  });

  it('names the count for screen readers and marks the current chip', () => {
    const buttons = [...render().nativeElement.querySelectorAll('button')] as HTMLElement[];
    expect(buttons[0].getAttribute('aria-label')).toBe('Bench Press, 2 of 3 sets marked');
    expect(buttons[0].getAttribute('aria-current')).toBe('true');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
  });

  it('emits the exercise index when a chip is tapped', () => {
    const fixture = render();
    const chosen: number[] = [];
    fixture.componentInstance.choose.subscribe((index) => chosen.push(index));
    (fixture.nativeElement.querySelectorAll('button')[1] as HTMLElement).click();
    expect(chosen).toEqual([0]);
  });
});
