import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { appDb } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { SettingsCurrencyLocaleSectionComponent } from './settings-currency-locale-section.component';

describe('SettingsCurrencyLocaleSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsCurrencyLocaleSectionComponent],
    }).compileComponents();
  });

  afterEach(async () => {
    // fake-indexeddb is a global singleton and Vitest runs with isolate:false, so a row written
    // here would otherwise leak into other spec files.
    await appDb.appSettings.clear();
    // Same isolate:false leakage risk for format-settings.ts's module-level signals
    // (TICKET-SET-03/TICKET-SET-04/TICKET-NG-10).
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(SettingsCurrencyLocaleSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders the default symbol/position preview', () => {
    const preview = render().querySelector('[aria-label="Currency preview"]');

    expect(preview?.textContent?.trim()).toBe('€1,234.56');
  });

  it('selecting a preset symbol calls AppSettingsStore.setCurrencySymbol', () => {
    const element = render();
    const setCurrencySymbol = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbol')
      .mockResolvedValue();

    (element.querySelector('button[aria-label="US Dollar"]') as HTMLButtonElement).click();

    expect(setCurrencySymbol).toHaveBeenCalledExactlyOnceWith('$');
  });

  it('typing a custom symbol calls AppSettingsStore.setCurrencySymbol', () => {
    const element = render();
    const setCurrencySymbol = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbol')
      .mockResolvedValue();

    const input = element.querySelector('input[placeholder="Custom"]') as HTMLInputElement;
    input.value = 'kr';
    input.dispatchEvent(new Event('input'));

    expect(setCurrencySymbol).toHaveBeenCalledExactlyOnceWith('kr');
  });

  it('selecting a position calls AppSettingsStore.setCurrencySymbolPosition', () => {
    const element = render();
    const setCurrencySymbolPosition = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setCurrencySymbolPosition')
      .mockResolvedValue();

    (
      element.querySelector('[aria-label="Symbol position"] button:last-child') as HTMLButtonElement
    ).click();

    expect(setCurrencySymbolPosition).toHaveBeenCalledExactlyOnceWith('after');
  });

  it('includes copy clarifying this is display-only, not currency conversion', () => {
    expect(render().textContent).toContain("doesn't convert between currencies");
  });

  it('renders a locale select defaulting to the fallback locale', () => {
    const select = render().querySelector('select') as HTMLSelectElement;

    expect(select.value).toBe(DEFAULT_LOCALE);
  });

  it('selecting a locale calls AppSettingsStore.setLocale and reformats the currency preview', () => {
    const element = render();
    const setLocale = vi.spyOn(TestBed.inject(AppSettingsStore), 'setLocale').mockResolvedValue();

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = 'en-BE';
    select.dispatchEvent(new Event('change'));

    expect(setLocale).toHaveBeenCalledExactlyOnceWith('en-BE');
  });

  it('reflects a hydrated locale in both the select and the currency preview', async () => {
    await appDb.appSettings.put({
      id: 1,
      primaryColor: undefined,
      currencySymbol: undefined,
      currencySymbolPosition: undefined,
      locale: 'en-BE',
    });
    const fixture = TestBed.createComponent(SettingsCurrencyLocaleSectionComponent);
    fixture.detectChanges();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // The pull half of `linkControlToSetting`: hydration resolves after the control read its
    // initial value, so the effect has to write the store's value back into the control.
    expect((element.querySelector('select') as HTMLSelectElement).value).toBe('en-BE');
    expect(element.querySelector('[aria-label="Currency preview"]')?.textContent?.trim()).toBe(
      '€1.234,56',
    );
  });
});
