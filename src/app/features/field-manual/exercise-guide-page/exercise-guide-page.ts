import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getExerciseGuide, getQuickHelpSteps } from '../../../core/program/exercise-guides';
import { getAllSessions } from '../../../core/program/field-manual';
import { formatChapterNumeral } from '../../../core/program/program-catalog';
import { ManualBackLink } from '../manual-back-link';

/** The full written guide for one movement, with its sequence and neck-down muscle map. */
@Component({
  selector: 'app-exercise-guide-page',
  imports: [ManualBackLink, RouterLink],
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

    .muscle-map {
      max-width: 26rem;
    }
  `,
})
export class ExerciseGuidePage {
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
