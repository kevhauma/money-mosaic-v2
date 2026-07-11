import type { Account, Category, Transaction } from '@/core/data-access';
// Deep import (not the `@/core/accounts` barrel) avoids a barrel cycle: that barrel's
// account-deletion.service.ts imports `@/core/transfers` for TransferCleanupService.
import { resolveCoOwnerByIban } from '@/core/accounts/joint-owner-lookup';
import { normalizeIban } from '@/shared/utils';

export type TransferCandidate = {
  from: Transaction;
  to: Transaction;
  method: 'auto-iban' | 'auto-amountdate';
  confidence: 'high' | 'medium';
};

export type TransferMatchResult = {
  autoLink: TransferCandidate[];
  /** Unique-but-unlinked (medium confidence disabled) or genuinely ambiguous candidates, surfaced for one-click confirmation (FR-TRF-3). */
  ambiguous: TransferCandidate[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (a: string, b: string): number =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / MS_PER_DAY;

const isCandidatePair = (a: Transaction, b: Transaction, windowDays: number): boolean =>
  a.accountId !== b.accountId &&
  a.amount !== 0 &&
  a.amount === -b.amount &&
  daysBetween(a.bookingDate, b.bookingDate) <= windowDays;

/**
 * Buckets transactions by `Math.abs(amount)`. Because a candidate pair requires `a.amount === -b.amount`,
 * both sides always share the same absolute amount — so pairing only ever needs to compare within a bucket,
 * turning the previously O(n²) whole-list scans into near-linear work. Zero-amount rows never pair, so they're
 * left out entirely.
 */
const bucketByAbsAmount = (transactions: Transaction[]): Map<number, Transaction[]> => {
  const buckets = new Map<number, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.amount === 0) continue;
    const key = Math.abs(transaction.amount);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(transaction);
    else buckets.set(key, [transaction]);
  }
  return buckets;
};

const ibanConfirms = (
  a: Transaction,
  b: Transaction,
  accountsById: Map<number, Account>,
): boolean => {
  const accountIban = (transaction: Transaction) =>
    normalizeIban(accountsById.get(transaction.accountId)?.iban);
  const aIban = normalizeIban(a.counterpartyIban);
  const bIban = normalizeIban(b.counterpartyIban);
  return (!!aIban && aIban === accountIban(b)) || (!!bIban && bIban === accountIban(a));
};

/**
 * Flags a still one-sided movement whose counterparty is a known own account (FR-TRF-5).
 * `ownIbans` must already contain normalized IBANs (see `normalizeIban`) — the transaction's
 * `counterpartyIban` is normalized here before the lookup.
 */
export const isLikelyTransfer = (
  transaction: Transaction,
  ownIbans: ReadonlySet<string>,
): boolean => {
  const counterpartyIban = normalizeIban(transaction.counterpartyIban);
  return transaction.transferId == null && !!counterpartyIban && ownIbans.has(counterpartyIban);
};

/**
 * The (normalized) IBANs of the user's own `savings`-type accounts — the set `isSavingsMovement`
 * checks against.
 */
export const savingsAccountIbans = (accounts: Account[]): Set<string> =>
  new Set(
    accounts
      .filter((account) => account.type === 'savings')
      .map((account) => normalizeIban(account.iban))
      .filter((iban) => iban.length > 0),
  );

/** The (normalized) IBANs of all of the user's own accounts, regardless of type. */
export const ownAccountIbans = (accounts: Account[]): Set<string> =>
  new Set(accounts.map((account) => normalizeIban(account.iban)).filter((iban) => iban.length > 0));

/**
 * True when a transaction should be treated as an **external contribution** rather than a
 * transfer candidate (TICKET-TRF-03): either it's already tagged with a `neutral`-kind category
 * (CAT-02 — the user has said "this is a contribution"), or it's a one-sided inflow into a
 * `joint` account whose counterparty is a registered co-owner (ACC-03) or simply isn't a known
 * own IBAN at all (fallback for a contributor not yet registered). Reuses `resolveCoOwnerByIban`,
 * the same lookup CAT-02/STAT-03 use, so matching and stats agree on what counts as a
 * contribution. `ownIbans` must already contain normalized IBANs (see `ownAccountIbans`).
 */
export const isExternalContribution = (
  transaction: Transaction,
  account: Account | undefined,
  categoriesById: ReadonlyMap<number, Category>,
  ownIbans: ReadonlySet<string>,
): boolean => {
  const category =
    transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
  if (category?.kind === 'neutral') return true;

  if (!account || account.type !== 'joint') return false;
  if (transaction.transferId != null || transaction.amount <= 0) return false;

  if (resolveCoOwnerByIban(account, transaction.counterpartyIban)) return true;

  return !ownIbans.has(normalizeIban(transaction.counterpartyIban));
};

/**
 * Flags a movement whose counterparty is one of the user's own **savings** accounts (TICKET-TRF-02,
 * extends FR-TRF-1). One predicate covers both cases the ticket names: an unlinked one-sided movement
 * to a savings IBAN, and the spending-side leg of an IBAN-linked transfer (which carries the savings
 * account as its counterparty). The savings-side leg of a linked pair points back at the spending
 * account, so it is never flagged here — keeping the pair from being counted twice. Sign/direction is
 * left to the caller (a negative amount is money moved *into* savings, a positive one a withdrawal).
 * `ownSavingsIbans` must already contain normalized IBANs (see `savingsAccountIbans`) — the
 * transaction's `counterpartyIban` is normalized here before the lookup.
 */
