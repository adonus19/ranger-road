import { Component, input, output, signal } from '@angular/core';

export interface OrderItem {
  /** Index into the session's exercises, whatever order the list is shown in. */
  index: number;
  name: string;
}

/** Large up and down buttons to change the order exercises are worked in. No dragging. */
@Component({
  selector: 'app-order-editor',
  styleUrl: './order-editor.css',
  templateUrl: './order-editor.html',
})
export class OrderEditor {
  /** Exercises in the order they are currently shown. */
  readonly items = input.required<readonly OrderItem[]>();
  /** A one-line note about the order, such as a remembered order being set aside. */
  readonly note = input<string | null>(null);
  /** The full new order, as exercise indices, after one move. */
  readonly reorder = output<number[]>();
  readonly useWrittenOrder = output<void>();
  protected readonly open = signal(false);

  protected move(position: number, by: -1 | 1): void {
    const order = this.items().map((item) => item.index);
    const target = position + by;
    if (target < 0 || target >= order.length) return;
    [order[position], order[target]] = [order[target], order[position]];
    this.reorder.emit(order);
  }
}
