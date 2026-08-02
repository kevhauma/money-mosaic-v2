import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the shell', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not render a top-level "Data" nav item (moved under Settings — TICKET-SET-06)', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const dataLink = (fixture.nativeElement as HTMLElement).querySelector('a[href="/data"]');

    expect(dataLink).toBeNull();
  });

  // The shell used to own the one app-wide range (its switcher, its RangeStore injection, its
  // query-param mirroring). TICKET-UI-23 handed all three to the pages that actually use a range;
  // `page-range-control.spec.ts` covers the behaviour at its new home.
  it("renders no range switcher — the range lives in each page's own header (TICKET-UI-23)", () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('mm-range-grouping-switcher')).toBeNull();
    expect(shell.querySelector('mm-date-range-input')).toBeNull();
  });
});
