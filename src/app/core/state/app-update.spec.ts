import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppUpdate } from './app-update';

function setup(isEnabled = true) {
  const versionUpdates = new Subject<{ type: string }>();
  const unrecoverable = new Subject<unknown>();
  const sw = {
    isEnabled,
    versionUpdates,
    unrecoverable,
    checkForUpdate: vi.fn(async () => false),
    activateUpdate: vi.fn(async () => true),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: sw }] });
  return { service: TestBed.inject(AppUpdate), sw, versionUpdates };
}

describe('AppUpdate', () => {
  it('checks on start and when the app returns to the foreground', () => {
    const { service, sw } = setup();
    service.start();
    expect(sw.checkForUpdate).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sw.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('shows the bar only once a version is ready', () => {
    const { service, versionUpdates } = setup();
    service.start();
    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(service.ready()).toBe(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.ready()).toBe(true);
  });

  it('does nothing without a service worker', () => {
    const { service, sw } = setup(false);
    service.start();
    expect(sw.checkForUpdate).not.toHaveBeenCalled();
  });
});
