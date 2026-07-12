import type { Account, Category, Transaction } from '@/core/data-access';
import { isSavingsMovement } from '@/core/transfers';
import { resolveContribution, type JointLegContext } from './classify-joint-leg';
import { bucketKeysInRange } from './date-buckets';

export type DayTypeSpend = {
  total: number;
  dayCount: number;
  avgPerDay: number;
};

export type WeekdayWeekendSplit = {
  weekday: DayTypeSpend;
  weekend: DayTypeSpend;
};

/** Below this many calendar days, a weekday/weekend split can't be meaningful (one side may have zero days). */
const MIN_DAYS_FOR_SPLIT = 2;

const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/** Sat/Sun on the UTC calendar date, same convention as the rest of `core/stats` (see `bucketKeyForDate`'s ISO-week math). */
const isWeekendDate = (isoDate: string): boolean => {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

const emptyJointLegContext: Omit<JointLegContext, 'categoriesById'> = {
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
};

/**
 * Splits `[from, to]`'s expense into weekday (Mon-Fri) vs. weekend (Sat-Sun) totals, each averaged
 * over the calendar days of that type actually within the range — including days with no spend, so
 * a quiet weekday still pulls its average down (FR-STAT-10). Returns `null` when the range spans
 * fewer than 2 calendar days, since one side could otherwise have a zero day count.
 *
 * Expense classification mirrors `computePeriodStats` exactly (same `isSavingsMovement`/`transferId`/
 * `nullified` exclusions, same `resolveContribution` routing for joint/attribution-override accounts,
 * same `neutral`-category exclusion) so this can't drift into a fourth definition of "expense" —
 * only income-vs-expense sign selection differs, since this aggregate only cares about spend.
 */
export const computeWeekdayWeekendSplit = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
): WeekdayWeekendSplit | null => {
  const dayKeys = bucketKeysInRange(from, to, 'day');
  if (dayKeys.length < MIN_DAYS_FOR_SPLIT) return null;

  let weekdayDayCount = 0;
  let weekendDayCount = 0;
  for (const day of dayKeys) {
    if (isWeekendDate(day)) weekendDayCount++;
    else weekdayDayCount++;
  }

  let weekdayTotal = 0;
  let weekendTotal = 0;
  const jointLegContext: JointLegContext = {
    ...emptyJointLegContext,
    categoriesById,
    accountsById,
  };

  for (const transaction of transactions) {
    if (!inRange(transaction, from, to)) continue;
    if (isSavingsMovement(transaction, ownSavingsIbans)) continue;
    if (transaction.transferId != null) continue;
    if (transaction.nullified) continue;

    let expenseAmount: number;
    const account = accountsById.get(transaction.accountId);
    if (account && (account.type === 'joint' || transaction.attributionOverride)) {
      const { weight, excluded } = resolveContribution(transaction, account, jointLegContext);
      if (excluded || weight >= 0) continue;
      expenseAmount = -weight;
    } else {
      const category =
        transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;
      if (category?.kind === 'neutral') continue;
      if (transaction.amount >= 0) continue;
      expenseAmount = -transaction.amount;
    }

    if (isWeekendDate(transaction.bookingDate)) {
      weekendTotal += expenseAmount;
    } else {
      weekdayTotal += expenseAmount;
    }
  }

  return {
    weekday: {
      total: weekdayTotal,
      dayCount: weekdayDayCount,
      avgPerDay: weekdayDayCount === 0 ? 0 : weekdayTotal / weekdayDayCount,
    },
    weekend: {
      total: weekendTotal,
      dayCount: weekendDayCount,
      avgPerDay: weekendDayCount === 0 ? 0 : weekendTotal / weekendDayCount,
    },
  };
};
