import type { Account, Category, Transaction } from '@/core/data-access';
import { computePeriodStats, type PeriodStats } from './period-stats';

export type YearOverYearPriorYear = {
  yearsBack: number;
  from: string;
  to: string;
  stats: PeriodStats;
};

export type YearOverYearDelta = {
  income: number | null;
  expense: number | null;
  net: number | null;
};

export type YearOverYearComparison = {
  current: PeriodStats;
  priorYears: YearOverYearPriorYear[];
  /** % delta (current vs. `priorYears[0]`, the immediately-prior year) for income/expense/net; `null` when no prior year qualifies, or per-metric when that metric's prior value is exactly zero. */
  delta: YearOverYearDelta | null;
};

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Shifts a single ISO date back `years` calendar years, clamping Feb 29 to Feb 28 when the target year isn't a leap year. */
const shiftIsoDateByYears = (isoDate: string, years: number): string => {
  const [yearPart, monthPart, dayPart] = isoDate.split('-').map(Number);
  const targetYear = yearPart - years;
  const day = monthPart === 2 && dayPart === 29 && !isLeapYear(targetYear) ? 28 : dayPart;
  return `${pad(targetYear, 4)}-${pad(monthPart)}-${pad(day)}`;
};

/**
 * Shifts both ends of `[from, to]` back by `years` calendar years (TICKET-STAT-07) — same calendar
 * dates one or more years back, distinct from TICKET-STAT-04's rolling window ("the preceding
 * same-length period"). Clamps Feb 29 to Feb 28 when the shifted year isn't a leap year.
 */
export const shiftRangeByYears = (
  from: string,
  to: string,
  years: number,
): { from: string; to: string } => ({
  from: shiftIsoDateByYears(from, years),
  to: shiftIsoDateByYears(to, years),
});

/** `null` when `prior` is zero, so a metric that only started this year never renders a misleading "+∞%". */
const percentDelta = (current: number, prior: number): number | null =>
  prior === 0 ? null : (current - prior) / Math.abs(prior);

const earliestBookingDate = (transactions: Transaction[]): string | null => {
  let earliest: string | null = null;
  for (const transaction of transactions) {
    if (earliest === null || transaction.bookingDate < earliest) earliest = transaction.bookingDate;
  }
  return earliest;
};

/**
 * Compares `[from, to]` to the same calendar dates 1..`yearsBack` years back (FR-STAT-11), calling
 * `computePeriodStats()` once per range so this can never disagree with the dashboard's headline
 * stats. Stops requesting years once a shifted range's `to` predates the dataset's earliest
 * transaction (the same earliest-date logic `full-history-range.ts`'s `computeFullHistoryRange`
 * uses to bound `all-time`, applied directly to the passed `transactions` since this aggregator
 * isn't account-scoped), so it never returns an all-zero "prior year" pretending to be real data.
 * `delta` compares `current` to only the immediately-prior year (`priorYears[0]`); `yearsBack` is a
 * soft cap on how many additional years to surface for context, not a requirement to have that
 * much history.
 */
export const computeYearOverYearComparison = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
  yearsBack = 3,
): YearOverYearComparison => {
  const current = computePeriodStats(
    transactions,
    from,
    to,
    ownSavingsIbans,
    categoriesById,
    accountsById,
  );

  const priorYears: YearOverYearPriorYear[] = [];
  const earliest = earliestBookingDate(transactions);

  if (earliest !== null) {
    for (let i = 1; i <= yearsBack; i++) {
      const shifted = shiftRangeByYears(from, to, i);
      if (shifted.to < earliest) break;

      priorYears.push({
        yearsBack: i,
        from: shifted.from,
        to: shifted.to,
        stats: computePeriodStats(
          transactions,
          shifted.from,
          shifted.to,
          ownSavingsIbans,
          categoriesById,
          accountsById,
        ),
      });
    }
  }

  const immediatePrior = priorYears[0];
  const delta: YearOverYearDelta | null = immediatePrior
    ? {
        income: percentDelta(current.income, immediatePrior.stats.income),
        expense: percentDelta(current.expense, immediatePrior.stats.expense),
        net: percentDelta(current.net, immediatePrior.stats.net),
      }
    : null;

  return { current, priorYears, delta };
};
