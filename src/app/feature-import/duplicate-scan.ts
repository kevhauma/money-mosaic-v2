import type { DuplicateHandling, ParsedRowResult } from '@/core/import';
import type { AlertStatus } from '@/shared/ui';

/**
 * Everything the wizard shows about "which of this file's rows does the app already have"
 * (TICKET-IMP-14), joined once by the session so the map step takes one input instead of six and
 * no count is derived in three places.
 *
 * Lives in the feature root rather than on `ImportMapStepComponent` for the reason
 * `column-mapping.ts` and `mapper-steps.ts` do: a new import concern is a module, not another
 * cluster of fields on the map step's class.
 */
export type DuplicateScanVm = {
  /** The already-present rows, by object identity — the preview table marks these. */
  rows: ReadonlySet<ParsedRowResult>;
  newCount: number;
  duplicateCount: number;
  /** The scan has run. `false` also covers "still scanning", which is why `scanning` is separate. */
  known: boolean;
  scanning: boolean;
  /** The counts as a sentence, or `null` while nothing is known yet. */
  summary: string | null;
  alertStatus: AlertStatus;
};

/** The scan before it has run — what a map step renders when nothing has been checked yet. */
export const EMPTY_DUPLICATE_SCAN: DuplicateScanVm = {
  rows: new Set(),
  newCount: 0,
  duplicateCount: 0,
  known: false,
  scanning: false,
  summary: null,
  alertStatus: 'info',
};

const rowCount = (count: number): string => `${count} row${count === 1 ? '' : 's'}`;

/**
 * The sentence the review asked for: how many of this file's rows are new and how many the app
 * already has, stated before the user commits rather than after.
 *
 * It follows the user's choice, because the ticket's promise is that *the counts shown are the
 * counts that happen* — under "import them anyway" the recognised rows are added too, and a
 * sentence that still called them "already in this account" and nothing more would leave the reader
 * to do the arithmetic.
 */
export const duplicateScanSummary = (
  newCount: number,
  duplicateCount: number,
  handling: DuplicateHandling,
): string => {
  if (duplicateCount === 0) {
    return `All ${rowCount(newCount)} are new — none of them is already in this account.`;
  }
  if (handling === 'import') {
    return `${rowCount(newCount)} new plus ${duplicateCount} already in this account — all ${newCount + duplicateCount} will be added.`;
  }
  return `${rowCount(newCount)} new, ${duplicateCount} already in this account — those will be skipped.`;
};

/** The label on the preview table's "show me the duplicates" toggle, pluralised. */
export const duplicatesToggleLabel = (
  duplicateCount: number,
  showingOnlyDuplicates: boolean,
): string =>
  showingOnlyDuplicates ? 'Show all rows' : `Show the ${rowCount(duplicateCount)} already imported`;

/** Warning when there is something to decide, info when the answer is simply "all new". */
export const duplicateAlertStatus = (duplicateCount: number): AlertStatus =>
  duplicateCount > 0 ? 'warning' : 'info';
