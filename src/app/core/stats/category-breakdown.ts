import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { categoryKindContribution } from './category-kind-contribution';
import { resolveContribution, type JointLegContext } from './classify-joint-leg';

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
  // Netted totals can go negative when refunds/paybacks exceed spend in the range — clamp to 0
  // rather than letting a category go negative or flip into the other bucket (TICKET-STAT-11).
  const clampedEntries = [...totalsByCategoryId.entries()].map(
    ([categoryId, { total, count }]) => [categoryId, { total: Math.max(0, total), count }] as const,
  );
  const grandTotal = clampedEntries.reduce((sum, [, entry]) => sum + entry.total, 0);

  return clampedEntries
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
  totals.set(key, { total: existing.total + amount, count: existing.count + 1 });
};

/**
 * Splits [from, to] transactions into expense-by-category and income-by-source totals with
 * share-of-total (FR-STAT-3). Linked transfers and movements to/from an own savings account are
 * excluded, so a savings movement never surfaces as an (uncategorised) expense entry (TICKET-TRF-02).
 * A `neutral`-kind category (e.g. a partner's contribution) is excluded from both buckets — it never
 * shows up as an income source or an expense slice (TICKET-CAT-02). Within a category's bucket, its
 * total is netted by signed amount via `categoryKindContribution` rather than summed by magnitude —
 * a refund/payback on an expense category reduces that category's total instead of inflating it,
 * clamped to 0 if refunds exceed spend (TICKET-STAT-11).
 *
 * For a **joint** account (`accountsById`), each transaction is classified via the shared
 * `resolveContribution` instead: my income into the pot counts at 100%, an untagged co-owner inflow
 * (identified by IBAN, not just a `neutral` category) is excluded like a tagged one, and shared
 * spending's category slice reflects only my `ownershipShare` — so category shares are my borne
 * cost, not the pot's full spend (TICKET-STAT-03). A transaction carrying a manual
 * `attributionOverride` is also routed through `resolveContribution` regardless of account type
 * (TICKET-TXN-03). Bucketing for a joint/override leg is by raw `weight` sign, not by category
 * kind — with two exceptions: a `personal`-flagged leg, whose `weight` already carries the full
 * unshared amount, is netted by category kind exactly like a non-joint transaction (a payback on a
 * personal-flagged joint expense reduces that category rather than counting as income); and an
 * *untagged* positive-amount transaction under an expense category on a joint account (no override)
 * is treated as a refund of shared spending rather than new income — only my `ownershipShare` of it
 * is deducted from that category, mirroring how a negative-amount shared spend is weighted. A
 * `nullified` transaction is skipped outright, even when categorised — it never shows up in either
 * bucket (TICKET-TXN-04).
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
  const jointLegContext: JointLegContext = {
    ...emptyJointLegContext,
    categoriesById,
    accountsById,
  };

  for (const transaction of transactions) {
    if (transaction.transferId != null) continue;
    if (transaction.nullified) continue;
    if (isSavingsMovement(transaction, ownSavingsIbans)) continue;
    if (!inRange(transaction, from, to)) continue;
    if (transaction.amount === 0) continue;

    const category =
      transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
    const key = category?.id ?? null;

    const account = accountsById.get(transaction.accountId);
    if (account && (account.type === 'joint' || transaction.attributionOverride)) {
      const { weight, excluded } = resolveContribution(transaction, account, jointLegContext);
      if (excluded) continue;
      if (transaction.attributionOverride?.mode === 'personal') {
        // A `personal`-flagged leg already carries the full, unshared amount — net it by category
        // kind exactly like a non-joint transaction, so a payback on a personal-flagged joint
        // expense reduces that category instead of counting as income.
        const contribution = categoryKindContribution(weight, category?.kind);
        if (!contribution) continue;
        addTotal(
          contribution.bucket === 'expense' ? expenseTotals : incomeTotals,
          key,
          contribution.amount,
        );
        continue;
      }
      if (
        !transaction.attributionOverride &&
        category?.kind === 'expense' &&
        transaction.amount > 0
      ) {
        // An untagged positive-amount transaction under an expense category on a joint account is a
        // refund/payback of shared spending, not new income — net my `ownershipShare` of it down
        // against expense, mirroring how a negative-amount shared spend is weighted (`jointSpend`).
        const share = account.ownershipShare ?? 1;
        addTotal(expenseTotals, key, -(transaction.amount * share));
        continue;
      }
      if (weight > 0) addTotal(incomeTotals, key, weight);
      else if (weight < 0) addTotal(expenseTotals, key, -weight);
      continue;
    }

    const contribution = categoryKindContribution(transaction.amount, category?.kind);
    if (!contribution) continue;
    addTotal(
      contribution.bucket === 'expense' ? expenseTotals : incomeTotals,
      key,
      contribution.amount,
    );
  }

  return {
    expenseByCategory: finalizeEntries(expenseTotals),
    incomeBySource: finalizeEntries(incomeTotals),
  };
};
