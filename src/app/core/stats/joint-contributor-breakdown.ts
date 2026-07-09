import type { Account, Transaction } from '@/core/data-access';
import { resolveCoOwnerByIban } from '@/core/accounts';
import { classifyJointLeg, type JointLegContext } from './classify-joint-leg';

export type ContributorBreakdown = {
  /** Verified: a linked transfer in from one of my own non-joint accounts. */
  mine: number;
  /** Each registered co-owner's tagged/IBAN-resolved inflows, keyed by co-owner name. */
  byCoOwner: Map<string, number>;
  /**
   * Inflows counted toward my stake under the "assumed mine" heuristic (positive, non-transfer,
   * not identifiable as a registered co-owner) but not a verified transfer from my own account —
   * shown separately so the assumption is visible rather than silently folded into `mine`.
   */
  unattributed: number;
};

/**
 * Who has put money into a joint account (TICKET-STAT-03), for the account detail "your share"
 * breakdown. Reuses `classifyJointLeg` so this can never disagree with the stake/net-worth maths —
 * it only adds a finer split of the `mineIn`/`coOwnerIn` buckets for display purposes.
 */
export const computeContributorBreakdown = (
  transactions: Transaction[],
  jointAccount: Account,
  context: JointLegContext,
): ContributorBreakdown => {
  let mine = 0;
  let unattributed = 0;
  const byCoOwner = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.accountId !== jointAccount.id) continue;
    const classification = classifyJointLeg(transaction, jointAccount, context);

    if (classification === 'mineIn') {
      if (transaction.transferId != null) {
        mine += transaction.amount;
      } else {
        unattributed += transaction.amount;
      }
      continue;
    }

    if (classification === 'coOwnerIn') {
      const coOwner = resolveCoOwnerByIban(jointAccount, transaction.counterpartyIban);
      if (coOwner) {
        byCoOwner.set(coOwner.name, (byCoOwner.get(coOwner.name) ?? 0) + transaction.amount);
      } else {
        unattributed += transaction.amount;
      }
    }
  }

  return { mine, byCoOwner, unattributed };
};
