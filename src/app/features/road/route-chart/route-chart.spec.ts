import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { RouteChart } from './route-chart';

async function render(
  day: number,
  startLabel = 'Day 1 · Thursday, August 20',
  leadInDays = 0,
  targetDay = 28,
): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(RouteChart);
  fixture.componentRef.setInput('day', day);
  fixture.componentRef.setInput('startLabel', startLabel);
  fixture.componentRef.setInput('leadInDays', leadInDays);
  fixture.componentRef.setInput('targetDay', targetDay);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('RouteChart', () => {
  it('marks today on the route and describes it for screen readers', async () => {
    const element = await render(16);

    expect(element.querySelector('.route__today-label')?.textContent?.trim()).toBe(
      'Today · Day 16',
    );
    expect(element.querySelector('.route__today')).not.toBeNull();
    expect(element.querySelector('.route__line--traveled path')?.getAttribute('d')).toMatch(
      /^M3\.00 /,
    );
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toBe(
      'Chapter route. Today is day 16. Gate Trial target on day 28.',
    );
  });

  it('lifts the trial label a line late in the chapter so the two labels never meet', async () => {
    const element = await render(25);

    expect(element.querySelector('.route__target-label--raised')).not.toBeNull();
    expect(element.querySelector('.route__today-label')?.textContent?.trim()).toBe(
      'Today · Day 25',
    );
  });

  it('shows the chosen start date and no progress before Day 1', async () => {
    const element = await render(0, 'Day 1 · Monday, October 5');

    expect(element.querySelector('.route__today-label')?.textContent?.trim()).toBe(
      'Day 1 · Monday, October 5',
    );
    expect(element.querySelector('.route__today')).toBeNull();
    expect(element.querySelector('.route__line--traveled')).toBeNull();
  });

  it('places Week 1 after a lead-in and moves the target to the end of four full weeks', async () => {
    const element = await render(4, 'Day 1 · Thursday, September 10', 4, 32);

    const firstTick = element.querySelector<HTMLElement>('.route__tick');
    expect(Number(firstTick?.style.getPropertyValue('--x'))).toBeGreaterThan(3);
    expect(element.querySelector('.route')?.getAttribute('aria-label')).toBe(
      'Chapter route. Today is day 4. A 4-day lead-in ends before Week 1 begins on day 5. Gate Trial target on day 32.',
    );
    expect(element.querySelectorAll('.route__week')).toHaveLength(4);
  });

  it('places a future midweek Day 1 at the start of the lead-in, before Week 1', async () => {
    const element = await render(0, 'Day 1 · Thursday, September 10', 4, 32);
    const start = element.querySelector<HTMLElement>('.route__today-label');
    const firstWeek = element.querySelector<HTMLElement>('.route__tick');
    expect(Number(start?.style.getPropertyValue('--x'))).toBe(3);
    expect(Number(firstWeek?.style.getPropertyValue('--x'))).toBeGreaterThan(3);
  });

  it('settles today on the trial ring once the planning target is reached, without a countdown past it', async () => {
    const element = await render(37);

    expect(element.querySelector('.route__ring--reached')).not.toBeNull();
    expect(element.querySelector('.route__today')).toBeNull();
    expect(element.querySelector('.route__today-label')).toBeNull();
    expect(element.textContent).not.toContain('August 20');
    expect(element.querySelector('.route__target-label')?.textContent?.trim()).toBe(
      'Gate Trial · Today, Day 37',
    );
    expect(element.querySelectorAll('.route__week')).toHaveLength(4);
  });
});
