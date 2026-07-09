import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { classifyJointLeg, jointLegStakeDelta, type JointLegContext } from './classify-joint-leg';

export type CategoryBreakdownEntry = {
  /** null = uncategorised entry (no category assigned, bucketed by amount sign). */
  categoryId: number | null;
  total: number;
  /** Share of the total within its own kind (expense or income), 0..1. */
  share: number;
  transactionCount: number;
};

export type CategoryBreakdown = {
  expenseByCategory: CategoryBreakdownEntry[];
  incomeBySource: CategoryBreakdownEntry[];
};

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

const finalizeEntries = (
  totalsByCategoryId: Map<number | null, { total: number; count: number }>,
): CategoryBreakdownEntry[] => {
  const grandTotal = [...totalsByCategoryId.values()].reduce((sum, entry) => sum + entry.total, 0);

  return [...totalsByCategoryId.entries()]
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      total,
      share: grandTotal === 0 ? 0 : total / grandTotal,
      transactionCount: count,
    }))
    .sort((a, b) => b.total - a.total);
};

const emptyJointLegContext: Omit<JointLegContext, 'categoriesById'> = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
};

const addTotal = (
  totals: Map<number | null, { total: number; count: number }>,
  key: number | null,
  amount: number,
): void => {
  const existing = totals.get(key) ?? { total: 0, count: 0 };
  totals.set(key, { total: existing.total + Math.abs(amount), count: existing.count + 1 });
};

/**
 * Splits [from, to] transactions into expense-by-category and income-by-source totals with
 * share-of-total (FR-STAT-3). Linked transfers and movements to/from an own savings account are
 * excluded, so a savings movement never surfaces as an (uncategorised) expense entry (TICKET-TRF-02).
 * A `neutral`-kind category (e.g. a partner's contribution) is excluded from both buckets — it never
 * shows up as an income source or an expense slice (TICKET-CAT-02).
 *
 * For a **joint** account (`accountsById`), each transaction is classified via the shared
 * `classifyJointLeg` instead: my income into the pot counts at 100%, an untagged co-owner inflow
 * (identified by IBAN, not just a `neutral` category) is excluded like a tagged one, and shared
 * spending's category slice reflects only my `ownershipShare` — so category shares are my borne
 * cost, not the pot's full spend (TICKET-STAT-03).
 */
export const computeCategoryBreakdown = (
  transactions: Transaction[],
  categoriesById: Map<number, Category>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): CategoryBreakdown => {
  const expenseTotals = new Map<number | null, { total: number; count: number }>();
  const incomeTotals = new Map<number | null, { total: number; count: number }>();
  const jointLegContext: JointLegContext = { ...emptyJointLegContext, categoriesById };

  for (const transaction of transactions) {
    if (transaction.transferId != null) continue;
    if (isSavingsMovement(transaction, ownSavingsIbans)) continue;
    if (!inRange(transaction, from, to)) continue;
    if (transaction.amount === 0) continue;

    const category =
      transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
    const key = category?.id ?? null;

    const account = accountsById.get(transaction.accountId);
    if (account?.type === 'joint') {
      const classification = classifyJointLeg(transaction, account, jointLegContext);
      if (classification === 'coOwnerIn') continue;
      if (classification === 'jointSpend') {
        addTotal(expenseTotals, key, jointLegStakeDelta(transaction, account, classification));
      } else {
        addTotal(incomeTotals, key, transaction.amount);
      }
      continue;
    }

    if (category?.kind === 'neutral') continue;
    const isExpense = category ? category.kind === 'expense' : transaction.amount < 0;
    addTotal(isExpense ? expenseTotals : incomeTotals, key, transaction.amount);
  }

  return {
    expenseByCategory: finalizeEntries(expenseTotals),
    incomeBySource: finalizeEntries(incomeTotals),
  };
};
