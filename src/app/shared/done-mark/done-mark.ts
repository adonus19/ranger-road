import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** A small mark beside an order: a ring when open, a check when done. Never a count. */
@Component({
  selector: 'app-done-mark',
  imports: [Icon],
  template: `
    <span class="mark" [class.mark--done]="done()" aria-hidden="true">
      @if (done()) {
        <app-icon name="check" />
      }
    </span>
    <span class="visually-hidden">{{ done() ? label() : 'Not yet' }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    .mark {
      display: inline-flex;
      width: 1.5rem;
      height: 1.5rem;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--line);
      border-radius: 50%;
      color: var(--surface-page);
    }

    .mark--done {
      border-color: var(--action);
      background: var(--action);
    }

    .mark app-icon {
      width: 1rem;
      height: 1rem;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class DoneMark {
  readonly done = input(false);
  /** Spoken when done, such as "Done" or "Recorded". */
  readonly label = input('Done');
}
