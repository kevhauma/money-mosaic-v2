import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { categoryKindContribution } from './category-kind-contribution';
import { resolveContribution, type JointLegContext } from './classify-joint-leg';

export type PeriodStats = {
  income: number;
  expense: number;
  /**
   * Net money moved into own savings accounts in the period — deposits count positively, withdrawals
   * negatively, so a round-trip nets to zero. Excluded from `income`/`expense` on both legs (TICKET-TRF-02).
   */
  savings: number;
  net: number;
  /** savings/income — the share of income deliberately moved into savings; null when income is zero (render as "—" rather than divide by zero). */
  savingsRate: number | null;
};

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

const emptyJointLegContext: Omit<JointLegContext, 'categoriesById'> = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
};

/**
 * Income/expense/savings/net for [from, to]. Linked transfers between own accounts are excluded from
 * income/expense (FR-STAT-2); movements to/from an own savings account are reported under a separate
 * `savings` figure rather than as expense/income, whether linked or still one-sided (TICKET-TRF-02).
 * A transaction assigned a `neutral`-kind category (e.g. a partner's contribution) is excluded from
 * income/expense/savingsRate too — it still moves the account balance, just not via this store's
 * derivation, which reads raw `amount` (TICKET-CAT-02). A categorised transaction always contributes
 * to the bucket matching its category's `kind`, netted by signed amount via `categoryKindContribution`
 * — a refund/payback on an expense category nets that total down instead of counting as income, so
 * these totals stay consistent with the category breakdown's own netting (TICKET-STAT-11). Only an
 * uncategorised transaction falls back to raw amount sign.
 *
 * For a **joint** account (`accountsById`), each non-transfer transaction is classified via the
 * shared `resolveContribution` instead: my income into the pot stays at 100%, an untagged co-owner
 * inflow (identified by IBAN, not just a `neutral` category) is excluded like a tagged one, and
 * shared spending contributes only my `ownershipShare` to `expense` (TICKET-STAT-03). A transfer
 * leg never reaches classification here — it's already filtered above, exactly as for a non-joint
 * account — so only the `mineIn`/`jointSpend`/`coOwnerIn` legs matter. A transaction carrying a
 * manual `attributionOverride` is also routed through `resolveContribution`, regardless of its
 * account's type, so a `personal`/`shared`/`notMine` flag on an own-account transaction reweights
 * income/expense the same way it reweights net worth (TICKET-TXN-03). Bucketing for a joint/override
 * leg is by raw `weight` sign, not by category kind — with two exceptions: a `personal`-flagged leg,
 * whose `weight` already carries the full unshared amount, is netted by category kind exactly like a
 * non-joint transaction (a payback on a personal-flagged joint expense reduces `expense` rather than
 * counting as `income`); and an *untagged* positive-amount transaction under an expense category on a
 * joint account (no override) is treated as a refund of shared spending rather than new income — only
 * my `ownershipShare` of it is deducted from `expense`, mirroring how a negative-amount shared spend
 * is weighted. A `nullified` transaction is skipped outright regardless of which path above would
 * otherwise apply — it still moved money (net worth is untouched, computed elsewhere), it just never
 * counts as income or expense (TICKET-TXN-04).
 */
export const computePeriodStats = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): PeriodStats => {
  let income = 0;
  let expense = 0;
  let savings = 0;
  const jointLegContext: JointLegContext = {
    ...emptyJointLegContext,
    categoriesById,
    accountsById,
  };

  for (const transaction of transactions) {
    if (!inRange(transaction, from, to)) continue;

    if (isSavingsMovement(transaction, ownSavingsIbans)) {
      // Money moved into savings (negative amount) adds to savings; a withdrawal (positive amount)
      // subtracts, so an emergency withdrawal isn't mistaken for income and round-trips net to zero.
      savings += -transaction.amount;
      continue;
    }
    if (transaction.transferId != null) continue;
    if (transaction.nullified) continue;

    const category =
      transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;

    const account = accountsById.get(transaction.accountId);
    if (account && (account.type === 'joint' || transaction.attributionOverride)) {
      const { weight, excluded } = resolveContribution(transaction, account, jointLegContext);
      if (excluded) continue;
      if (transaction.attributionOverride?.mode === 'personal') {
        // A `personal`-flagged leg already carries the full, unshared amount — net it by category
        // kind exactly like a non-joint transaction, so a payback on a personal-flagged joint
        // expense reduces expense instead of counting as income.
        const contribution = categoryKindContribution(weight, category?.kind);
        if (!contribution) continue;
        if (contribution.bucket === 'income') income += contribution.amount;
        else expense += contribution.amount;
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
        expense -= transaction.amount * share;
        continue;
      }
      if (weight > 0) income += weight;
      else if (weight < 0) expense += -weight;
      continue;
    }

    const contribution = categoryKindContribution(transaction.amount, category?.kind);
    if (!contribution) continue;

    if (contribution.bucket === 'income') income += contribution.amount;
    else expense += contribution.amount;
  }

  return {
    income,
    expense,
    savings,
    net: income - expense,
    savingsRate: income === 0 ? null : savings / income,
  };
};
