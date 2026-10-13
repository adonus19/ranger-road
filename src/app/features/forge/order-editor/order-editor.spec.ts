import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { OrderEditor } from './order-editor';

function render() {
  const fixture = TestBed.createComponent(OrderEditor);
  fixture.componentRef.setInput('items', [
    { index: 2, name: 'Row' },
    { index: 0, name: 'Box Squat' },
    { index: 1, name: 'Bench Press' },
  ]);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('.open') as HTMLButtonElement).click();
  fixture.detectChanges();
  const button = (label: string) =>
    fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
  return { fixture, button };
}

describe('OrderEditor', () => {
  it('labels a move button for each exercise', () => {
    const { button } = render();
    expect(button('Move Box Squat up')).toBeTruthy();
    expect(button('Move Box Squat down')).toBeTruthy();
  });

  it('disables moving the first exercise up and the last down', () => {
    const { button } = render();
    expect(button('Move Row up').disabled).toBe(true);
    expect(button('Move Bench Press down').disabled).toBe(true);
    expect(button('Move Row down').disabled).toBe(false);
  });

  it('emits the whole new order of exercise indices after a move', () => {
    const { fixture, button } = render();
    const orders: number[][] = [];
    fixture.componentInstance.reorder.subscribe((order) => orders.push(order));
    button('Move Box Squat up').click();
    button('Move Row down').click();
    expect(orders).toEqual([
      [0, 2, 1],
      [0, 2, 1],
    ]);
  });

  it('keeps focus on the moved exercise after the list re-renders', async () => {
    const { fixture, button } = render();
    fixture.componentInstance.reorder.subscribe((order) => {
      const names: Record<number, string> = { 0: 'Box Squat', 1: 'Bench Press', 2: 'Row' };
      fixture.componentRef.setInput(
        'items',
        order.map((index) => ({ index, name: names[index] })),
      );
    });
    button('Move Box Squat up').focus();
    button('Move Box Squat up').click();
    fixture.detectChanges();
    await fixture.whenStable();
    // Box Squat is now first, so its up button is disabled and focus moves to its down button.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Move Box Squat down');
  });

  it('offers the written order, and Done closes the editor', () => {
    const { fixture } = render();
    let written = 0;
    fixture.componentInstance.useWrittenOrder.subscribe(() => written++);
    const buttons = [...fixture.nativeElement.querySelectorAll('.actions button')] as HTMLElement[];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Use written order', 'Done']);
    buttons[0].click();
    expect(written).toBe(1);
    buttons[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('.open').textContent.trim()).toBe('Change order');
  });
});
