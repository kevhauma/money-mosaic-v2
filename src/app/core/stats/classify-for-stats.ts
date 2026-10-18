import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { categoryKindContribution } from './category-kind-contribution';
import { resolveContribution, type JointLegContext } from './classify-joint-leg';

export type StatsClassification =
  | { kind: 'skip' }
  | { kind: 'savings'; amount: number }
  | { kind: 'income' | 'expense'; amount: number; categoryId: number | null };

/**
 * How a caller wants joint-account attribution applied (TICKET-REC-09).
 *
 * `'share'` is the default and everything the app asks "what did *I* spend" — a co-owner's leg is
 * excluded and the rest is weighted by `ownershipShare`, exactly as before this mode existed.
 *
 * `'raw'` disregards attribution entirely: the full transaction amount, for every account type, with
 * no exclusion. Recurring detection is its one caller, because "what repeats" is not a question
 * about whose money it was — a €90 joint utility bill is one €90 rhythm, not a €45 one, and a leg
 * attributed to a co-owner is still a payment that happens every month. (Account detail wants the
 * whole pot too, but reads `'cashflow'` — see `StatsMode`.) It is a mode on this function rather
 * than a second classifier on purpose: CR3-2.1 centralised the exclusion *order*
 * (`nullified` before savings, transfer-link below it) precisely so two aggregates could not drift
 * on it, and everything except attribution is shared between the two modes here.
 */
export type StatsJointMode = 'share' | 'raw';

/**
 * Every reading `classifyForStats` offers: the two joint modes above, plus `'cashflow'`
 * (TICKET-ACC-14) — one account's money in and money out, with no interpretation at all. A positive
 * amount is income and a negative one is expense, whatever its category says, and transfers and
 * savings movements count like any other row: on one account's page they are real money arriving
 * and leaving, and the user reads that page as a statement, not as a budget. Only `nullified` and
 * zero-amount rows are still skipped, since those are not money that moved. Attribution is off as
 * in `'raw'` — the whole pot.
 *
 * Not a joint mode, which is why it is a separate type: the Explore mosaic's "my share only"
 * switch (`ChartOptionsStore.jointMode`) still only ever offers the two above.
 */
export type StatsMode = StatsJointMode | 'cashflow';

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

const emptyJointLegContext: Omit<JointLegContext, 'categoriesById'> = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
};

/** `'cashflow'`'s whole rule: the sign decides the bucket, the category only labels it. */
const classifyByAmountSign = (
  transaction: Transaction,
  categoriesById: ReadonlyMap<number, Category>,
): StatsClassification => {
  const categoryId =
    transaction.categoryId != null
      ? (categoriesById.get(transaction.categoryId)?.id ?? null)
      : null;
  return transaction.amount > 0
    ? { kind: 'income', amount: transaction.amount, categoryId }
    : { kind: 'expense', amount: -transaction.amount, categoryId };
};

/**
 * The single per-transaction classification pipeline shared by every income/expense/savings
 * aggregation (`computePeriodStats`, `computeCategoryBreakdown`, `computeWeekdayWeekendSplit`;
 * CR3-2.1). Exclusion order matters and is fixed here once: range → `nullified` → zero-amount (a
 * genuine no-op) → savings movement → linked transfer (TICKET-STAT-18 — nullified must run before the savings check, and the
 * transfer-link check must stay *below* it so a linked transfer leg to a savings account still
 * counts toward `savings`). A `neutral`-kind category, and a co-owner/`notMine`-excluded joint leg,
 * are excluded too (`kind: 'skip'`).
 *
 * For a joint account or a transaction carrying a manual `attributionOverride`, routing goes
 * through `resolveContribution`, with two special cases: a `personal`-flagged leg already carries
 * the full unshared amount, so it's netted by category kind exactly like a non-joint transaction
 * (a payback on a personal-flagged joint expense reduces expense rather than counting as income);
 * an *untagged* positive-amount transaction under an expense category on a joint account (no
 * override) is a refund of shared spending, not new income — only the account's `ownershipShare`
 * is deducted from expense. Every other leg buckets by raw `weight` sign. A plain own-account
 * transaction buckets by `categoryKindContribution` (TICKET-STAT-11's signed netting; category kind
 * decides the bucket, not raw amount sign, so a refund on an expense category nets it down instead
 * of counting as income).
 *
 * `amount` is always the signed delta the caller adds to its running total — it can be negative
 * when a leg nets a bucket down (a payback/refund) rather than up.
 *
 * `mode` is the one dial on all of this. `'cashflow'` (TICKET-ACC-14) bypasses everything below
 * `nullified`/zero and buckets by amount sign alone — see `StatsMode`. The joint modes
 * (TICKET-REC-09) turn **only** the joint/override branch off: `'raw'` reads every account at its
 * full amount, and every exclusion above that branch — range, `nullified`, zero, savings, transfer link — plus the
 * `categoryKindContribution` netting below it apply identically in both modes.
 */
export const classifyForStats = (
  transaction: Transaction,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  mode: StatsMode = 'share',
): StatsClassification => {
  if (!inRange(transaction, from, to)) return { kind: 'skip' };
  if (transaction.nullified) return { kind: 'skip' };
  if (transaction.amount === 0) return { kind: 'skip' };
  if (mode === 'cashflow') return classifyByAmountSign(transaction, categoriesById);
  if (isSavingsMovement(transaction, ownSavingsIbans)) {
    // Money moved into savings (negative amount) adds to savings; a withdrawal (positive amount)
    // subtracts, so an emergency withdrawal isn't mistaken for income and round-trips net to zero.
    return { kind: 'savings', amount: -transaction.amount };
  }
  if (transaction.transferId != null) return { kind: 'skip' };

  const category =
    transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
  const categoryId = category?.id ?? null;

  const account = accountsById.get(transaction.accountId);
  if (
    mode === 'share' &&
    account &&
    (account.type === 'joint' || transaction.attributionOverride)
  ) {
    const jointLegContext: JointLegContext = {
      ...emptyJointLegContext,
      categoriesById,
      accountsById,
    };
    const { weight, excluded } = resolveContribution(transaction, account, jointLegContext);
    if (excluded) return { kind: 'skip' };

    if (transaction.attributionOverride?.mode === 'personal') {
      const contribution = categoryKindContribution(weight, category?.kind);
      if (!contribution) return { kind: 'skip' };
      return { kind: contribution.bucket, amount: contribution.amount, categoryId };
    }
    if (
      !transaction.attributionOverride &&
      category?.kind === 'expense' &&
      transaction.amount > 0
    ) {
      const share = account.ownershipShare ?? 1;
      return { kind: 'expense', amount: -(transaction.amount * share), categoryId };
    }
    if (weight > 0) return { kind: 'income', amount: weight, categoryId };
    if (weight < 0) return { kind: 'expense', amount: -weight, categoryId };
    return { kind: 'skip' };
  }

  const contribution = categoryKindContribution(transaction.amount, category?.kind);
  if (!contribution) return { kind: 'skip' };
  return { kind: contribution.bucket, amount: contribution.amount, categoryId };
};
