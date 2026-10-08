import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getExerciseGuide, getQuickHelpSteps } from '../../../core/program/exercise-guides';
import { getAllSessions } from '../../../core/program/field-manual';
import { exerciseRecord, type ProgressionContext } from '../../../core/program/progression';
import {
  bestSetLabel,
  sinceDayOneLine,
  type ProgressLine,
} from '../../../core/program/progression-copy';
import { formatChapterNumeral } from '../../../core/program/program-catalog';
import { ProgressionHistory } from '../../../core/state/progression-history';
import { formatShortDate } from '../../../shared/format-date';
import { ProgressRows } from '../../../shared/progress-rows/progress-rows';
import { ManualBackLink } from '../manual-back-link';

const RECORD_ROWS = 8;

/** The full written guide for one movement, with its sequence and neck-down muscle map. */
@Component({
  selector: 'app-exercise-guide-page',
  imports: [ManualBackLink, ProgressRows, RouterLink],
  templateUrl: './exercise-guide-page.html',
  styles: `
    dl {
      display: grid;
      gap: 0.75rem;
      max-width: 65ch;
      margin: 0;
    }

    dt {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
    }

    dd {
      margin: 0.125rem 0 0;
      font-size: 1rem;
      line-height: 1.55;
    }

    .record-since {
      margin: 0 0 0.6rem;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .record-more {
      min-height: var(--touch-target);
      margin-top: 0.25rem;
      padding: 0;
      border: 0;
      background: none;
      color: var(--action);
      font: inherit;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 0.18em;
      cursor: pointer;
    }

    .muscle-map {
      max-width: 26rem;
    }
  `,
})
export class ExerciseGuidePage implements OnInit {
  private readonly progression = inject(ProgressionHistory);
  private readonly context = signal<ProgressionContext | null>(null);
  protected readonly showAll = signal(false);

  private readonly params = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly guide = computed(() =>
    getExerciseGuide(this.params()?.get('exerciseId') ?? ''),
  );

  protected readonly steps = computed(() => {
    const guide = this.guide();
    return guide ? (getQuickHelpSteps(guide.id) ?? [guide.how]) : [];
  });

  protected readonly media = computed(() => {
    const id = this.guide()?.id;
    return id ? `images/exercises/${id}` : '';
  });

  ngOnInit(): void {
    void this.loadRecord();
  }

  /** The record is reference only: a storage error leaves the guide without it. */
  private async loadRecord(): Promise<void> {
    try {
      this.context.set(await this.progression.load());
    } catch {
      this.context.set(null);
    }
  }

  /** Follows the guide on screen, so moving from one guide to another never shows stale rows. */
  private readonly record = computed(() => {
    const context = this.context();
    const id = this.guide()?.id;
    return context && id ? exerciseRecord(id, context) : null;
  });

  /** "Since Day 1: 75 → 100 lb", only once the best set has actually changed. */
  protected readonly since = computed(() => {
    const record = this.record();
    if (!record?.first || !record.latest || record.rows.length < 2) return undefined;
    return bestSetLabel(record.first) === bestSetLabel(record.latest)
      ? undefined
      : sinceDayOneLine(record.first, record.latest);
  });

  /** Eight rows, newest first, until "Show all". Null when nothing is recorded yet. */
  protected readonly recordRows = computed((): ProgressLine[] | null => {
    const rows = this.record()?.rows ?? [];
    if (!rows.length) return null;
    return (this.showAll() ? rows : rows.slice(0, RECORD_ROWS)).map((row) => {
      const where = row.chapter ? `Chapter ${formatChapterNumeral(row.chapter)}` : '';
      const note = [where, row.tag].filter(Boolean).join(' · ');
      return {
        label: formatShortDate(row.date),
        value: bestSetLabel(row.best),
        ...(note ? { note } : {}),
      };
    });
  });
  protected readonly hiddenRows = computed(() =>
    Math.max(0, (this.record()?.rows.length ?? 0) - RECORD_ROWS),
  );

  /** The sessions, in any chapter, that use this movement, with their doses. */
  protected readonly usedIn = computed(() => {
    const id = this.guide()?.id;
    return getAllSessions().flatMap((session) =>
      session.movements
        .filter((movement) => movement.exerciseId === id)
        .map((movement) => ({
          id: session.id,
          title: `Chapter ${formatChapterNumeral(session.chapter)} · ${session.title}`,
          dose: movement.dose,
        })),
    );
  });

  /** Written notes beyond the steps, in the catalog's order. */
  protected readonly notes = computed(() => {
    const guide = this.guide();
    if (!guide) return [];
    return [
      { label: 'Feel', text: guide.feel },
      { label: 'Avoid', text: guide.avoid },
      { label: 'Targets', text: guide.targets },
      { label: 'For pain', text: guide.painAwareOptions },
      { label: 'Progression', text: guide.progression },
      { label: 'Rule', text: guide.rule },
      { label: 'Step-up from', text: guide.stepUpFrom },
    ].filter((note): note is { label: string; text: string } => !!note.text);
  });
}
