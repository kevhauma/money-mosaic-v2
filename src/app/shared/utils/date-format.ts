import { computed } from '@angular/core';
import { locale } from './format-settings';

const parseIsoDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

// `computed`, not a module-level constant — rebuilt (memoized here) whenever `locale` changes.
const DATE_FORMATTER = computed(
  () =>
    new Intl.DateTimeFormat(locale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }),
);

/**
 * Locale-aware display for an ISO (`YYYY-MM-DD`) date string — e.g. `07/26/2026` under the
 * `en-US` default vs `26/07/2026` under `en-BE`. Reads the current locale from
 * `format-settings.ts`'s module-level signal, kept in sync with `AppSettingsStore.locale` by one
 * effect (TICKET-SET-04/TICKET-NG-10), so every call site reformats automatically when the
 * setting changes.
 */
export function formatDate(isoDate: string): string {
  return DATE_FORMATTER().format(parseIsoDate(isoDate));
}

const SHORT_MONTH_FORMATTER = computed(
  () => new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }),
);

/**
 * Just the month, abbreviated — `Mar` under `en-US`, `mrt` under `nl-BE`. For a surface that has
 * already established the year in a heading, where repeating it on every row is noise.
 *
 * Locale-aware like `formatDate` above, and for the same reason: `Intl`'s `'short'` month is the
 * portable spelling of "the three-letter one", and hardcoding an English table would be wrong for
 * anyone who changed the locale setting (TICKET-SET-04). Some locales abbreviate to four
 * characters or none at all, which is correct for them.
 */
export function formatMonthShort(isoDate: string): string {
  return SHORT_MONTH_FORMATTER().format(parseIsoDate(isoDate));
}

const MONTH_YEAR_FORMATTER = computed(
  () => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
);

/**
 * The month and its year — `March 2027` under `en-US`, `maart 2027` under `nl-BE`. For a projected
 * date (TICKET-FUT-05), where naming a day would imply a precision a straight-line forecast does
 * not have: the answer is "some time that month", so that is what it says.
 *
 * Locale-aware like `formatDate` above, and for the same reason.
 */
export function formatMonthYear(isoDate: string): string {
  return MONTH_YEAR_FORMATTER().format(parseIsoDate(isoDate));
}

const LONG_MONTH_FORMATTER = computed(
  () => new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }),
);

/**
 * The full month name for a 1–12 month number — `April` under `en-US`, `april` under `nl-BE` —
 * for a picker that names a month with no specific day or year (TICKET-SET-09's fiscal year
 * start). Takes a month number rather than an ISO date since there's no real day to anchor to.
 *
 * Locale-aware like `formatDate` above, and for the same reason.
 */
export function formatMonthName(monthNumber: number): string {
  return LONG_MONTH_FORMATTER().format(new Date(Date.UTC(2000, monthNumber - 1, 1)));
}

const SHORT_WEEKDAY_FORMATTER = computed(
  () => new Intl.DateTimeFormat(locale(), { weekday: 'short', timeZone: 'UTC' }),
);

/**
 * Just the weekday, abbreviated — `Mon` under `en-US`, `ma` under `nl-BE`. For an axis whose
 * columns *are* the days of the week (TICKET-STAT-29), where the date itself is already folded
 * away. Locale-aware for the same reason as `formatMonthShort` above.
 */
export function formatWeekdayShort(isoDate: string): string {
  return SHORT_WEEKDAY_FORMATTER().format(parseIsoDate(isoDate));
}
