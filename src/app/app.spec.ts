import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

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
    expect(compiled.querySelector('.brand')?.textContent).toContain("The Ranger’s Road");
    const links = compiled.querySelectorAll('nav[aria-label="Primary navigation"] a');
    expect(Array.from(links, (link) => link.textContent?.trim())).toEqual([
      'Keep',
      'Road',
      'Forge',
      'Journal',
      'Field Manual',
    ]);
  });
});
