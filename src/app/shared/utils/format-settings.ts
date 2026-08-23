import { signal } from '@angular/core';

export type CurrencySymbolPosition = 'before' | 'after';

export const DEFAULT_CURRENCY_SYMBOL = '€';
export const DEFAULT_CURRENCY_SYMBOL_POSITION: CurrencySymbolPosition = 'before';

/**
 * `en-BE`, deliberately (TICKET-SET-10) — this **supersedes** TICKET-SET-04's `'en-US'` choice, and
 * the swap it warned about is the point: `en-BE` renders dates day-first (`20/08/2026`) and groups
 * decimals `1.234,56`, which is how the app's one documented user — Belgium, EUR, KBC/Belfius
 * exports (`PRODUCT.md`) — actually reads them. SET-04 picked `en-US` to preserve the app's
 * *pre-settings* output; that was a compatibility argument, not a correctness one, and a fresh
 * install has no pre-settings output to preserve.
 *
 * Deliberately **not** derived from `navigator.language` — see `resolveDefaultLocale` below.
 */
export const DEFAULT_LOCALE = 'en-BE';

/**
 * The locale a fresh install (no stored `locale` setting) formats with.
 *
 * TICKET-SET-10 considered deriving this from `navigator.language` and rejected it: the browser
 * language of a Belgian user is routinely `en-US`, which is a supported preset, so detection would
 * hand that user back the exact `MM/DD/YYYY` ordering this ticket exists to remove. A single-user
 * local-first app with one documented locale gains nothing from guessing, and the Settings →
 * Currency & locale select overrides this in one click either way.
 *
 * Kept as a function rather than inlining `DEFAULT_LOCALE` at the two call sites so the decision
 * has one named home if a future ticket does want detection.
 */
function resolveDefaultLocale(): string {
  return DEFAULT_LOCALE;
}

/**
 * The app's one settings-driven formatting channel (TICKET-NG-10, CR4-6 Part 2 Option A) —
 * `currency-format.ts`, `date-format.ts`, and `number-format.ts` all read these three module-level
 * signals; `syncFormatSettings` below is their single writer. Previously two independent private
 * `locale` signals (one in `currency-format.ts`, one in `date-format.ts`), each synced by its own
 * `AppSettingsStore` `onInit` effect — merged into one module so there's exactly one instance of
 * the pattern, not two drifting copies of it.
 */
export const locale = signal<string>(resolveDefaultLocale());
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
  locale.set(settings.locale || resolveDefaultLocale());
  currencySymbol.set(settings.currencySymbol || DEFAULT_CURRENCY_SYMBOL);
  currencySymbolPosition.set(settings.currencySymbolPosition ?? DEFAULT_CURRENCY_SYMBOL_POSITION);
}
