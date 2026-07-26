import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { appDb } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  setCurrencySymbol,
  setCurrencySymbolPosition,
} from '@/shared/utils';
import { SettingsOverviewComponent } from './settings-overview.component';

describe('SettingsOverviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(async () => {
    localStorage.removeItem('mm-theme-style');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-content');
    // fake-indexeddb is a global singleton and Vitest runs with isolate:false, so a row written
    // here would otherwise leak into other spec files.
    await appDb.appSettings.clear();
    // Same isolate:false leakage risk for currency-format's module-level signals (TICKET-SET-03).
    setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
    setCurrencySymbolPosition(DEFAULT_CURRENCY_SYMBOL_POSITION);
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

  it('embeds the Data Management section directly, not behind a link', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    const dataManagement = (fixture.nativeElement as HTMLElement).querySelector(
      'app-data-management-overview',
    );

    expect(dataManagement).toBeTruthy();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/settings/data"]'),
    ).toBeNull();
  });

  it('renders an accent-color swatch for every preset plus a Default option', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    const swatches = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[aria-label="Accent color"] button[aria-pressed]',
    );
    expect(swatches.length).toBe(7); // 6 presets + Default
  });

  it('selecting a swatch calls AppSettingsStore.setPrimaryColor with the chosen preset', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    const setPrimaryColor = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrimaryColor')
      .mockResolvedValue();

    const roseButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Accent color"] button[aria-label="Rose"]',
    ) as HTMLButtonElement;
    roseButton.click();

    expect(setPrimaryColor).toHaveBeenCalledExactlyOnceWith('rose');
  });

  it('marks the currently-selected accent swatch as pressed', async () => {
    await appDb.appSettings.put({
      id: 1,
      primaryColor: 'rose',
      currencySymbol: undefined,
      currencySymbolPosition: undefined,
    });
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();

    const roseButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Accent color"] button[aria-label="Rose"]',
    );
    const skyButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Accent color"] button[aria-label="Sky"]',
    );

    expect(roseButton?.getAttribute('aria-pressed')).toBe('true');
    expect(skyButton?.getAttribute('aria-pressed')).toBe('false');
  });

  it("shows the Default option's own actual accent color, not an empty placeholder", () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    const defaultSwatch = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Accent color"] button[aria-label="Default"] span',
    );

    expect((defaultSwatch as HTMLElement)?.style.backgroundColor).not.toBe('');
  });

  it('renders the Currency section with the default symbol/position preview', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    const preview = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Currency preview"]',
    );

    expect(preview?.textContent?.trim()).toBe('€1,234.56');
  });

  it('selecting a preset symbol calls AppSettingsStore.setCurrencySymbol', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    const setCurrencySymbol = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbol')
      .mockResolvedValue();

    const dollarButton = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="US Dollar"]',
    ) as HTMLButtonElement;
    dollarButton.click();

    expect(setCurrencySymbol).toHaveBeenCalledExactlyOnceWith('$');
  });

  it('typing a custom symbol calls AppSettingsStore.setCurrencySymbol', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    const setCurrencySymbol = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbol')
      .mockResolvedValue();

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[placeholder="Custom"]',
    ) as HTMLInputElement;
    input.value = 'kr';
    input.dispatchEvent(new Event('input'));

    expect(setCurrencySymbol).toHaveBeenCalledExactlyOnceWith('kr');
  });

  it('selecting a position calls AppSettingsStore.setCurrencySymbolPosition', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    const setCurrencySymbolPosition = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbolPosition')
      .mockResolvedValue();

    const afterButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Symbol position"] button:last-child',
    ) as HTMLButtonElement;
    afterButton.click();

    expect(setCurrencySymbolPosition).toHaveBeenCalledExactlyOnceWith('after');
  });

  it('includes copy clarifying this is display-only, not currency conversion', () => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "doesn't convert between currencies",
    );
  });
});
