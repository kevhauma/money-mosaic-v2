import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeLandingComponent } from './home-landing.component';

describe('HomeLandingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeLandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the brand name and a call-to-action link to the dashboard', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Money');
    expect(text).toContain('Mosaic');

    const cta = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="/dashboard"]',
    ) as HTMLAnchorElement | null;
    expect(cta).toBeTruthy();
  });

  it('renders a GitHub repository link that opens safely in a new tab', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="https://github.com/kevhauma/money-mosaic-v2"]',
    ) as HTMLAnchorElement | null;

    expect(link).toBeTruthy();
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
  });

  /**
   * The page's central claim, and the one worth pinning: it said "local-first" and "never leaves
   * your browser" until v3 put the data on a server, at which point the copy was selling a
   * guarantee the app no longer makes. What replaced it is a narrower, true one — the server is
   * the user's own — so the assertion checks for that rather than for the absence of the old
   * wording, which would pass on a page that said nothing at all.
   */
  it('claims the self-hosted data model, not the retired browser-only one', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/self-hosted/i);
    expect(text).toMatch(/never leaves your own machine/i);
    expect(text).not.toMatch(/local-first/i);
    expect(text).not.toMatch(/leaves your browser/i);
  });

  it('lists every positioning value prop and process step', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const valueProps = fixture.componentInstance['valueProps'];
    const processSteps = fixture.componentInstance['processSteps'];
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(valueProps.length).toBeGreaterThan(0);
    for (const prop of valueProps) {
      expect(text).toContain(prop.title);
    }

    expect(processSteps.length).toBeGreaterThan(0);
    for (const step of processSteps) {
      expect(text).toContain(step.title);
    }
  });

  it('lists every feature group with its detail items', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const featureGroups = fixture.componentInstance['featureGroups'];
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(featureGroups.length).toBeGreaterThan(0);
    for (const group of featureGroups) {
      expect(text).toContain(group.title);
      for (const item of group.items) {
        expect(text).toContain(item);
      }
    }
  });
});
