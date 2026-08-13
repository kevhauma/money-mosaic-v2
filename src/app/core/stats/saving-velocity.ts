import type { Account, Category, Transaction } from '@/core/data-access';
import {
  bucketDateBoundaries,
  bucketKeysInRange,
  formatIsoDate,
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
  },
): SavingVelocity => {
  const {
    today,
    lookbackMonths,
    basis,
    ownSavingsIbans = new Set<string>(),
    categoriesById = new Map<number, Category>(),
    accountsById = new Map<number, Account>(),
  } = options;

  if (lookbackMonths < 1 || transactions.length === 0) {
    return { basis, ...EMPTY_VELOCITY };
  }

  const bounds = resolveWindow(transactions, today, lookbackMonths);
  if (bounds.start > bounds.end) {
    return { basis, ...EMPTY_VELOCITY };
  }

  const months = measureMonths(
    transactions,
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
