import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';

@Component({ template: '<h1>Reading page</h1><p id="section">Section content</p>' })
class ReadingPageStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the brand and five navigation destinations', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('The Ranger’s Road');
    const links = compiled.querySelectorAll('nav[aria-label="Primary navigation"] a');
    expect(Array.from(links, (link) => link.textContent?.trim())).toEqual([
      'Keep',
      'Road',
      'Forge',
      'Journal',
      'Field Manual',
    ]);
  });

  it('moves focus to a routed heading, or to a requested section', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'reading', component: ReadingPageStub }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/reading');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.activeElement?.textContent).toBe('Reading page');
    });

    await router.navigateByUrl('/reading#section');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.activeElement?.id).toBe('section');
    });
  });
});
