import {
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The button last used, so focus can follow the exercise after the list re-renders. */
  private refocus: { index: number; by: -1 | 1 } | null = null;

  constructor() {
    afterRenderEffect(() => {
      this.items();
      if (!this.refocus) return;
      const { index, by } = this.refocus;
      this.refocus = null;
      const buttons = this.host.nativeElement.querySelectorAll<HTMLButtonElement>(
        `[data-index="${index}"] button`,
      );
      // At the top or bottom the used button is disabled, so the other one takes focus.
      const used = buttons[by === -1 ? 0 : 1];
      (used && !used.disabled ? used : buttons[by === -1 ? 1 : 0])?.focus();
    });
  }

  protected move(position: number, by: -1 | 1): void {
    const order = this.items().map((item) => item.index);
    const target = position + by;
    if (target < 0 || target >= order.length) return;
    [order[position], order[target]] = [order[target], order[position]];
    this.refocus = { index: order[target], by };
    this.reorder.emit(order);
  }
}
