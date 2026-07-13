const CURRENCY_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const SIGNED_CURRENCY_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'always',
});

/** Single source of EUR currency-rounding truth (2 decimals, en-BE grouping) — reused by SignedAmountPipe, dashboard formatters, and chart tooltip formatters (TICKET-STAT-12) so none can drift out of sync. */
export function formatCurrency(amount: number, options?: { signed?: boolean }): string {
  return options?.signed
    ? SIGNED_CURRENCY_FORMATTER.format(amount)
    : CURRENCY_FORMATTER.format(amount);
}
