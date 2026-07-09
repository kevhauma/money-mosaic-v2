import type { Account, Transaction } from '@/core/data-access';
import { resolveCoOwnerByIban } from '@/core/accounts';

export type CoOwnerContributionUpdate = { id: number; categoryId: number };

/**
 * Registry-driven counterpart to user-authored Rules (TICKET-CAT-02): any unlinked, non-manual
 * inflow into a `joint` account whose `counterpartyIban` matches a registered co-owner (ACC-03) is
 * tagged with the seeded "Partner contribution" category, without requiring the user to hand-write
 * a matching Rule. Never touches a manually-set category (FR-CAT-3) or a transfer-linked transaction.
 */
export const resolveCoOwnerContributionUpdates = (
  transactions: Transaction[],
  accountsById: ReadonlyMap<number, Account>,
  partnerContributionCategoryId: number,
): CoOwnerContributionUpdate[] => {
  const updates: CoOwnerContributionUpdate[] = [];

  for (const transaction of transactions) {
    if (transaction.categoryManual || transaction.transferId != null) continue;
    if (transaction.amount <= 0) continue;
    if (transaction.categoryId === partnerContributionCategoryId) continue;

    const account = accountsById.get(transaction.accountId);
    if (!account || account.type !== 'joint') continue;

    const coOwner = resolveCoOwnerByIban(account, transaction.counterpartyIban);
    if (!coOwner) continue;

    updates.push({ id: transaction.id!, categoryId: partnerContributionCategoryId });
  }

  return updates;
};
