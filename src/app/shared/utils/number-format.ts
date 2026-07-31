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

/** Direction carried by the number itself, with an explicit `+` on a rise — for a standalone
 * change figure with no icon or neighbouring value to read the sign from (the yearly income
 * chart's per-bar %-change label, TICKET-INC-06). `'default'`'s `signDisplay: 'auto'` leaves a
 * rise bare, which reads as an absolute amount rather than a delta when the label stands alone. */
export const SIGNED_PERCENT_FORMATTER = computed(
  () =>
    new Intl.NumberFormat(locale(), {
      style: 'percent',
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    }),
);

export type PercentVariant = 'default' | 'sign-by-icon' | 'signed';

const PERCENT_FORMATTERS: Record<PercentVariant, () => Intl.NumberFormat> = {
  default: PERCENT_FORMATTER,
  'sign-by-icon': SIGN_BY_ICON_PERCENT_FORMATTER,
  signed: SIGNED_PERCENT_FORMATTER,
};

/**
 * Locale-aware percent display (TICKET-NG-10) — `variant` selects one of the app's current
 * conventions: `'default'` (1 fraction digit, `-` only) for a plain percentage, `'sign-by-icon'`
 * (0 fraction digits, never signed) when an adjacent icon already conveys direction, and
 * `'signed'` (1 fraction digit, explicit `+`/`-`) for a standalone change figure.
 */
export function formatPercent(value: number, variant: PercentVariant = 'default'): string {
  return PERCENT_FORMATTERS[variant]().format(value);
}

export const RATIO_FORMATTER = computed(
  () => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }),
);

/** Locale-aware "×"-style ratio display (TICKET-NG-10), e.g. the weekday/weekend spend comparison. */
export function formatRatio(value: number): string {
  return RATIO_FORMATTER().format(value);
}
