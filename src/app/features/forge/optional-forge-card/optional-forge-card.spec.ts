import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { OptionalForgeOffer } from '../../../core/program/optional-forge';
import { OptionalForgeCard } from './optional-forge-card';

function render(offer: OptionalForgeOffer): HTMLElement {
  TestBed.configureTestingModule({ imports: [OptionalForgeCard], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(OptionalForgeCard);
  fixture.componentRef.setInput('offer', offer);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OptionalForgeCard', () => {
  it('opens Forge C in Chapter I', () => {
    const element = render({ workoutId: 'chapter-1-forge-c', light: false });
    expect(element.querySelector('a')?.getAttribute('href')).toBe(
      '/forge/session/chapter-1-forge-c',
    );
    expect(element.textContent).toContain('Forge C, about 20–25 minutes.');
  });

  it('opens the builder from Chapter II, with the deload note', () => {
    const element = render({ workoutId: 'custom-forge', light: true });
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/forge/custom');
    expect(element.textContent).toContain('Build your own session. Keep it light.');
  });
});
