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
