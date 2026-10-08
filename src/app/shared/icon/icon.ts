import { Component, computed, input } from '@angular/core';

interface IconPath {
  d: string;
  /** Filled shapes use currentColor; strokes use the shared line weight. */
  paint: 'fill' | 'stroke';
}

const ICONS = {
  'heart-pulse': [
    { d: 'M12 20.2s-7.6-4.5-7.6-10a4.3 4.3 0 0 1 7.6-2.8 4.3 4.3 0 0 1 7.6 2.8c0 5.5-7.6 10-7.6 10Z', paint: 'stroke' },
    { d: 'M6.6 12.6h2.3l1.4-2.4 2.3 4.6 1.5-3 1.1 1.7h2.3', paint: 'stroke' },
  ],
  footprints: [
    { d: 'M8.3 2.8c1.9 0 3 2.1 3 4.7 0 2.1-.8 3.4-.8 4.8H6.5c0-1.4-.9-2.7-.9-5C5.6 4.8 6.5 2.8 8.3 2.8Z', paint: 'fill' },
    { d: 'M6.5 13.6h4v1.7a2 2 0 0 1-4 0Z', paint: 'fill' },
    { d: 'M15.7 7.8c1.8 0 2.7 2 2.7 4.6 0 2.3-.9 3.5-.9 4.9h-4c0-1.4-.8-2.7-.8-4.8 0-2.6 1.1-4.7 3-4.7Z', paint: 'fill' },
    { d: 'M13.5 18.6h4v1.7a2 2 0 0 1-4 0Z', paint: 'fill' },
  ],
  sunrise: [
    { d: 'M7 16a5 5 0 0 1 10 0Z', paint: 'fill' },
    { d: 'M3 16h18M6.5 19h11M12 5.2v2.6M5.7 8.7l1.8 1.8M18.3 8.7l-1.8 1.8M2.8 12.6h2.5M18.7 12.6h2.5', paint: 'stroke' },
  ],
  moon: [{ d: 'M20.6 13.4A8.6 8.6 0 1 1 10.6 3.4a6.8 6.8 0 0 0 10 10Z', paint: 'fill' }],
  hearth: [
    { d: 'M2.6 3.4h18.8v2.7H2.6Z', paint: 'fill' },
    { d: 'M3.8 6.1h16.4v14.3h-3.1v-8.2a5.1 5.1 0 0 0-10.2 0v8.2H3.8Z', paint: 'fill' },
    {
      d: 'M12 12.1c1.4 1.6 2.7 2.9 2.7 4.7a2.7 2.7 0 0 1-5.4 0c0-1.2.6-2 1.3-2.7 0 .9.5 1.5 1.1 1.5s.8-.6.6-1.4c-.3-.8-.5-1.4-.3-2.1Z',
      paint: 'fill',
    },
    { d: 'M8.1 19.1h7.8v1.3H8.1Z', paint: 'fill' },
    { d: 'M2.6 20.4h18.8V22H2.6Z', paint: 'fill' },
  ],
  anvil: [
    { d: 'M3 6.8h13.4c0 2.1 2 2.9 4.6 2.9v.6c-2.1.6-3.6 1.9-4.3 3.6H8.6c-.4-1.6-1.8-2.7-3.6-3.2V9C3.8 8.7 3 7.9 3 6.8Z', paint: 'fill' },
    { d: 'M9.3 13.9h5.9v2.5h2.4v2.8H6.9v-2.8h2.4Z', paint: 'fill' },
  ],
  /** A hatchet, handle and flared head, for tool fieldcraft. */
  hatchet: [
    { d: 'M3.61 20.04 14.99 8.51l1.22 1.18L5.04 21.43a1 1 0 0 1-1.43-1.39Z', paint: 'fill' },
    {
      d: 'M14.71 6.57 17.16 9.22Q19.09 10.96 21.29 10.99 19.99 13.77 17.25 15.16 17.35 12.47 15.77 10.65L13.04 8.29Z',
      paint: 'fill',
    },
  ],
  renew: [
    { d: 'M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1M17.6 3.4v3.5h-3.5M6.4 20.6v-3.5h3.5', paint: 'stroke' },
  ],
  'book-open': [
    { d: 'M12 6.6C10 5.1 7 4.6 3.4 4.9v13.6c3.6-.3 6.6.2 8.6 1.7 2-1.5 5-2 8.6-1.7V4.9C17 4.6 14 5.1 12 6.6Zm0 0v13.6', paint: 'stroke' },
  ],
  compass: [
    { d: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z', paint: 'stroke' },
    { d: 'm15.4 8.6-2 5.4-5.4 2 2-5.4Z', paint: 'stroke' },
  ],
  map: [{ d: 'm3.4 6.2 5.6-2.3 6 2.3 5.6-2.3v13.9L15 20.1l-6-2.3-5.6 2.3ZM9 3.9v13.9m6-11.6v13.9', paint: 'stroke' }],
  house: [{ d: 'M3.6 10.4 12 3.8l8.4 6.6v10.2h-5.6v-6.1H9.2v6.1H3.6Z', paint: 'stroke' }],
  /** A road running into the distance, with its center line. */
  road: [
    { d: 'M3 21c3-3.2 6.2-4.6 6.3-8 .1-3.4 1.8-6.3 3-9.5M21 21c-3.5-2.6-6.6-4.4-6.7-8-.1-3.4-.7-6.3-.6-9.5', paint: 'stroke' },
    { d: 'M12 20.4v-1.9M11.9 15.6v-1.5M12.1 11.2l.1-1.3M12.6 7.2l.1-1', paint: 'stroke' },
  ],
  /** A tape measure: round case, hub, and the tape run out with two ticks. */
  tape: [
    { d: 'M15 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z', paint: 'stroke' },
    { d: 'M10.6 11a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z', paint: 'stroke' },
    { d: 'M9 17h12v-3h-6.9M17.5 17v-1.4M19.9 17v-1.4', paint: 'stroke' },
  ],
  /** A bathroom scale with its dial. */
  scale: [
    { d: 'M6 3.8h12A2.2 2.2 0 0 1 20.2 6v12a2.2 2.2 0 0 1-2.2 2.2H6A2.2 2.2 0 0 1 3.8 18V6A2.2 2.2 0 0 1 6 3.8Z', paint: 'stroke' },
    { d: 'M8 10.4a4 4 0 0 1 8 0Z', paint: 'stroke' },
    { d: 'm12 10.4 1.5-2.3', paint: 'stroke' },
  ],
  /** An open tray with an arrow leaving it: records going out to a saved copy. */
  'tray-arrow-up': [
    { d: 'M4.2 13.8v4.1a2.3 2.3 0 0 0 2.3 2.3h11a2.3 2.3 0 0 0 2.3-2.3v-4.1', paint: 'stroke' },
    { d: 'M12 15.2V3.9M7.7 8.2 12 3.9l4.3 4.3', paint: 'stroke' },
  ],
  /** The same tray with the arrow coming in: a saved copy brought back. */
  'tray-arrow-down': [
    { d: 'M4.2 13.8v4.1a2.3 2.3 0 0 0 2.3 2.3h11a2.3 2.3 0 0 0 2.3-2.3v-4.1', paint: 'stroke' },
    { d: 'M12 3.9v11.3M7.7 10.9l4.3 4.3 4.3-4.3', paint: 'stroke' },
  ],
  /** A rope loop crossing over its standing part, for the knot cards. */
  knot: [
    { d: 'M13.4 21.5 12.3 14.9', paint: 'stroke' },
    {
      d: 'M11.9 12.4c-1.4-1.2-6.4-1.8-6.4-5.2 0-2.8 2.9-4.6 6.5-4.6s6.5 1.8 6.5 4.6c0 3.4-4 4.7-7.1 7L6.2 20.8',
      paint: 'stroke',
    },
  ],
  /** One pine from the brand mark, for the small This week tag. */
  pine: [
    {
      d: 'M12 1.2 14.2 5.5h-1l2.2 4.5h-1.2l2.6 5.1H7.2L9.8 10H8.6l2.2-4.5h-1Z',
      paint: 'fill',
    },
    { d: 'M11.5 15.1h1v7.7h-1Z', paint: 'fill' },
  ],
  search: [{ d: 'M10.8 17.6a6.8 6.8 0 1 1 0-13.6 6.8 6.8 0 0 1 0 13.6Zm4.9-1.9 4.6 4.6', paint: 'stroke' }],
  'chevron-right': [{ d: 'M9 5.5 15.5 12 9 18.5', paint: 'stroke' }],
  check: [{ d: 'M5 12.6 9.6 17 19 7.4', paint: 'stroke' }],
  plus: [{ d: 'M12 5v14M5 12h14', paint: 'stroke' }],
  minus: [{ d: 'M5 12h14', paint: 'stroke' }],
  'arrow-right': [{ d: 'M4 12h15m-5.5-5.5L19 12l-5.5 5.5', paint: 'stroke' }],
  'arrow-left': [{ d: 'M20 12H5m5.5-5.5L5 12l5.5 5.5', paint: 'stroke' }],
} satisfies Record<string, IconPath[]>;

export type IconName = keyof typeof ICONS;

/** One authored 24px icon set so every pictogram shares a grid and line weight. */
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @for (path of paths(); track $index) {
        @if (path.paint === 'fill' || filled()) {
          <path [attr.d]="path.d" fill="currentColor" [attr.stroke]="path.paint === 'stroke' ? 'currentColor' : null" />
        } @else {
          <path [attr.d]="path.d" fill="none" stroke="currentColor" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.5rem;
      height: 1.5rem;
      flex: none;
    }

    svg {
      width: 100%;
      height: 100%;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: var(--icon-stroke, 1.75);
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Closes outline shapes into solid glyphs, used for the selected navigation tab. */
  readonly filled = input(false);

  protected readonly paths = computed<readonly IconPath[]>(() => ICONS[this.name()]);
}
