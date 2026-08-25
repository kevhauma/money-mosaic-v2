import type { Account, ImportBatch } from '@/core/data-access';
import type { UndoImportImpact } from '@/core/import';
import { formatDate } from '@/shared/utils';

/** One past import as the history table renders it — every display fact already resolved. */
export type ImportHistoryRow = {
  batchId: number;
  importedOn: string;
  fileName: string;
  accountName: string;
  rowsAdded: number;
  /** `rowsAdded` as a phrase, pluralised, since the column reads as prose next to a file name. */
  rowsLabel: string;
  /** Names the batch, so one Undo among twenty is unambiguous to a screen reader. */
  undoAriaLabel: string;
};

const UNKNOWN_ACCOUNT = 'Deleted account';

/**
 * Past imports, newest first (TICKET-IMP-13) — the order a history is read in, and the order that
 * puts the batch you most likely want to undo at the top.
 *
 * A batch whose account has since been deleted still lists, named as such rather than dropped: the
 * rows it created are gone with the account, and a history that quietly omits an import is a
 * history you cannot trust to be complete.
 */
export const toImportHistoryRows = (
  batches: readonly ImportBatch[],
  accountsById: ReadonlyMap<number, Account>,
): ImportHistoryRow[] =>
  [...batches]
    .filter((batch) => batch.id != null)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .map((batch) => {
      const accountName = accountsById.get(batch.accountId)?.name ?? UNKNOWN_ACCOUNT;
      const rowsLabel = `${batch.rowsAdded} row${batch.rowsAdded === 1 ? '' : 's'}`;

      return {
        batchId: batch.id!,
        importedOn: formatDate(batch.importedAt.slice(0, 10)),
        fileName: batch.fileName,
        accountName,
        rowsAdded: batch.rowsAdded,
        rowsLabel,
        undoAriaLabel: `Undo the import of ${batch.fileName} into ${accountName}`,
      };
    });

/**
 * What the confirm dialog says before an undo (TICKET-IMP-13).
 *
 * States the cost in the order it is felt: how many rows go, then the two things re-importing the
 * same file would **not** bring back — a category the user set by hand, and a transfer link they
 * made. The ticket's requirement is that a since-edited row is "surfaced before undo proceeds, with
 * a stated outcome", and the outcome is stated in full: the row is deleted, the link is not.
 *
 * An already-undone batch gets its own sentence rather than "removes 0 rows", which reads like a
 * bug in the dialog rather than the fact that there is nothing left to remove.
 */
export const undoImportMessage = (row: ImportHistoryRow, impact: UndoImportImpact): string => {
  if (impact.rowCount === 0) {
    return `Nothing left to remove: the transactions from ${row.fileName} are already gone. Undoing again only clears this entry from the list.`;
  }

  const sentences = [
    `This deletes the ${impact.rowCount} transaction${impact.rowCount === 1 ? '' : 's'} imported from ${row.fileName} into ${row.accountName}. Transactions from other imports are untouched.`,
  ];

  if (impact.manuallyCategorisedCount > 0) {
    sentences.push(
      `${impact.manuallyCategorisedCount} of them ${impact.manuallyCategorisedCount === 1 ? 'has a category you set' : 'have categories you set'} by hand — re-importing the file brings the rows back, not those categories.`,
    );
  }

  if (impact.transferLinkedCount > 0) {
    sentences.push(
      `${impact.transferLinkedCount} ${impact.transferLinkedCount === 1 ? 'is' : 'are'} linked as a transfer; the other side of each link stays, as an ordinary transaction.`,
    );
  }

  sentences.push('This cannot itself be undone.');

  return sentences.join(' ');
};
