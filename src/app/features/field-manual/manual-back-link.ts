import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon/icon';

/** Where a reading page was opened from, passed as `?from=`. */
const RETURNS: Record<string, { path: string; label: string }> = {
  contents: { path: '/field-manual/contents', label: 'Back to Contents' },
  index: { path: '/field-manual/index', label: 'Back to Index' },
  exercises: { path: '/field-manual/exercises', label: 'Back to exercise guides' },
  practice: { path: '/field-manual/practice/3', label: 'Back to knot practice' },
  mission: { path: '/keep/mission', label: 'Back to Today’s Mission' },
  watch: { path: '/journal/morning', label: 'Back to Morning Watch' },
  keep: { path: '/keep', label: 'Back to Keep' },
};

const FIELD_MANUAL = { path: '/field-manual', label: 'Back to Field Manual' };

/** A back link that names the screen the reader came from. */
@Component({
  selector: 'app-manual-back-link',
  imports: [Icon, RouterLink],
  template: `<a class="back-link" [routerLink]="destination().path"
    ><app-icon name="arrow-left" />{{ destination().label }}</a
  >`,
})
export class ManualBackLink {
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly destination = computed(
    () => RETURNS[this.query()?.get('from') ?? ''] ?? FIELD_MANUAL,
  );
}
