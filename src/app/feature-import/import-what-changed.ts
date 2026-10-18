import type { Account, Transaction } from '@/core/data-access';
import type { CommitImportResult } from '@/core/import';
import { isSavingsMovement } from '@/core/transfers';
import { formatAlignedRangeLabel, formatDate } from '@/shared/utils';

/** What one run of the importer did, read from the live store (TICKET-IMP-18). */
export type ImportWhatChanged = {
  /** Added transactions still present — one deleted since drops out of every figure below. */
  addedCount: number;
  /** Earliest and latest booking date among them, or `null` when none are left. */
  period: { from: string; to: string } | null;
  /** Inflows, leaving out linked transfers and savings movements — neither is income. */
  moneyIn: number;
  /** Outflows (negative), on the same terms — neither is spending. */
  moneyOut: number;
  /** Sorted without the user: a category, not set by hand, not a transfer. */
  categorisedCount: number;
  /** In the categorisation backlog — the backlog's own list, so the two can never disagree. */
  needsCategoryCount: number;
  transfersLinkedCount: number;
};

export type ImportWhatChangedContext = {
  transactionsById: ReadonlyMap<number, Transaction>;
  /** Ids of `TransactionsStore.uncategorisedTransactions()` — the FR-CAT-5 backlog. */
  uncategorisedIds: ReadonlySet<number>;
  ownSavingsIbans: ReadonlySet<string>;
};

const isAutoCategorised = (transaction: Transaction): boolean =>
  transaction.categoryId != null && !transaction.categoryManual && transaction.transferId == null;

/**
 * Totals a run over the ids it added. It looks each one up in the live store rather than reading
 * the commit's own echo, so the figures follow the user as they sort: a transaction categorised by
 * hand leaves "need a category" and does not join "categorised automatically", and one linked as a
 * transfer afterwards moves to the transfers line and out of money in/out.
 */
export const summariseImport = (
  addedIds: readonly number[],
  { transactionsById, uncategorisedIds, ownSavingsIbans }: ImportWhatChangedContext,
): ImportWhatChanged => {
  const summary: ImportWhatChanged = {
    addedCount: 0,
    period: null,
    moneyIn: 0,
    moneyOut: 0,
    categorisedCount: 0,
    needsCategoryCount: 0,
    transfersLinkedCount: 0,
  };

  for (const id of addedIds) {
    const transaction = transactionsById.get(id);
    if (!transaction) continue;

    summary.addedCount += 1;
    summary.period = widenPeriod(summary.period, transaction.bookingDate);
    if (uncategorisedIds.has(id)) summary.needsCategoryCount += 1;
    if (isAutoCategorised(transaction)) summary.categorisedCount += 1;

    if (transaction.transferId != null) {
      summary.transfersLinkedCount += 1;
    } else if (!isSavingsMovement(transaction, ownSavingsIbans)) {
      if (transaction.amount > 0) summary.moneyIn += transaction.amount;
      else summary.moneyOut += transaction.amount;
    }
  }

  return summary;
};

const widenPeriod = (
  period: ImportWhatChanged['period'],
  date: string,
): NonNullable<ImportWhatChanged['period']> =>
  period
    ? {
        from: date < period.from ? date : period.from,
        to: date > period.to ? date : period.to,
      }
    : { from: date, to: date };

/** "September 2026" for a whole month, otherwise the two dates — one when the run spans a day. */
export const formatImportPeriod = ({ from, to }: { from: string; to: string }): string =>
  formatAlignedRangeLabel(from, to) ??
  (from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`);

/** One file of the run, as its line under "What changed" reads. */
export type ImportFileLine = {
  result: CommitImportResult;
  fileName: string;
  accountName: string;
  /** "september.csv · 10 added · 2 already here, skipped" — the skipped half only when there were any. */
  caption: string;
  /** Names the file, so one Undo among several is unambiguous to a screen reader. */
  undoAriaLabel: string;
};

export const toImportFileLines = (
  results: readonly CommitImportResult[],
  accountsById: ReadonlyMap<number, Account>,
): ImportFileLine[] =>
  results.map((result) => {
    const accountName = accountsById.get(result.batch.accountId)?.name ?? 'Deleted account';
    const { rowsAdded, rowsDuplicate } = result.batch;
    return {
      result,
      fileName: result.batch.fileName,
      accountName,
      caption:
        rowsDuplicate > 0
          ? `${result.batch.fileName} · ${rowsAdded} added · ${rowsDuplicate} already here, skipped`
          : `${result.batch.fileName} · ${rowsAdded} added`,
      undoAriaLabel: `Undo the import of ${result.batch.fileName} into ${accountName}`,
    };
  });