export const isSavingsMovement = (
  transaction: Transaction,
  ownSavingsIbans: ReadonlySet<string>,
): boolean => {
  const counterpartyIban = normalizeIban(transaction.counterpartyIban);
  return !!counterpartyIban && ownSavingsIbans.has(counterpartyIban);
};

/** High confidence: counterparty IBAN corroborates the pair — linked even if more than one IBAN-confirmed candidate exists (closest by date wins). */
const findHighConfidenceMatches = (
  unlinked: Transaction[],
  accountsById: Map<number, Account>,
  windowDays: number,
): { matches: TransferCandidate[]; consumed: Set<number> } => {
  const matches: TransferCandidate[] = [];
  const consumed = new Set<number>();
  const buckets = bucketByAbsAmount(unlinked);

  for (const transaction of unlinked) {
    if (consumed.has(transaction.id!)) continue;

    const ibanCandidates = (buckets.get(Math.abs(transaction.amount)) ?? []).filter(
      (other) =>
        other.id !== transaction.id &&
        !consumed.has(other.id!) &&
        isCandidatePair(transaction, other, windowDays) &&
        ibanConfirms(transaction, other, accountsById),
    );
    if (ibanCandidates.length === 0) continue;

    const closest = ibanCandidates.reduce((best, candidate) =>
      daysBetween(transaction.bookingDate, candidate.bookingDate) <
      daysBetween(transaction.bookingDate, best.bookingDate)
        ? candidate
        : best,
    );
    matches.push({ from: transaction, to: closest, method: 'auto-iban', confidence: 'high' });
    consumed.add(transaction.id!);
    consumed.add(closest.id!);
  }

  return { matches, consumed };
};

/** Medium confidence: opposite-sign/equal-amount/in-window pair with no IBAN corroboration — only auto-linked when the match is mutually unique. */
const findMediumConfidenceMatches = (
  remaining: Transaction[],
  windowDays: number,
  autoLinkMediumConfidence: boolean,
): { autoLink: TransferCandidate[]; ambiguous: TransferCandidate[] } => {
  const buckets = bucketByAbsAmount(remaining);
  const candidatesByTransactionId = new Map<number, Transaction[]>(
    remaining.map((transaction) => [
      transaction.id!,
      (buckets.get(Math.abs(transaction.amount)) ?? []).filter(
        (other) => other.id !== transaction.id && isCandidatePair(transaction, other, windowDays),
      ),
    ]),
  );

  const autoLink: TransferCandidate[] = [];
  const ambiguous: TransferCandidate[] = [];
  const seenPairs = new Set<string>();

  for (const transaction of remaining) {
    for (const match of candidatesByTransactionId.get(transaction.id!) ?? []) {
      const pairKey = [transaction.id!, match.id!].sort((a, b) => a - b).join(':');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const unique =
        candidatesByTransactionId.get(transaction.id!)!.length === 1 &&
        candidatesByTransactionId.get(match.id!)!.length === 1;
      const candidate: TransferCandidate = {
        from: transaction,
        to: match,
        method: 'auto-amountdate',
        confidence: 'medium',
      };
      (unique && autoLinkMediumConfidence ? autoLink : ambiguous).push(candidate);
    }
  }

  return { autoLink, ambiguous };
};

/**
 * Finds transfer pairs among unlinked transactions (FR-TRF-3): high-confidence IBAN matches first,
 * then medium-confidence amount/date matches among what's left. Everything not mutually unique is
 * surfaced for manual confirmation rather than guessed at. Suspected external contributions
 * (TICKET-TRF-03) are pulled out of the medium-confidence pool before that pass runs, so a
 * partner's one-sided inflow can't be guessed onto an unrelated same-amount transaction — a
 * genuine own-account transfer is unaffected since high confidence already runs on everyone.
 */
export const resolveTransferMatches = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  windowDays: number,
  autoLinkMediumConfidence: boolean,
): TransferMatchResult => {
  const accountsById = new Map(accounts.map((account) => [account.id!, account]));
  const categoriesById = new Map(categories.map((category) => [category.id!, category]));
  const ownIbans = ownAccountIbans(accounts);
  const unlinked = transactions.filter((transaction) => transaction.transferId == null);

  const highConfidence = findHighConfidenceMatches(unlinked, accountsById, windowDays);
  const remaining = unlinked
    .filter((transaction) => !highConfidence.consumed.has(transaction.id!))
    .filter(
      (transaction) =>
        !isExternalContribution(
          transaction,
          accountsById.get(transaction.accountId),
          categoriesById,
          ownIbans,
        ),
    );
  const mediumConfidence = findMediumConfidenceMatches(
    remaining,
    windowDays,
    autoLinkMediumConfidence,
  );

  return {
    autoLink: [...highConfidence.matches, ...mediumConfidence.autoLink],
    ambiguous: mediumConfidence.ambiguous,
  };
};
