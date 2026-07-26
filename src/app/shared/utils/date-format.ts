import { computed, signal } from '@angular/core';
import { DEFAULT_LOCALE } from './currency-format';

const locale = signal<string>(DEFAULT_LOCALE);

/** Kept in sync with `AppSettingsStore.locale` by an effect there (TICKET-SET-04). */
export function setDateLocale(value: string): void {
  locale.set(value || DEFAULT_LOCALE);
}

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
 * `en-US` default vs `26/07/2026` under `en-BE`. Reads the current locale from a module-level
 * signal kept in sync with `AppSettingsStore.locale` (TICKET-SET-04), mirroring
 * `currency-format.ts`'s pattern, so every call site reformats automatically when the setting
 * changes.
 */
export function formatDate(isoDate: string): string {
  return DATE_FORMATTER().format(parseIsoDate(isoDate));
}
