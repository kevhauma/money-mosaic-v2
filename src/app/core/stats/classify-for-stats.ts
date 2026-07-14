import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { categoryKindContribution } from './category-kind-contribution';
import { resolveContribution, type JointLegContext } from './classify-joint-leg';

export type StatsClassification =
  | { kind: 'skip' }
  | { kind: 'savings'; amount: number }
  | { kind: 'income' | 'expense'; amount: number; categoryId: number | null };

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

const emptyJointLegContext: Omit<JointLegContext, 'categoriesById'> = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
};

/**
 * The single per-transaction classification pipeline shared by every income/expense/savings
 * aggregation (`computePeriodStats`, `computeCategoryBreakdown`, `computeWeekdayWeekendSplit`;
 * CR3-2.1). Exclusion order matters and is fixed here once: range → `nullified` → zero-amount (a
 * genuine no-op) → savings movement → linked transfer (TICKET-STAT-18 — nullified must run before the savings check, and the
 * transfer-link check must stay *below* it so a linked transfer leg to a savings account still
 * counts toward `savings`). A `neutral`-kind category, and a co-owner/`notMine`-excluded joint leg,
 * are excluded too (`kind: 'skip'`).
 *
 * For a joint account or a transaction carrying a manual `attributionOverride`, routing goes
 * through `resolveContribution`, with two special cases: a `personal`-flagged leg already carries
 * the full unshared amount, so it's netted by category kind exactly like a non-joint transaction
 * (a payback on a personal-flagged joint expense reduces expense rather than counting as income);
 * an *untagged* positive-amount transaction under an expense category on a joint account (no
 * override) is a refund of shared spending, not new income — only the account's `ownershipShare`
 * is deducted from expense. Every other leg buckets by raw `weight` sign. A plain own-account
 * transaction buckets by `categoryKindContribution` (TICKET-STAT-11's signed netting; category kind
 * decides the bucket, not raw amount sign, so a refund on an expense category nets it down instead
 * of counting as income).
 *
 * `amount` is always the signed delta the caller adds to its running total — it can be negative
 * when a leg nets a bucket down (a payback/refund) rather than up.
 */
export const classifyForStats = (
  transaction: Transaction,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): StatsClassification => {
  if (!inRange(transaction, from, to)) return { kind: 'skip' };
  if (transaction.nullified) return { kind: 'skip' };
  if (transaction.amount === 0) return { kind: 'skip' };
  if (isSavingsMovement(transaction, ownSavingsIbans)) {
    // Money moved into savings (negative amount) adds to savings; a withdrawal (positive amount)
    // subtracts, so an emergency withdrawal isn't mistaken for income and round-trips net to zero.
    return { kind: 'savings', amount: -transaction.amount };
  }
  if (transaction.transferId != null) return { kind: 'skip' };

  const category =
    transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
  const categoryId = category?.id ?? null;

  const account = accountsById.get(transaction.accountId);
  if (account && (account.type === 'joint' || transaction.attributionOverride)) {
    const jointLegContext: JointLegContext = {
      ...emptyJointLegContext,
      categoriesById,
      accountsById,
    };
    const { weight, excluded } = resolveContribution(transaction, account, jointLegContext);
    if (excluded) return { kind: 'skip' };

    if (transaction.attributionOverride?.mode === 'personal') {
      const contribution = categoryKindContribution(weight, category?.kind);
      if (!contribution) return { kind: 'skip' };
      return { kind: contribution.bucket, amount: contribution.amount, categoryId };
    }
    if (
      !transaction.attributionOverride &&
      category?.kind === 'expense' &&
      transaction.amount > 0
    ) {
      const share = account.ownershipShare ?? 1;
      return { kind: 'expense', amount: -(transaction.amount * share), categoryId };
    }
    if (weight > 0) return { kind: 'income', amount: weight, categoryId };
    if (weight < 0) return { kind: 'expense', amount: -weight, categoryId };
    return { kind: 'skip' };
  }

  const contribution = categoryKindContribution(transaction.amount, category?.kind);
  if (!contribution) return { kind: 'skip' };
  return { kind: contribution.bucket, amount: contribution.amount, categoryId };
};
