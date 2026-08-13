import type { Account, Category, Transaction } from '@/core/data-access';
import {
  bucketDateBoundaries,
  bucketKeysInRange,
  formatIsoDate,
  normalizeIban,
  parseIsoDate,
} from '@/shared/utils';
import { computePeriodStats } from './period-stats';

/**
 * What "saving" means for a velocity measurement. Neither reading is wrong (FUT-01):
 * `savings-transfers` matches the Dashboard's savings-rate card and is the stricter one, while
 * `net-cash-flow` matches what most people mean by "what I managed to save" — someone who never
 * moves money to a savings account reads as €0/month under the strict basis. The caller always
 * passes one; there is deliberately no default.
 */
export type SavingBasis = 'net-cash-flow' | 'savings-transfers';

export type MonthlySavingPoint = { bucketKey: string; from: string; to: string; amount: number };

export type SavingVelocity = {
  basis: SavingBasis;
  /** Complete calendar months actually measured — may be fewer than requested. */
  monthsCovered: number;
  months: MonthlySavingPoint[];
  /** Arithmetic mean per month — the estimator the projections accumulate. */
  perMonth: number;
  /** The typical month, for the readout. Not what the ETA maths uses. */
  median: number;
  min: number;
  max: number;
  /** False when zero complete months fall inside the window; `perMonth` is then 0. */
  hasEnoughHistory: boolean;
};

const EMPTY_VELOCITY = {
  monthsCovered: 0,
  months: [] as MonthlySavingPoint[],
  perMonth: 0,
  median: 0,
  min: 0,
  max: 0,
  hasEnoughHistory: false,
};

/** Mean of the two middle values on an even count, the single middle one on an odd count. */
const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

/** First day of the month the imported history actually starts in. */
const historyStartMonth = (transactions: Transaction[]): string => {
  let earliest = transactions[0].bookingDate;
  for (const transaction of transactions) {
    if (transaction.bookingDate < earliest) earliest = transaction.bookingDate;
  }
  return bucketDateBoundaries(earliest.slice(0, 7), 'month').start;
};

/**
 * The `[start, end]` of the measured window: the last `lookbackMonths` complete calendar months
 * before `today`'s month, clamped forward to where the history really begins. Returns a start after
 * the end when no complete month is measurable at all.
 */
const resolveWindow = (
  transactions: Transaction[],
  today: string,
  lookbackMonths: number,
): { start: string; end: string } => {
  const todayDate = parseIsoDate(today);
  const year = todayDate.getUTCFullYear();
  const month = todayDate.getUTCMonth();

  // Day 0 of the current month is the last day of the previous one — the newest complete month.
  const end = formatIsoDate(new Date(Date.UTC(year, month, 0)));
  const requestedStart = formatIsoDate(new Date(Date.UTC(year, month - lookbackMonths, 1)));
  const historyStart = historyStartMonth(transactions);

  return { start: historyStart > requestedStart ? historyStart : requestedStart, end };
};

/**
 * The accounts a leg's *counterpart* sits in, for every transaction that has one — the sibling leg
 * of a linked transfer, or the own account whose IBAN a one-sided savings movement names.
 */
const accountIdsByIban = (accountsById: ReadonlyMap<number, Account>): Map<string, number> => {
  const byIban = new Map<string, number>();
  for (const account of accountsById.values()) {
    const iban = normalizeIban(account.iban);
    if (iban) byIban.set(iban, account.id!);
  }
  return byIban;
};

const legsByTransfer = (transactions: Transaction[]): Map<number, Transaction[]> => {
  const legs = new Map<number, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.transferId == null) continue;
    legs.set(transaction.transferId, [...(legs.get(transaction.transferId) ?? []), transaction]);
  }
  return legs;
};

/**
 * The account on the other side of one leg. The linked sibling wins over the IBAN: a leg can carry
 * both, and a confirmed transfer link is the stronger fact.
 */
const counterpartOf = (
  transaction: Transaction,
  legs: Map<number, Transaction[]>,
  accountIdByIban: Map<string, number>,
): number | undefined => {
  const sibling = (legs.get(transaction.transferId as number) ?? []).find(
    (leg) => leg.id !== transaction.id,
  );
  return sibling?.accountId ?? accountIdByIban.get(normalizeIban(transaction.counterpartyIban));
};

const counterpartAccountOf = (
  transactions: Transaction[],
  accountsById: ReadonlyMap<number, Account>,
): Map<number, number> => {
  const byIban = accountIdsByIban(accountsById);
  const legs = legsByTransfer(transactions);

  const counterpartByTransactionId = new Map<number, number>();
  for (const transaction of transactions) {
    const counterpart = counterpartOf(transaction, legs, byIban);
    if (counterpart != null) counterpartByTransactionId.set(transaction.id!, counterpart);
  }
  return counterpartByTransactionId;
};

/**
 * The transactions to measure when a scope is set, with the boundary rule applied
 * (TICKET-FUT-08) — **the single most likely way this feature could be quietly wrong**.
 *
 * Money that leaves the scope is spent and money that arrives is income, because that is the only
 * rule under which the projected line matches what the selected accounts' balances would actually
 * do. Left alone, a transfer to an unscoped savings account nets to zero (`kind: 'savings'`) and a
 * linked transfer leg is skipped outright — so scoping to a current account would project a balance
 * that keeps growing by money that has already left it.
 *
 * Only the *crossing* legs are rewritten, and only in the two fields that cause the netting:
 * `transferId` (which makes a leg skip) and a `counterpartyIban` pointing at an own savings account
 * (which makes it net). The classification context — `accountsById`, `categoriesById`,
 * `ownSavingsIbans` — stays the full universe, so nothing is reclassified as a side effect of the
 * selection: a leg between two accounts that are *both* in scope still nets to zero, exactly as it
 * does with no scope at all.
 */
