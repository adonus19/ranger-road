import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  getFieldManualIndex,
  searchText,
  type FieldManualEntry,
  type FieldManualEntryKind,
} from '../../../core/program/field-manual';
import { Icon, type IconName } from '../../../shared/icon/icon';
import { SKILL_ICONS } from '../skill-icons';
import { FieldManualWeekState, type IndexFilter } from '../field-manual-week-state';

const FILTERS: readonly { id: IndexFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'this-week', label: 'This week' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'fieldcraft', label: 'Fieldcraft' },
  { id: 'reading', label: 'Reading' },
  { id: 'scripture', label: 'Scripture' },
  { id: 'exercises', label: 'Exercises' },
];

const FILTER_KINDS: Partial<Record<IndexFilter, readonly FieldManualEntryKind[]>> = {
  leadership: ['lesson', 'principle'],
  fieldcraft: ['card'],
  reading: ['book'],
  scripture: ['scripture'],
  exercises: ['exercise'],
};

const KIND_ICONS: Record<FieldManualEntryKind, IconName> = {
  exercise: 'anvil',
  lesson: 'hearth',
  principle: 'hearth',
  card: 'hatchet',
  book: 'book-open',
  scripture: 'sunrise',
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface LetterGroup {
  letter: string;
  entries: FieldManualEntry[];
}

/** Every lesson, principle, card, book, reference, and exercise, A to Z, with search. */
@Component({
  selector: 'app-index-view',
  imports: [Icon, RouterLink],
  templateUrl: './index-view.html',
  styleUrl: './index-view.css',
})
export class IndexView {
  private readonly weekState = inject(FieldManualWeekState);
  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  protected readonly filters = computed(() =>
    FILTERS.map((item) =>
      item.id === 'this-week' && this.weekState.week().stage === 'ahead'
        ? { ...item, label: 'Week ahead' }
        : item,
    ),
  );
  protected readonly letters = LETTERS;
  protected readonly query = this.weekState.indexQuery;
  protected readonly filter = this.weekState.indexFilter;
  private readonly entries = getFieldManualIndex();

  protected readonly visible = computed(() => {
    const words = searchText(this.query()).split(/\s+/).filter(Boolean);
    const filter = this.filter();
    const kinds = FILTER_KINDS[filter];
    const thisWeek = new Set(this.weekState.week().entryIds);
    return this.entries.filter(
      (entry) =>
        (filter === 'all' ||
          (filter === 'this-week' ? thisWeek.has(entry.id) : kinds?.includes(entry.kind))) &&
        words.every((word) => entry.keywords.includes(word)),
    );
  });

  protected readonly groups = computed<LetterGroup[]>(() => {
    const groups: LetterGroup[] = [];
    for (const entry of this.visible()) {
      const last = groups.at(-1);
      if (last?.letter === entry.letter) last.entries.push(entry);
      else groups.push({ letter: entry.letter, entries: [entry] });
    }
    return groups;
  });

  protected readonly available = computed(
    () => new Set(this.groups().map((group) => group.letter)),
  );
  private readonly requestedLetter = signal('A');
  protected readonly activeLetter = computed(() =>
    this.available().has(this.requestedLetter())
      ? this.requestedLetter()
      : (LETTERS.find((letter) => this.available().has(letter)) ?? 'A'),
  );

  private scrubbing = false;

  constructor() {
    const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('filter');
    if (FILTERS.some((item) => item.id === requested)) this.filter.set(requested as IndexFilter);
  }

  /** Knot cards show a rope; the tool card keeps the hatchet. */
  protected icon(entry: FieldManualEntry): IconName {
    return entry.skill ? SKILL_ICONS[entry.skill] : KIND_ICONS[entry.kind];
  }

  protected search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected choose(filter: IndexFilter): void {
    this.filter.set(filter);
  }

  /** The letter rail is a scrubber: press and slide to move through the index. */
  protected railStart(event: PointerEvent): void {
    this.scrubbing = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.jumpToPointer(event);
  }

  protected railMove(event: PointerEvent): void {
    if (this.scrubbing) this.jumpToPointer(event);
  }

  protected railEnd(): void {
    this.scrubbing = false;
  }

  protected railKey(event: KeyboardEvent): void {
    const options = LETTERS.filter((letter) => this.available().has(letter));
    if (!options.length) return;
    const position = options.indexOf(this.activeLetter());
    const next =
      event.key === 'Home'
        ? options[0]
        : event.key === 'End'
          ? options.at(-1)
          : event.key === 'ArrowDown' || event.key === 'ArrowRight'
            ? options[Math.min(position + 1, options.length - 1)]
            : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
              ? options[Math.max(position - 1, 0)]
              : undefined;
    if (!next) return;
    event.preventDefault();
    this.jumpTo(next);
  }

  private jumpToPointer(event: PointerEvent): void {
    const rail = this.rail()?.nativeElement;
    if (!rail) return;
    const box = rail.getBoundingClientRect();
    const position = Math.min(
      LETTERS.length - 1,
      Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * LETTERS.length)),
    );
    const available = this.available();
    const letter =
      LETTERS.slice(position).find((item) => available.has(item)) ??
      [...LETTERS.slice(0, position)].reverse().find((item) => available.has(item));
    if (letter) this.jumpTo(letter);
  }

  private jumpTo(letter: string): void {
    this.requestedLetter.set(letter);
    document.getElementById(`index-${letter}`)?.scrollIntoView({ block: 'start' });
  }
}
