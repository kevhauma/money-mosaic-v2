import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppSettingsStore } from '@/core/state';
import {
  CURRENCY_SYMBOL_PRESETS,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  formatCurrency,
  linkControlToSetting,
  LOCALE_PRESETS,
  type CurrencySymbolPosition,
} from '@/shared/utils';
import {
  FieldsetComponent,
  InputComponent,
  PaperComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';

/** Sample amount for the live currency-format preview — arbitrary, just needs a sign and decimals to show both. */
const CURRENCY_PREVIEW_AMOUNT = 1234.56;

/**
 * Settings' Currency & locale section (TICKET-SET-07): symbol presets + a custom symbol field and
 * the before/after position toggle (TICKET-SET-03), the number/date formatting locale
 * (TICKET-SET-04), and a live preview. Display-only — nothing here converts between currencies.
 */
@Component({
  selector: 'app-settings-currency-locale-section',
  imports: [
    ReactiveFormsModule,
    FieldsetComponent,
    InputComponent,
    PaperComponent,
    SelectComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-currency-locale-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsCurrencyLocaleSectionComponent {
  private readonly appSettingsStore = inject(AppSettingsStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly currencySymbolPresets = CURRENCY_SYMBOL_PRESETS;
  protected readonly localePresets = LOCALE_PRESETS;

  protected readonly currencySymbolControl = this.formBuilder.nonNullable.control(
    this.appSettingsStore.currencySymbol() ?? DEFAULT_CURRENCY_SYMBOL,
  );

  protected readonly localeControl = this.formBuilder.nonNullable.control(
    this.appSettingsStore.locale() ?? DEFAULT_LOCALE,
  );

  constructor() {
    linkControlToSetting(
      this.currencySymbolControl,
      () => this.appSettingsStore.currencySymbol() ?? DEFAULT_CURRENCY_SYMBOL,
      (symbol) => void this.appSettingsStore.setCurrencySymbol(symbol),
    );

    linkControlToSetting(
      this.localeControl,
      () => this.appSettingsStore.locale() ?? DEFAULT_LOCALE,
      (locale) => void this.appSettingsStore.setLocale(locale),
    );
  }

  protected onSelectCurrencySymbolPreset(symbol: string): void {
    this.currencySymbolControl.setValue(symbol);
  }

  protected isCurrencySymbolPositionSelected(position: CurrencySymbolPosition): boolean {
    return (
      (this.appSettingsStore.currencySymbolPosition() ?? DEFAULT_CURRENCY_SYMBOL_POSITION) ===
      position
    );
  }

  protected onSelectCurrencySymbolPosition(position: CurrencySymbolPosition): void {
    void this.appSettingsStore.setCurrencySymbolPosition(position);
  }

  /** Live preview of the configured symbol/position — reads through `formatCurrency` itself so it can never drift from what the rest of the app actually renders. */
  protected currencyPreview(): string {
    return formatCurrency(CURRENCY_PREVIEW_AMOUNT);
  }
}
