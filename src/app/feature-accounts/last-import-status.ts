import { formatDate } from '@/shared/utils';

/**
 * How old an account's newest import may get before the app says so (TICKET-ACC-13).
 *
 * 30 days, and the reason is the cadence of the thing being imported: banks publish statements
 * monthly, so a file older than about a month means at least one statement has been published and
 * not loaded — the first point at which "this balance is behind" is certainly true rather than
 * merely possible. A shorter threshold would nag anyone who imports on a monthly rhythm, which is
 * the normal rhythm; a longer one would let two whole statements go missing before saying anything.
 */
export const STALE_AFTER_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type LastImportFreshness = 'never' | 'current' | 'stale';

/** What an account card and the account detail header both print about the data's age. */
export type LastImportStatus = {
  freshness: LastImportFreshness;
  /** The line as shown — resolved here so neither template formats a date or counts a day. */
  label: string;
  /**
   * Whether to mark it. `never` and `stale` are different facts but the same instruction to the
   * reader — *don't trust this balance yet* — so both are marked, and the label says which it is.
   */
  needsAttention: boolean;
};

/** Whole days between two instants, floored — 23 hours ago is still "today", not "1 day ago". */
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);

/**
 * Turns "the newest `importedAt` for this account, if any" into the line the UI shows
 * (TICKET-ACC-13). A pure function of its arguments — `now` is passed in rather than read from the
 * clock, so a spec can place an account either side of the threshold without freezing time.
 *
 * An account with no batches reads "Never imported", never a blank or an epoch date: a fresh
 * account carrying only an opening balance is a real and common state, and it is exactly the one
 * where a silent gap would read as "up to date".
 */
export const lastImportStatus = (
  lastImportedAt: string | undefined,
  now: string,
): LastImportStatus => {
  if (!lastImportedAt) {
    return { freshness: 'never', label: 'Never imported', needsAttention: true };
  }

  const on = formatDate(lastImportedAt.slice(0, 10));
  const days = daysBetween(lastImportedAt, now);
  if (days <= STALE_AFTER_DAYS) {
    return { freshness: 'current', label: `Last import ${on}`, needsAttention: false };
  }

  return {
    freshness: 'stale',
    label: `Last import ${on} — ${days} days ago`,
    needsAttention: true,
  };
};
