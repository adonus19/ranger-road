import type { Router } from '@angular/router';

/**
 * Move reading focus after a routed view renders without changing scroll restoration.
 * The target is a heading or section, not a control, so it is marked to skip the focus ring.
 */
export function focusRouteHeading(router: Router, headingSelector: string): void {
  setTimeout(() => {
    const fragment = router.parseUrl(router.url).fragment;
    const target = fragment
      ? document.getElementById(fragment)
      : document.querySelector(headingSelector);
    if (!(target instanceof HTMLElement)) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.setAttribute('data-route-focus', '');
    target.focus({ preventScroll: true });
  }, 0);
}
