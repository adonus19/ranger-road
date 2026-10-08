import { Component, input } from '@angular/core';
import type { ProgressLine } from '../../core/program/progression-copy';

/**
 * Forge progression as plain rows between soft rules: a name, what changed, and a quiet note.
 * Ink and its two secondary tones only. Gold and the readiness colors are never used here.
 */
@Component({
  selector: 'app-progress-rows',
  template: `
    <ul role="list">
      @for (row of rows(); track $index) {
        <li>
          <span class="label"
            >{{ row.label }}
            @if (row.note) {
              <small>{{ row.note }}</small>
            }
          </span>
          @if (row.value) {
            <span class="value">{{ row.value }}</span>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      min-height: 3rem;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 0;
      border-bottom: 1px solid var(--line-soft);
    }

    li:first-child {
      border-top: 1px solid var(--line-soft);
    }

    .label {
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.35;
    }

    small {
      display: block;
      color: var(--text-tertiary);
      font-size: 0.8125rem;
    }

    .value {
      flex: none;
      color: var(--text);
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-variant-numeric: lining-nums tabular-nums;
      text-align: right;
    }

    li:has(.value) .label {
      color: var(--text);
    }
  `,
})
export class ProgressRows {
  readonly rows = input.required<readonly ProgressLine[]>();
}
