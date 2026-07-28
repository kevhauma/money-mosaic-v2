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