const applyScope = (
  transactions: Transaction[],
  scope: ReadonlySet<number>,
  accountsById: ReadonlyMap<number, Account>,
  ownSavingsIbans: ReadonlySet<string>,
): Transaction[] => {
  const counterpartByTransactionId = counterpartAccountOf(transactions, accountsById);

  return transactions
    .filter((transaction) => scope.has(transaction.accountId))
    .map((transaction) => {
      const counterpart = counterpartByTransactionId.get(transaction.id!);
      if (counterpart == null || scope.has(counterpart)) return transaction;

      return {
        ...transaction,
        transferId: undefined,
        counterpartyIban: ownSavingsIbans.has(normalizeIban(transaction.counterpartyIban))
          ? undefined
          : transaction.counterpartyIban,
      };
    });
};

/** The measured universe: every transaction, or the scoped subset with the boundary rule applied. */
const scopedTransactions = (
  transactions: Transaction[],
  context: {
    scopeAccountIds?: ReadonlySet<number>;
    accountsById: ReadonlyMap<number, Account>;
    ownSavingsIbans: ReadonlySet<string>;
  },
): Transaction[] =>
  context.scopeAccountIds?.size
    ? applyScope(
        transactions,
        context.scopeAccountIds,
        context.accountsById,
        context.ownSavingsIbans,
      )
    : transactions;

/** One point per complete month in `[start, end]`, measured on the requested basis. */
const measureMonths = (
  transactions: Transaction[],
  bounds: { start: string; end: string },
  basis: SavingBasis,
  ownSavingsIbans: ReadonlySet<string>,
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): MonthlySavingPoint[] =>
  bucketKeysInRange(bounds.start, bounds.end, 'month').map((bucketKey) => {
    const { start, end } = bucketDateBoundaries(bucketKey, 'month');
    const stats = computePeriodStats(
      transactions,
      start,
      end,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );
    return {
      bucketKey,
      from: start,
      to: end,
      amount: basis === 'net-cash-flow' ? stats.net : stats.savings,
    };
  });

/**
 * How much was actually put aside per month over the last `lookbackMonths` **complete** calendar
 * months (FR-FUT-1) — the measured rate every projection in v2.2 accumulates.
 *
 * Clock-free by construction, like `detectRecurringPayments`/`projectRecurringOccurrences`: `today`
 * is a parameter, and the window is derived from it rather than from `Date.now()`.
 *
 * Three honesty rules are load-bearing rather than incidental:
 * - **The current, partial month never enters the window.** A forecast run on the 3rd would
 *   otherwise read that stub of a month as a catastrophic one and drag the mean down with it.
 * - **Short history clamps rather than fakes.** With fewer complete months of data than requested,
 *   `monthsCovered` reports what was really measured and the mean divides by *that* — never by
 *   `lookbackMonths`, which would quietly dilute the rate towards zero.
 * - **A negative rate is a real answer** and comes back unclamped. What "you are losing €120/month"
 *   means for a goal is TICKET-FUT-05's decision, not this function's.
 *
 * Each month's amount comes from `computePeriodStats` over that month's real boundaries, so every
 * per-transaction routing decision still runs through `classifyForStats` and a velocity figure can
 * never disagree with the Dashboard's stat cards for the same month. Months with no transactions at
 * all are still emitted as `amount: 0` — a gap month is evidence, and dropping it inflates the mean.
 */
export const computeSavingVelocity = (
  transactions: Transaction[],
  options: {
    today: string;
    lookbackMonths: number;
    basis: SavingBasis;
    ownSavingsIbans?: ReadonlySet<string>;
    categoriesById?: ReadonlyMap<number, Category>;
    accountsById?: ReadonlyMap<number, Account>;
    /**
     * Measure only these accounts (TICKET-FUT-08). Absent or empty = every account, which is the
     * behaviour of every caller before that ticket.
     */
    scopeAccountIds?: ReadonlySet<number>;
  },
): SavingVelocity => {
  const {
    today,
    lookbackMonths,
    basis,
    ownSavingsIbans = new Set<string>(),
    categoriesById = new Map<number, Category>(),
    accountsById = new Map<number, Account>(),
    scopeAccountIds,
  } = options;

  const measured = scopedTransactions(transactions, {
    scopeAccountIds,
    accountsById,
    ownSavingsIbans,
  });

  if (lookbackMonths < 1 || measured.length === 0) {
    return { basis, ...EMPTY_VELOCITY };
  }

  const bounds = resolveWindow(measured, today, lookbackMonths);
  if (bounds.start > bounds.end) {
    return { basis, ...EMPTY_VELOCITY };
  }

  const months = measureMonths(
    measured,
    bounds,
    basis,
    ownSavingsIbans,
    categoriesById,
    accountsById,
  );
  const amounts = months.map((point) => point.amount);

  return {
    basis,
    monthsCovered: months.length,
    months,
    perMonth: amounts.reduce((sum, amount) => sum + amount, 0) / months.length,
    median: medianOf(amounts),
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    hasEnoughHistory: true,
  };
};
