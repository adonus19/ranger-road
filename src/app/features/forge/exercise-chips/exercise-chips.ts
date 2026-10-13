import { Component, ElementRef, afterRenderEffect, input, output, viewChild } from '@angular/core';

export interface ExerciseChip {
  /** Index into the session's exercises, whatever order the chips are shown in. */
  index: number;
  name: string;
  marked: number;
  total: number;
}

/** One tap switches exercise. Shows how many sets of each are marked. */
@Component({
  selector: 'app-exercise-chips',
  styleUrl: './exercise-chips.css',
  templateUrl: './exercise-chips.html',
})
export class ExerciseChips {
  readonly chips = input.required<readonly ExerciseChip[]>();
  readonly current = input.required<number>();
  readonly choose = output<number>();

  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');

  constructor() {
    // Keep the current chip in view without moving the page.
    afterRenderEffect(() => {
      this.current();
      const row = this.row().nativeElement;
      const chip = row.querySelector<HTMLElement>('[aria-current="true"]');
      if (!chip) return;
      const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
      row.scrollTo({ left, behavior: 'auto' });
    });
  }
}
