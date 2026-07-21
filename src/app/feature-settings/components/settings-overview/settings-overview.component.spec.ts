import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsOverviewComponent } from './settings-overview.component';

describe('SettingsOverviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('mm-theme-style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a GitHub repository link that opens safely in a new tab', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="https://github.com/kevhauma/money-mosaic-v2"]',
    ) as HTMLAnchorElement | null;

    expect(link).toBeTruthy();
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
  });
});
