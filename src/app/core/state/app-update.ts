import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** How often an app left open (as a home-screen app often is) looks for a new version. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Looks for a new version when the app opens, returns to the foreground, comes back online,
 * and on a timer. A ready version only sets `ready`; the person taps Reload, so unsaved text
 * is never discarded by a surprise refresh.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  readonly ready = signal(false);

  start(): void {
    const updates = this.updates;
    if (this.started || !updates?.isEnabled) return;
    this.started = true;

    const versions = updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.ready.set(true);
    });
    const broken = updates.unrecoverable.subscribe(() => this.ready.set(true));

    const check = () => {
      updates.checkForUpdate().catch(() => false);
    };
    const onVisible = () => {
      if (this.document.visibilityState === 'visible') check();
    };
    const view = this.document.defaultView;
    this.document.addEventListener('visibilitychange', onVisible);
    view?.addEventListener('online', check);
    const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    check();

    this.destroyRef.onDestroy(() => {
      versions.unsubscribe();
      broken.unsubscribe();
      this.document.removeEventListener('visibilitychange', onVisible);
      view?.removeEventListener('online', check);
      clearInterval(timer);
    });
  }

  async reload(): Promise<void> {
    try {
      await this.updates?.activateUpdate();
    } catch {
      // Reloading still picks up the newest files when activation is not needed.
    }
    this.document.location.reload();
  }
}
