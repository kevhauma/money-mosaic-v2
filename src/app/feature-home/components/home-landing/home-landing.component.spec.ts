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

  it('mentions the local-first/no-backend data model', () => {
    const fixture = TestBed.createComponent(HomeLandingComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/local-first/i);
    expect(text).toMatch(/never leaves your browser/i);
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
