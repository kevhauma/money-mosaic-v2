import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { appDb } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { SettingsThemeSectionComponent } from './settings-theme-section.component';

describe('SettingsThemeSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsThemeSectionComponent],
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
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(SettingsThemeSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders an accent-color swatch for every preset plus a Default option', () => {
    const swatches = render().querySelectorAll('[aria-label="Accent color"] button[aria-pressed]');

    expect(swatches.length).toBe(7); // 6 presets + Default
  });

  it('selecting a swatch calls AppSettingsStore.setPrimaryColor with the chosen preset', () => {
    const element = render();
    const setPrimaryColor = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrimaryColor')
      .mockResolvedValue();

    const roseButton = element.querySelector(
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
      locale: undefined,
      excludedIncomeCategoryIds: undefined,
    });
    const fixture = TestBed.createComponent(SettingsThemeSectionComponent);
    fixture.detectChanges();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(
      element
        .querySelector('[aria-label="Accent color"] button[aria-label="Rose"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      element
        .querySelector('[aria-label="Accent color"] button[aria-label="Sky"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it("shows the Default option's own actual accent color, not an empty placeholder", () => {
    const defaultSwatch = render().querySelector(
      '[aria-label="Accent color"] button[aria-label="Default"] span',
    );

    expect((defaultSwatch as HTMLElement)?.style.backgroundColor).not.toBe('');
  });

  it('renders the accent row inside the theme grid, right after the last default theme', () => {
    const element = render();

    const accentRow = element
      .querySelector('[aria-label="Accent color"]')
      ?.closest('.col-span-full');
    const previousCard = accentRow?.previousElementSibling as HTMLElement | null;

    expect(accentRow).toBeTruthy();
    expect(previousCard?.getAttribute('data-theme')).toBe('deformable-dark');
  });
});
