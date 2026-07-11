import type { Account, Transaction } from '@/core/data-access';
import {
  reimbursedTransferLegIds,
  resolveContribution,
  type JointLegContext,
} from './classify-joint-leg';

/**
 * My net-worth stake in a joint account (TICKET-STAT-03): `ownershipShare * openingBalance` plus
 * every one of its own transactions weighted via `resolveContribution` — which also honours a
 * manual `attributionOverride` and zeroes out a leg reimbursed via `reimbursementTransferId`
 * (TICKET-TXN-03). For a non-joint account this isn't meaningful — callers gate on
 * `account.type === 'joint'` and fall back to the raw balance instead.
 */
export const computeJointAccountStake = (
  transactions: Transaction[],
  jointAccount: Account,
  context: JointLegContext,
): number => {
  const share = jointAccount.ownershipShare ?? 1;
  let stake = jointAccount.openingBalance * share;
  const suppressed = reimbursedTransferLegIds(transactions, context.transfersById);

  for (const transaction of transactions) {
    if (transaction.accountId !== jointAccount.id) continue;
    stake += resolveContribution(transaction, jointAccount, context, suppressed).weight;
  }

  return stake;
};
