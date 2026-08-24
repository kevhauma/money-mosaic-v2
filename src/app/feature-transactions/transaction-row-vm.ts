import type { Transaction } from '@/core/data-access';
import type { MoneyTextColor } from '@/shared/utils';

/**
 * One transactions-table row's full render state (TICKET-TXN-09, CR4-1 §5 Option A), joined once
 * per data change over the paged slice only (CR-2.3) so the `@for` loop renders plain fields
 * instead of running `.find()` lookups and string concatenation per change-detection pass.
 */
export type TransactionRowVm = {
  /** The transaction's Dexie id, resolved once here so `@for`'s track and the selection toggle
   * don't each need a `!` assertion on the optional `transaction.id`. */
  id: number;
  transaction: Transaction;
  accountName: string;
  /** Id of the transfer this row is linked to, `undefined` when it isn't — the only field the row
   * needs off the transfer, so the unlink button binds it without a `!` assertion. */
  transferId: number | undefined;
  /**
   * What a linked row's Category cell says instead of "Uncategorised" (TICKET-TRF-06), naming the
   * account at the other end — `Transfer · Savings`, or just `Transfer` when the counterpart leg
   * cannot be resolved. `undefined` for every unlinked row, which keeps its category picker.
   *
   * Linking clears the category on purpose (TICKET-TRF-01) and this ticket does not touch that rule:
   * a correctly-linked transfer was simply being *presented* as the one thing the user is trained to
   * go and fix.
   */
  transferLabel: string | undefined;
  likelyTransfer: boolean;
  selected: boolean;
  /**
   * Distinguishing accessible name for the row checkbox (TICKET-TXN-07). Assembled here — where
   * the locale-aware `formatDate` can be called as a plain function — so the template stops
   * concatenating strings and the component stops exposing `formatDate` as a bare class field.
   */
  ariaLabel: string;
  /**
   * The row's category in `<option value>` form, `''` for uncategorised, so the select cell
   * compares option values without a number→string conversion per option per row. A category id
   * the store doesn't know collapses to `''`, matching the pre-extraction `row.category` lookup.
   */
  categoryId: string;
  /**
   * `undefined` for a non-negative amount (TICKET-UI-27): this table marks losses only and leaves
   * income in the body ink — a green tint on every positive row would colour most of a long page.
   * Resolved here with `negativeMoneyColor` so the cell binds a field rather than re-deriving the
   * sign in markup.
   */
  amountColor: MoneyTextColor | undefined;
};
