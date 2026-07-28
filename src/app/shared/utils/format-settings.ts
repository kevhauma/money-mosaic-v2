import { signal } from '@angular/core';

export type CurrencySymbolPosition = 'before' | 'after';

export const DEFAULT_CURRENCY_SYMBOL = '€';
export const DEFAULT_CURRENCY_SYMBOL_POSITION: CurrencySymbolPosition = 'before';

// `en-US`, not `en-BE` — despite the app's original `Intl.NumberFormat('en-BE', { style:
// 'currency', ... })` reading like it grouped `en-BE`-style, `en-BE`'s *decimal* style actually
// renders `1.234,56` (`.`/`,` swapped from what the original code produced); `en-US` decimal
// output (`1,234.56`) is what actually matches the app's pre-settings-driven formatting, so it's
// the fallback every unset-locale user keeps seeing (TICKET-SET-04).
export const DEFAULT_LOCALE = 'en-US';

/**
 * The app's one settings-driven formatting channel (TICKET-NG-10, CR4-6 Part 2 Option A) —
 * `currency-format.ts`, `date-format.ts`, and `number-format.ts` all read these three module-level
 * signals; `syncFormatSettings` below is their single writer. Previously two independent private
 * `locale` signals (one in `currency-format.ts`, one in `date-format.ts`), each synced by its own
 * `AppSettingsStore` `onInit` effect — merged into one module so there's exactly one instance of
 * the pattern, not two drifting copies of it.
 */
export const locale = signal<string>(DEFAULT_LOCALE);
export const currencySymbol = signal<string>(DEFAULT_CURRENCY_SYMBOL);
export const currencySymbolPosition = signal<CurrencySymbolPosition>(
  DEFAULT_CURRENCY_SYMBOL_POSITION,
);

export type FormatSettings = {
  locale?: string;
  currencySymbol?: string;
  currencySymbolPosition?: CurrencySymbolPosition;
};

/**
 * The single sync entry point (TICKET-NG-04/TICKET-SET-03 originally split this across three
 * setters) — `AppSettingsStore`'s `onInit` effect calls this once, covering both initial hydration
 * and later edits, so every formatter call site (pipes, dashboard formatters, chart tooltips)
 * reformats without its own wiring.
 */
export function syncFormatSettings(settings: FormatSettings): void {
  locale.set(settings.locale || DEFAULT_LOCALE);
  currencySymbol.set(settings.currencySymbol || DEFAULT_CURRENCY_SYMBOL);
  currencySymbolPosition.set(settings.currencySymbolPosition ?? DEFAULT_CURRENCY_SYMBOL_POSITION);
}
