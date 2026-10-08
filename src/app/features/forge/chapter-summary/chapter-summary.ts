import { Component, ElementRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { chapterSummary } from '../../../core/program/progression';
import { summaryLines } from '../../../core/program/progression-copy';
import { formatChapterNumeral } from '../../../core/program/program-catalog';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { ProgressRows } from '../../../shared/progress-rows/progress-rows';

/** Shown on a trial page after a pass: each exercise's first against last full session. */
@Component({
  selector: 'app-chapter-summary',
  imports: [ProgressRows],
  template: `
    @if (lines(); as summary) {
      <section id="chapter-summary" tabindex="-1" aria-labelledby="chapter-summary-title">
        <h2 id="chapter-summary-title">What changed this chapter</h2>
        <p class="intro">
          Chapter {{ numeral() }}, first full session against the last. Deload weeks and reduced
          sessions are left out.
        </p>
        @if (summary.lifts.length) {
          <h3>Lifts</h3>
          <app-progress-rows [rows]="summary.lifts" />
        }
        @if (summary.carriesAndHolds.length) {
          <h3>Carries and holds</h3>
          <app-progress-rows [rows]="summary.carriesAndHolds" />
        }
        @if (summary.held) {
          <p class="held">{{ summary.held }}</p>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    section {
      scroll-margin-top: 1rem;
    }

    section:focus {
      outline: none;
    }

    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.5rem;
    }

    h3 {
      margin: 1.25rem 0 0.4rem;
      color: var(--text-label);
      font-family: var(--font-body);
      font-size: 0.74rem;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .intro,
    .held {
      margin: 0.35rem 0 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .held {
      margin-top: 0.9rem;
    }
  `,
})
export class ChapterSummarySection implements OnInit {
  readonly chapter = input.required<number>();
  private readonly history = inject(ProgressionHistory);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fragment = inject(ActivatedRoute).snapshot.fragment;
  private readonly context = signal<Awaited<ReturnType<ProgressionHistory['load']>> | null>(null);

  protected readonly numeral = computed(() => formatChapterNumeral(this.chapter()));
  /** Null until there is something to compare, so a thin chapter shows no empty section. */
  protected readonly lines = computed(() => {
    const context = this.context();
    if (!context) return null;
    const lines = summaryLines(chapterSummary(this.chapter(), context));
    return lines.lifts.length || lines.carriesAndHolds.length || lines.held ? lines : null;
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.context.set(await this.history.load());
    } catch {
      // A summary is reference only; the trial record above it still stands.
      return;
    }
    // The section arrives after the page does, so a link to it scrolls once it exists.
    if (this.fragment === 'chapter-summary') {
      requestAnimationFrame(() => {
        const section = this.host.nativeElement.querySelector<HTMLElement>('#chapter-summary');
        section?.scrollIntoView({ block: 'start' });
        section?.focus({ preventScroll: true });
      });
    }
  }
}
