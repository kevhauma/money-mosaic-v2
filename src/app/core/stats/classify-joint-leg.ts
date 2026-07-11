import type { Account, Category, Transaction, Transfer } from '@/core/data-access';
import { resolveCoOwnerByIban } from '@/core/accounts';

export type JointLegClassification = 'mineIn' | 'mineOut' | 'jointSpend' | 'coOwnerIn';

export type JointLegContext = {
  transactionsById: ReadonlyMap<number, Transaction>;
  accountsById: ReadonlyMap<number, Account>;
  /** Keyed by transaction id, resolving to its Transfer from either leg. */
  transfersById: ReadonlyMap<number, Transfer>;
  categoriesById: ReadonlyMap<number, Category>;
};

/**
 * Classifies a joint account's own transaction leg for the contribution model (TICKET-STAT-03):
 * `mineIn`/`mineOut` — a linked transfer to/from one of my own non-joint accounts, or (for
 * `mineIn`) a positive non-transfer amount not otherwise identifiable as a co-owner's — counts
 * at 100%. `jointSpend` — a negative non-transfer amount (shared spending) — counts at my share
 * only. `coOwnerIn` — a positive non-transfer amount tagged `neutral` or from a registered
 * co-owner IBAN — counts at 0%. The single source of truth reused by `AccountsStore.netWorth`,
 * `computeNetWorthTrend`, `computePeriodStats`, and `computeCategoryBreakdown` so they can't disagree.
 */
export const classifyJointLeg = (
  transaction: Transaction,
  jointAccount: Account,
  context: JointLegContext,
): JointLegClassification => {
  const transfer =
    transaction.transferId != null ? context.transfersById.get(transaction.id!) : undefined;

  if (transfer) {
    const otherTransactionId =
      transfer.fromTransactionId === transaction.id
        ? transfer.toTransactionId
        : transfer.fromTransactionId;
    const otherTransaction = context.transactionsById.get(otherTransactionId);
    const otherAccount = otherTransaction
      ? context.accountsById.get(otherTransaction.accountId)
      : undefined;

    if (otherAccount && otherAccount.type !== 'joint') {
      return transaction.amount > 0 ? 'mineIn' : 'mineOut';
    }
  }

  if (transaction.amount > 0) {
    const category =
      transaction.categoryId != null
        ? context.categoriesById.get(transaction.categoryId)
        : undefined;
    const isCoOwner =
      category?.kind === 'neutral' ||
      resolveCoOwnerByIban(jointAccount, transaction.counterpartyIban) != null;
    return isCoOwner ? 'coOwnerIn' : 'mineIn';
  }

  return 'jointSpend';
};

/**
 * My net-worth-stake contribution of a single classified leg, weighted by the joint account's
 * `ownershipShare` (undefined ⇒ 1, matching a non-joint account's unweighted behaviour). Never
 * rounds — callers accumulate unrounded and round once at the end to avoid cent-level drift
 * across many small transactions.
 */
export const jointLegStakeDelta = (
  transaction: Transaction,
  jointAccount: Account,
  classification: JointLegClassification,
): number => {
  const share = jointAccount.ownershipShare ?? 1;
  switch (classification) {
    case 'mineIn':
    case 'mineOut':
      return transaction.amount;
    case 'jointSpend':
      return transaction.amount * share;
    case 'coOwnerIn':
      return 0;
  }
};

export type ContributionResult = {
  /** The weighted amount this transaction contributes to net worth / income-expense magnitude. */
  weight: number;
  /** True when the transaction must be skipped entirely by income/expense/category-breakdown aggregation (as opposed to counted at a genuine zero). */
  excluded: boolean;
};

const EMPTY_SUPPRESSED: ReadonlySet<number> = new Set();

/**
 * The single override-aware weighting decision (TICKET-TXN-03), reused by `AccountsStore.netWorth`,
 * `computeNetWorthTrend`, `computePeriodStats`, and `computeCategoryBreakdown` so they can't
 * disagree. Resolution order:
 * 1. A transaction referenced by another transaction's `attributionOverride.reimbursementTransferId`
 *    (see `reimbursedTransferLegIds`) contributes zero and is excluded everywhere.
 * 2. `transaction.attributionOverride`, when present: `personal` ⇒ full amount; `notMine` ⇒ zero,
 *    excluded; `shared` ⇒ amount weighted by the referenced `jointAccountId` account's
 *    `ownershipShare` (falling back to weight 1 if the account can't be resolved).
 * 3. Falls back to `classifyJointLeg`/`jointLegStakeDelta` for a `joint`-type account (a `coOwnerIn`
 *    leg is excluded), or the raw amount for a plain own account — exactly today's behaviour.
 */
export const resolveContribution = (
  transaction: Transaction,
  account: Account,
  context: JointLegContext,
  suppressedTransactionIds: ReadonlySet<number> = EMPTY_SUPPRESSED,
): ContributionResult => {
  if (transaction.id != null && suppressedTransactionIds.has(transaction.id)) {
    return { weight: 0, excluded: true };
  }

  const override = transaction.attributionOverride;
  if (override) {
    if (override.mode === 'personal') {
      return { weight: transaction.amount, excluded: false };
    }
    if (override.mode === 'notMine') {
      return { weight: 0, excluded: true };
    }
    const jointAccount =
      override.jointAccountId != null
        ? context.accountsById.get(override.jointAccountId)
        : undefined;
    const share = jointAccount?.ownershipShare ?? 1;
    return { weight: transaction.amount * share, excluded: false };
  }

  if (account.type === 'joint') {
    const classification = classifyJointLeg(transaction, account, context);
    return {
      weight: jointLegStakeDelta(transaction, account, classification),
      excluded: classification === 'coOwnerIn',
    };
  }

  return { weight: transaction.amount, excluded: false };
};

/**
 * Transaction ids that must contribute zero everywhere (TICKET-TXN-03): the two legs of any
 * `Transfer` referenced by some transaction's `attributionOverride.reimbursementTransferId` — the
 * flagged expense's own `shared`-weighted amount already accounts for the reimbursement, so the
 * transfer that paid it back must not also count. `transfersById` is keyed by transaction id (either
 * leg resolves to the same `Transfer`), matching `JointLegContext.transfersById`.
 */
export const reimbursedTransferLegIds = (
  transactions: Iterable<Transaction>,
  transfersById: ReadonlyMap<number, Transfer>,
): ReadonlySet<number> => {
  const transfersByOwnId = new Map<number, Transfer>();
  for (const transfer of transfersById.values()) {
    if (transfer.id != null) transfersByOwnId.set(transfer.id, transfer);
  }

  const result = new Set<number>();
  for (const transaction of transactions) {
    const transferId = transaction.attributionOverride?.reimbursementTransferId;
    if (transferId == null) continue;
    const transfer = transfersByOwnId.get(transferId);
    if (!transfer) continue;
    result.add(transfer.fromTransactionId);
    result.add(transfer.toTransactionId);
  }
  return result;
};
