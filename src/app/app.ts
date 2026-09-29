import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icon, type IconName } from './shared/icon/icon';
import { focusRouteHeading } from './shared/route-focus';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Closed outlines turn solid on the selected tab; open strokes stay as lines. */
  fillWhenActive: boolean;
}

@Component({
  selector: 'app-root',
  imports: [Icon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly navigated = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );

  /**
   * After a route change, reading focus moves to the new view's heading. The Index lands on
   * its heading too, not the search field, so a phone keyboard doesn't open by itself.
   */
  private readonly focusOnNavigation = effect(() => {
    const navigation = this.navigated();
    if (!navigation) return;
    const url = navigation.urlAfterRedirects;
    const selector = /^\/field-manual(?:\/(?:contents|index))?(?:[?#]|$)/.test(url)
      ? '.field-manual h2'
      : '#main-content h1';
    focusRouteHeading(this.router, selector);
  });

  /** Routes that open on a painted band let the brand row sit over the scene. */
  protected readonly headerOverScene = computed(() => {
    this.navigated();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data['headerOverScene'] === true;
  });

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Keep', path: '/keep', icon: 'house', fillWhenActive: true },
    { label: 'Road', path: '/road', icon: 'road', fillWhenActive: false },
    { label: 'Forge', path: '/forge', icon: 'anvil', fillWhenActive: false },
    { label: 'Journal', path: '/journal', icon: 'book-open', fillWhenActive: false },
    { label: 'Field Manual', path: '/field-manual', icon: 'map', fillWhenActive: false },
  ];
}
