import type { Account, Transaction } from '@/core/data-access';
import { classifyJointLeg, jointLegStakeDelta, type JointLegContext } from './classify-joint-leg';

/**
 * My net-worth stake in a joint account (TICKET-STAT-03): `ownershipShare * openingBalance` plus
 * every one of its own transactions weighted via `classifyJointLeg`/`jointLegStakeDelta`. For a
 * non-joint account this isn't meaningful — callers gate on `account.type === 'joint'` and fall
 * back to the raw balance instead.
 */
export const computeJointAccountStake = (
  transactions: Transaction[],
  jointAccount: Account,
  context: JointLegContext,
): number => {
  const share = jointAccount.ownershipShare ?? 1;
  let stake = jointAccount.openingBalance * share;

  for (const transaction of transactions) {
    if (transaction.accountId !== jointAccount.id) continue;
    const classification = classifyJointLeg(transaction, jointAccount, context);
    stake += jointLegStakeDelta(transaction, jointAccount, classification);
  }

  return stake;
};
