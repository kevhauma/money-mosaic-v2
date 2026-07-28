import { computed } from '@angular/core';
import { locale } from './format-settings';

// `computed`, not a module-level constant — rebuilt (memoized here) whenever `locale` changes,
// same discipline as the currency/date formatters; never constructed per call (dashboard hot
// path). Exported (rather than kept module-private like currency-format.ts's formatters) purely
// so a spec can assert on instance identity to prove the memoization — `Intl.NumberFormat` can't
// be reliably `vi.spyOn`-ed as a constructor, so reference equality is the testable seam.
export const PERCENT_FORMATTER = computed(
  () => new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 1 }),
);

/** Sign conveyed by an icon (e.g. an up/down triangle) beside the number, not the number itself —
 * the category-comparison panel's convention (TICKET-NG-10), named here so the next panel that
 * wants the same "icon carries the sign" treatment reuses it instead of re-deriving it. */
export const SIGN_BY_ICON_PERCENT_FORMATTER = computed(
  () =>
    new Intl.NumberFormat(locale(), {
      style: 'percent',
      maximumFractionDigits: 0,
      signDisplay: 'never',
    }),
);

export type PercentVariant = 'default' | 'sign-by-icon';

/**
 * Locale-aware percent display (TICKET-NG-10) — `variant` selects one of the app's two current
 * conventions: `'default'` (1 fraction digit, signed) for a plain percentage, `'sign-by-icon'`
 * (0 fraction digits, never signed) when an adjacent icon already conveys direction.
 */
export function formatPercent(value: number, variant: PercentVariant = 'default'): string {
  const formatter =
    variant === 'sign-by-icon' ? SIGN_BY_ICON_PERCENT_FORMATTER() : PERCENT_FORMATTER();
  return formatter.format(value);
}

export const RATIO_FORMATTER = computed(
  () => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }),
);

/** Locale-aware "×"-style ratio display (TICKET-NG-10), e.g. the weekday/weekend spend comparison. */
export function formatRatio(value: number): string {
  return RATIO_FORMATTER().format(value);
}
