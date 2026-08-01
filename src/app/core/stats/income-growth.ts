import { bucketDateBoundaries, bucketKeyForDate, type Granularity } from '@/shared/utils';
import type { IncomeCategorySeries } from './income-category-series';
import { shiftRangeByYears } from './year-over-year';

/** One comparison window's figure and its % delta against the current window. */
export type IncomeGrowthWindow = {
  from: string;
  to: string;
  total: number;
  /** Fractional change from this window to the current one (0.08 = +8%); `null` when this window totalled zero, which would read as `±∞%`. */
  pct: number | null;
};

export type IncomeGrowth = {
  from: string;
  to: string;
  current: number;
  /** The same-length window immediately before the current one; `null` when the series doesn't cover it in full. */
  priorPeriod: IncomeGrowthWindow | null;
  /** The same window one calendar year back; `null` when the series doesn't cover it in full — "hide, don't lie", as in `computeYearOverYearComparison`. */
  priorYear: IncomeGrowthWindow | null;
};

/**
 * The newest bucket in `bucketKeys` that `to` fully covers, or `undefined` when none does.
 *
 * The Income page's range runs to *today* (`computeFullHistoryRange`), so its last bucket is an
 * in-progress month eleven months out of twelve — and a part-month compared against a whole one
 * reads as a collapse that has nothing to do with income. This is the same refusal
 * `computeYearlyIncomeSummary` applies to a partial year, at bucket granularity.
 */
export const lastCompleteBucketKey = (
  bucketKeys: string[],
  granularity: Granularity,
  to: string,
): string | undefined => {
  for (let index = bucketKeys.length - 1; index >= 0; index--) {
    if (bucketDateBoundaries(bucketKeys[index], granularity).end <= to) return bucketKeys[index];
  }
  return undefined;
};

/** `null` rather than a misleading number when the basis is zero — `year-over-year.ts`'s `percentDelta` rule, restated because that one is private to its module. */
const percentDelta = (current: number, prior: number): number | null =>
  prior === 0 ? null : (current - prior) / Math.abs(prior);

/** Positions in `bucketKeys` covered by `[from, to]`, as an inclusive `[startIndex, endIndex]` pair; `null` when the range touches no bucket at all. */
const bucketSpan = (
  bucketKeys: string[],
  granularity: Granularity,
  from: string,
  to: string,
): [number, number] | null => {
  const fromKey = bucketKeyForDate(from, granularity);
  const toKey = bucketKeyForDate(to, granularity);
  const startIndex = bucketKeys.findIndex((key) => key >= fromKey);
  if (startIndex === -1) return null;
  // Keys are ascending, so the last one at or before `toKey` is just before the first one past it.
  // (`findLastIndex` would say this directly, but it needs an `es2023` lib target.)
  const firstPastEnd = bucketKeys.findIndex((key) => key > toKey);
  const endIndex = (firstPastEnd === -1 ? bucketKeys.length : firstPastEnd) - 1;
  return endIndex < startIndex ? null : [startIndex, endIndex];
};

const spanLength = ([startIndex, endIndex]: [number, number]): number => endIndex - startIndex + 1;

/** Every selected category's total across the span — the series is already scoped to the selection (FR-INC-3) and smoothed (FR-INC-4) by its caller. */
const totalOverSpan = (
  { series }: IncomeCategorySeries,
  [startIndex, endIndex]: [number, number],
): number => {
  let total = 0;
  for (const entry of series) {
    for (let index = startIndex; index <= endIndex; index++) total += entry.values[index];
  }
  return total;
};

/**
 * Period-over-period and year-over-year income growth for one window (FR-INC-5, TICKET-INC-05) —
 * "am I actually getting ahead", as opposed to the dashboard's whole-portfolio income/expense/net
 * delta badge.
 *
 * Takes the page's **already-smoothed, already-selection-scoped** series
 * (`smoothAnnualLumpSums(computeIncomeCategorySeries(...))`) rather than raw transactions, so the
 * growth figures and the chart above them are literally the same numbers, and the FR-INC-4
 * smoothing applies for free — an annual bonus that has been spread across its year can no longer
 * read as a growth spike in the month it landed, nor as a crash in the month after.
 *
 * That series is expected to span far more than the compared window: both comparison windows are
 * read out of it, never recomputed. Either is `null` when the series doesn't cover it **in full** —
 * a half-covered prior period understates by exactly as much as it is missing, which is worse than
 * saying nothing. The prior year is derived with `shiftRangeByYears` (leap-safe, TICKET-STAT-07)
 * rather than a bucket-count offset, so a non-monthly granularity shifts correctly too.
 */
export const computeIncomeGrowth = (
  trend: IncomeCategorySeries,
  granularity: Granularity,
  from: string,
  to: string,
): IncomeGrowth => {
  const { bucketKeys } = trend;
  const span = bucketSpan(bucketKeys, granularity, from, to);
  const current = span === null ? 0 : totalOverSpan(trend, span);

  const windowOf = (windowSpan: [number, number]): IncomeGrowthWindow => {
    const total = totalOverSpan(trend, windowSpan);
    return {
      from: bucketDateBoundaries(bucketKeys[windowSpan[0]], granularity).start,
      to: bucketDateBoundaries(bucketKeys[windowSpan[1]], granularity).end,
      total,
      pct: percentDelta(current, total),
    };
  };

  const priorPeriod = (): IncomeGrowthWindow | null => {
    if (span === null) return null;
    const startIndex = span[0] - spanLength(span);
    return startIndex < 0 ? null : windowOf([startIndex, span[0] - 1]);
  };

  const priorYear = (): IncomeGrowthWindow | null => {
    if (span === null) return null;
    const shifted = shiftRangeByYears(from, to, 1);
    const shiftedSpan = bucketSpan(bucketKeys, granularity, shifted.from, shifted.to);
    // `bucketSpan` clamps to what the series holds, so a window running off its start comes back
    // shorter than the current one — that shortfall *is* the "not covered in full" test.
    return shiftedSpan === null || spanLength(shiftedSpan) !== spanLength(span)
      ? null
      : windowOf(shiftedSpan);
  };

  return { from, to, current, priorPeriod: priorPeriod(), priorYear: priorYear() };
};
