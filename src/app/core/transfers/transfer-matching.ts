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

/**
 * How strongly the two legs' counterparty IBANs corroborate each other (TICKET-TRF-05):
 * `mutual` when each side names the other's account, `one-sided` when only one does. One-sided
 * corroboration is weak evidence in a shared pot — an outflow of mine naming the joint account
 * matches *every* same-amount credit booked on it, a co-owner's contribution included — so
 * `findHighConfidenceMatches` resolves all `mutual` pairs before considering any `one-sided` one.
 * Both sides are normalized (TICKET-TRF-04) before comparing.
 */
type IbanCorroboration = 'mutual' | 'one-sided' | 'none';

/** True when `transaction`'s counterparty IBAN names the account `target` was booked on. */
const namesAccountOf = (
  transaction: Transaction,
  target: Transaction,
  accountsById: Map<number, Account>,
): boolean => {
  const counterpartyIban = normalizeIban(transaction.counterpartyIban);
  return (
    !!counterpartyIban &&
    counterpartyIban === normalizeIban(accountsById.get(target.accountId)?.iban)
  );
};

const ibanCorroboration = (
  a: Transaction,
  b: Transaction,
  accountsById: Map<number, Account>,
): IbanCorroboration => {
  const aNamesB = namesAccountOf(a, b, accountsById);
  const bNamesA = namesAccountOf(b, a, accountsById);
  if (aNamesB && bNamesA) return 'mutual';
  return aNamesB || bNamesA ? 'one-sided' : 'none';
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
 * True when the user has explicitly tagged this transaction with a `neutral`-kind category
 * (CAT-02's "Partner contribution") — a stated "this is a contribution", which outranks any IBAN
 * inference and keeps the transaction out of every matching pass (TICKET-TRF-05).
 */
const hasNeutralKind = (
  transaction: Transaction,
  categoriesById: ReadonlyMap<number, Category>,
): boolean =>
  transaction.categoryId != null && categoriesById.get(transaction.categoryId)?.kind === 'neutral';

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
  if (hasNeutralKind(transaction, categoriesById)) return true;

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

/** The mutable state the two high-confidence tiers share as they consume transactions. */
type HighConfidencePass = {
  buckets: Map<number, Transaction[]>;
  accountsById: Map<number, Account>;
  windowDays: number;
  matches: TransferCandidate[];
  consumed: Set<number>;
};

/** Still-unconsumed pairing candidates for `transaction` whose corroboration level `accept`s. */
const corroboratedCandidates = (
  pass: HighConfidencePass,
  transaction: Transaction,
  accept: (level: IbanCorroboration) => boolean,
): Transaction[] =>
  (pass.buckets.get(Math.abs(transaction.amount)) ?? []).filter(
    (other) =>
      other.id !== transaction.id &&
      !pass.consumed.has(other.id!) &&
      isCandidatePair(transaction, other, pass.windowDays) &&
      accept(ibanCorroboration(transaction, other, pass.accountsById)),
  );

/** Links `transaction` to whichever candidate is nearest in date, consuming both. */
const linkClosestByDate = (
  pass: HighConfidencePass,
  transaction: Transaction,
  candidates: Transaction[],
): void => {
  const closest = candidates.reduce((best, candidate) =>
    daysBetween(transaction.bookingDate, candidate.bookingDate) <
    daysBetween(transaction.bookingDate, best.bookingDate)
      ? candidate
      : best,
  );
  pass.matches.push({ from: transaction, to: closest, method: 'auto-iban', confidence: 'high' });
  pass.consumed.add(transaction.id!);
  pass.consumed.add(closest.id!);
};

/** Tier 1: both legs name each other's account — the strongest evidence, resolved first. */
const linkMutualPairs = (pass: HighConfidencePass, unlinked: Transaction[]): void => {
  for (const transaction of unlinked) {
    if (pass.consumed.has(transaction.id!)) continue;
    const mutual = corroboratedCandidates(pass, transaction, (level) => level === 'mutual');
    if (mutual.length > 0) linkClosestByDate(pass, transaction, mutual);
  }
};

/**
 * Tier 2: only one leg names the other's account. Suspected external contributions go last both
 * as initiators and as candidates — an unflagged transaction gets first refusal, and a flagged one
 * is linked only when nothing else corroborates.
 */
const linkOneSidedPairs = (
  pass: HighConfidencePass,
  unlinked: Transaction[],
  contributionIds: ReadonlySet<number>,
): void => {
  const initiators = [
    ...unlinked.filter((transaction) => !contributionIds.has(transaction.id!)),
    ...unlinked.filter((transaction) => contributionIds.has(transaction.id!)),
  ];
  for (const transaction of initiators) {
    if (pass.consumed.has(transaction.id!)) continue;
    const corroborated = corroboratedCandidates(pass, transaction, (level) => level !== 'none');
    if (corroborated.length === 0) continue;

    const unflagged = corroborated.filter((candidate) => !contributionIds.has(candidate.id!));
    linkClosestByDate(pass, transaction, unflagged.length > 0 ? unflagged : corroborated);
  }
};

/**
 * High confidence: counterparty IBAN corroborates the pair — linked even if more than one
 * IBAN-confirmed candidate exists (closest by date wins). Runs in two tiers (TICKET-TRF-05):
 * every **mutually** corroborated pair is resolved first, across all transactions, and only then
 * does the weaker **one-sided** pass run on what is left — so a co-owner's same-amount
 * contribution can no longer consume a leg whose real partner names it back, whatever order the
 * transactions arrive in. Within the one-sided tier, suspected external contributions
 * (TICKET-TRF-03) go last both as initiators and as candidates: they are only linked when no
 * unflagged alternative exists, which keeps today's behaviour for the case where nothing
 * distinguishes the candidates (e.g. my own joint-account leg carries no counterparty IBAN and
 * is itself flagged by the fallback heuristic).
 */
const findHighConfidenceMatches = (
  unlinked: Transaction[],
  accountsById: Map<number, Account>,
  windowDays: number,
  contributionIds: ReadonlySet<number>,
): { matches: TransferCandidate[]; consumed: Set<number> } => {
  const pass: HighConfidencePass = {
    buckets: bucketByAbsAmount(unlinked),
    accountsById,
    windowDays,
    matches: [],
    consumed: new Set<number>(),
  };

  linkMutualPairs(pass, unlinked);
  linkOneSidedPairs(pass, unlinked, contributionIds);

  return { matches: pass.matches, consumed: pass.consumed };
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
 * High confidence weighs the same suspicion rather than ignoring it (TICKET-TRF-05): it prefers
 * mutually IBAN-corroborated pairs, and only falls back to a suspected contribution when nothing
 * else corroborates. A `neutral`-tagged transaction is excluded from both passes outright.
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
  // A `neutral` tag is the user's own verdict, so it holds against every pass — not just the
  // medium one the guard originally covered (TICKET-TRF-05, completing TICKET-TRF-03's to-be).
  const unlinked = transactions.filter(
    (transaction) => transaction.transferId == null && !hasNeutralKind(transaction, categoriesById),
  );
  // Resolved once per run rather than per candidate comparison: both passes below consult it, and
  // the co-owner lookup behind it normalizes an IBAN on every call.
  const contributionIds = new Set(
    unlinked
      .filter((transaction) =>
        isExternalContribution(
          transaction,
          accountsById.get(transaction.accountId),
          categoriesById,
          ownIbans,
        ),
      )
      .map((transaction) => transaction.id!),
  );

  const highConfidence = findHighConfidenceMatches(
    unlinked,
    accountsById,
    windowDays,
    contributionIds,
  );
  const remaining = unlinked
    .filter((transaction) => !highConfidence.consumed.has(transaction.id!))
    .filter((transaction) => !contributionIds.has(transaction.id!));
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
