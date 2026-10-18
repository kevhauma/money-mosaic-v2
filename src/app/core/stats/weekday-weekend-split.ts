import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats, type StatsJointMode } from './classify-for-stats';
import { bucketKeysInRange } from '@/shared/utils';

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

/** Sat/Sun on the UTC calendar date, same convention as the rest of `core/stats` (see `bucketKeyForDate`'s ISO-week math). */
const isWeekendDate = (isoDate: string): boolean => {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

/**
 * Splits `[from, to]`'s expense into weekday (Mon-Fri) vs. weekend (Sat-Sun) totals, each averaged
 * over the calendar days of that type actually within the range — including days with no spend, so
 * a quiet weekday still pulls its average down (FR-STAT-10). Returns `null` when the range spans
 * fewer than 2 calendar days, since one side could otherwise have a zero day count.
 *
 * Every per-transaction exclusion/routing/bucketing decision is delegated to the shared
 * `classifyForStats` pipeline (CR3-2.1) — this aggregation only accumulates `expense`-classified
 * amounts into the weekday/weekend bucket for the transaction's own `bookingDate`. `jointMode` is
 * passed through to it unchanged (TICKET-ACC-14).
 */
export const computeWeekdayWeekendSplit = (
  transactions: Transaction[],
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
  jointMode: StatsJointMode = 'share',
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

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
      jointMode,
    );
    if (result.kind !== 'expense') continue;

    if (isWeekendDate(transaction.bookingDate)) {
      weekendTotal += result.amount;
    } else {
      weekdayTotal += result.amount;
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
