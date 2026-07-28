import { computed } from '@angular/core';
import { currencySymbol, currencySymbolPosition, locale } from './format-settings';

// `computed`, not a module-level constant — TICKET-SET-04 makes the grouping/decimal-separator
// locale settings-driven, so the formatter must be rebuilt (memoized here) whenever `locale`
// changes, rather than being fixed at module load.
const DECIMAL_FORMATTER = computed(
  () =>
    new Intl.NumberFormat(locale(), {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
);
const SIGNED_DECIMAL_FORMATTER = computed(
  () =>
    new Intl.NumberFormat(locale(), {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'always',
    }),
);

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
 * Single source of currency-rounding truth (2 decimals, settings-driven grouping) — reused by
 * SignedAmountPipe, dashboard formatters, and chart tooltip formatters (TICKET-STAT-12) so none
 * can drift out of sync. Reads the current symbol/position/locale from `format-settings.ts`'s
 * module-level signals, kept in sync with `AppSettingsStore` by one effect
 * (TICKET-SET-03/TICKET-SET-04/TICKET-NG-10), so wrapping `computed()`s/templates/impure pipes
 * re-run automatically when any of the three change.
 */
export function formatCurrency(amount: number, options?: { signed?: boolean }): string {
  const { sign, magnitude } = signAndMagnitude(
    options?.signed ? SIGNED_DECIMAL_FORMATTER() : DECIMAL_FORMATTER(),
    amount,
  );
  const symbol = currencySymbol();
  return currencySymbolPosition() === 'after'
    ? `${sign}${magnitude}${symbol}`
    : `${sign}${symbol}${magnitude}`;
}
