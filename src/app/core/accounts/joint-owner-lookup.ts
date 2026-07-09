import type { Account, JointOwner } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';

/**
 * The single `counterpartyIban` → co-owner lookup, shared by CAT-02 (auto-tagging "Partner
 * contribution"), TRF-03 (excluding partner inflows from transfer matching) and STAT-03
 * (classifying joint-account legs) so the three never disagree on who a co-owner is.
 */
export const resolveCoOwnerByIban = (
  account: Account,
  counterpartyIban: string | undefined,
): JointOwner | undefined => {
  const normalized = normalizeIban(counterpartyIban);
  if (!normalized) {
    return undefined;
  }
  return account.coOwners?.find((coOwner) =>
    coOwner.ibans.some((iban) => normalizeIban(iban) === normalized),
  );
};

/** The flat set of every registered co-owner IBAN on an account, normalised for comparison. */
export const coOwnerIbanSet = (account: Account): Set<string> => {
  const ibans = new Set<string>();
  for (const coOwner of account.coOwners ?? []) {
    for (const iban of coOwner.ibans) {
      const normalized = normalizeIban(iban);
      if (normalized) {
        ibans.add(normalized);
      }
    }
  }
  return ibans;
};
