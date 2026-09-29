import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FieldManualWeekState } from '../field-manual-week-state';

/** The Field Manual tab: one title and a switch between This week, Contents, and Index. */
@Component({
  selector: 'app-field-manual-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './field-manual-page.html',
  styleUrl: './field-manual-page.css',
})
export class FieldManualPage implements OnInit {
  private readonly weekState = inject(FieldManualWeekState);

  protected readonly views = [
    { label: 'This week', path: '/field-manual', exact: true },
    { label: 'Contents', path: '/field-manual/contents', exact: false },
    { label: 'Index', path: '/field-manual/index', exact: false },
  ] as const;

  ngOnInit(): void {
    void this.weekState.load();
  }
}
