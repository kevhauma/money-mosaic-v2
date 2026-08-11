import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats } from './classify-for-stats';

/** One payment, at the amount it actually contributed to its category's expense total. */
export type CategoryExpenseTransaction = {
  transactionId: number;
  /** Counterparty where the bank gave one, else the raw description — what the payment is called everywhere else in the app. */
  name: string;
  /** The classified contribution, always positive: what this payment added to the category. */
  value: number;
  date: string;
};

export type CategoryExpenseTransactions = {
  transactions: CategoryExpenseTransaction[];
  /**
   * What refunds and paybacks took *out* of this category in the range, as a positive number. Kept
   * beside the payments rather than folded into them: a refund has no honest area on a treemap, but
   * it is why a category's payments can add up to more than the category's own total, and a picture
   * that shows less than it holds has to say so.
   */
  refunded: number;
};

const nameOf = (transaction: Transaction): string =>
  transaction.counterpartyName?.trim() || transaction.rawDescription;

const paymentFor = (
  transaction: Transaction,
  transactionId: number,
  value: number,
): CategoryExpenseTransaction => ({
  transactionId,
  name: nameOf(transaction),
  value,
  date: transaction.bookingDate,
});

/** Biggest payment first inside every category — the order the mosaic's tiles are laid out in, decided once here. */
const heaviestFirst = (
  byCategory: Map<number | null, CategoryExpenseTransactions>,
): Map<number | null, CategoryExpenseTransactions> => {
  for (const { transactions } of byCategory.values()) {
    transactions.sort((a, b) => b.value - a.value);
  }
  return byCategory;
};

/** What one transaction contributed to a category's expense total: its saved id, the bucket, and the signed amount. */
type ExpenseContribution = { transactionId: number; categoryId: number | null; amount: number };

/**
 * One transaction's contribution, or nothing when it isn't a saved expense at all — the two reasons
 * to look away, in one place. A row with no `id` has never been saved, so it has no business in a
 * range aggregate, and giving it a placeholder id would mint two tiles keyed `txn:0`: exactly the
 * collision the namespacing scheme exists to prevent. Everything else is `classifyForStats`'s call.
 */
const expenseContributionOf = (
  transaction: Transaction,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): ExpenseContribution | undefined => {
  const transactionId = transaction.id;
  if (transactionId == null) return undefined;

  const result = classifyForStats(
    transaction,
    from,
    to,
    ownSavingsIbans,
    categoriesById,
    accountsById,
  );
  return result.kind === 'expense'
    ? { transactionId, categoryId: result.categoryId, amount: result.amount }
    : undefined;
};

/** One accumulator per category, created on first sight of it — `null` is the uncategorised bucket, like `CategoryBreakdownEntry`. */
const entryIn = (
  byCategory: Map<number | null, CategoryExpenseTransactions>,
  categoryId: number | null,
): CategoryExpenseTransactions => {
  const existing = byCategory.get(categoryId);
  if (existing) return existing;

  const created: CategoryExpenseTransactions = { transactions: [], refunded: 0 };
  byCategory.set(categoryId, created);
  return created;
};

/**
 * A range's expense transactions grouped by category, at their **classified** amounts
 * (FR-EXP-4, TICKET-EXP-08) — the level below `computeCategoryBreakdown`'s per-category totals,
 * for the mosaic to subdivide a category into the payments that make it up.
 *
 * Every per-transaction decision goes through `classifyForStats`, the same pipeline the breakdown
 * itself uses, so a payment tile and the category tile above it cannot disagree about what counts
 * or what it is worth: out-of-range, `nullified`, savings movements, linked transfers, `neutral`
 * categories and co-owner legs drop out here exactly as they do there, and a joint account's share
 * weighting applies identically.
 *
 * Positive contributions become payments; negative ones (a refund netting its category down) are
 * summed into `refunded` instead. Sorted heaviest first, and keyed by `categoryId` with `null` for
 * the uncategorised bucket, matching `CategoryBreakdownEntry`.
 *
 * Pure: no DI, no store, no Dexie.
 */
export const computeCategoryExpenseTransactions = (
  transactions: Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  from: string,
  to: string,
  // No defaults on these two, unlike `computeCategoryBreakdown`'s: an omitted savings-IBAN set or
  // account map silently changes what counts as an expense, and every caller here has both.
  ownSavingsIbans: ReadonlySet<string>,
  accountsById: ReadonlyMap<number, Account>,
): Map<number | null, CategoryExpenseTransactions> => {
  const byCategory = new Map<number | null, CategoryExpenseTransactions>();

  for (const transaction of transactions) {
    const contribution = expenseContributionOf(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );
    if (!contribution) continue;

    const entry = entryIn(byCategory, contribution.categoryId);
    // A negative contribution is a refund netting its category down — money back, not area.
    if (contribution.amount > 0) {
      entry.transactions.push(
        paymentFor(transaction, contribution.transactionId, contribution.amount),
      );
    } else {
      entry.refunded += -contribution.amount;
    }
  }

  return heaviestFirst(byCategory);
};
