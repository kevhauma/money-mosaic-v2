import { signal } from '@angular/core';

export type CurrencySymbolPosition = 'before' | 'after';

export const DEFAULT_CURRENCY_SYMBOL = '€';
export const DEFAULT_CURRENCY_SYMBOL_POSITION: CurrencySymbolPosition = 'before';

// Decimal (not `style: 'currency'`) — TICKET-SET-03 replaced the ISO-4217-code approach with a
// free-form display symbol, so number formatting and the symbol are composed separately here
// rather than left to `Intl`'s locale-driven currency placement. `en-US`, not `en-BE` — despite
// the app's original `Intl.NumberFormat('en-BE', { style: 'currency', ... })` reading like it
// grouped `en-BE`-style, `en-BE`'s *decimal* style actually renders `1.234,56` (`.`/`,` swapped
// from what the original code produced); `en-US` decimal output (`1,234.56`) is what actually
// matches the app's existing formatting, unchanged.
const DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const SIGNED_DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
});

const currencySymbol = signal<string>(DEFAULT_CURRENCY_SYMBOL);
const currencySymbolPosition = signal<CurrencySymbolPosition>(DEFAULT_CURRENCY_SYMBOL_POSITION);

/** Kept in sync with `AppSettingsStore.currencySymbol` by an effect there (TICKET-SET-03). */
export function setCurrencySymbol(symbol: string): void {
  currencySymbol.set(symbol || DEFAULT_CURRENCY_SYMBOL);
}

/** Kept in sync with `AppSettingsStore.currencySymbolPosition` by an effect there (TICKET-SET-03). */
export function setCurrencySymbolPosition(position: CurrencySymbolPosition): void {
  currencySymbolPosition.set(position);
}

/** Splits a formatted number into its sign (`+`/`-`/``) and unsigned magnitude, so the currency symbol can be spliced in on either side of the number without ever landing between the sign and the digits. */
function signAndMagnitude(
  formatter: Intl.NumberFormat,
  amount: number,
): { sign: string; magnitude: string } {
  let sign = '';
  let magnitude = '';
  for (const part of formatter.formatToParts(amount)) {
    if (part.type === 'minusSign' || part.type === 'plusSign') {
      sign += part.value;
    } else {
      magnitude += part.value;
    }
  }
  return { sign, magnitude };
}

/**
 * Single source of currency-rounding truth (2 decimals, en-BE grouping) — reused by SignedAmountPipe,
 * dashboard formatters, and chart tooltip formatters (TICKET-STAT-12) so none can drift out of sync.
 * Reads the current symbol/position from module-level signals kept in sync with `AppSettingsStore`
 * (TICKET-SET-03), so wrapping `computed()`s/templates/impure pipes re-run automatically when either
 * setting changes.
 */
export function formatCurrency(amount: number, options?: { signed?: boolean }): string {
  const { sign, magnitude } = signAndMagnitude(
    options?.signed ? SIGNED_DECIMAL_FORMATTER : DECIMAL_FORMATTER,
    amount,
  );
  const symbol = currencySymbol();
  return currencySymbolPosition() === 'after'
    ? `${sign}${magnitude}${symbol}`
    : `${sign}${symbol}${magnitude}`;
}
