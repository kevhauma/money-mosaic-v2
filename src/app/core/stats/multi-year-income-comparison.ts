import type { YearlyIncomeEntry } from './yearly-income-summary';

/** How far back the comparison reaches: the last 3 or 5 comparable years, or every one of them. */
export type MultiYearIncomeSpan = 3 | 5 | 'all-time';

/** The selectable spans, in the order the picker renders them. */
export const MULTI_YEAR_INCOME_SPANS: readonly MultiYearIncomeSpan[] = [3, 5, 'all-time'];

export type MultiYearIncomeComparison = {
  /** The oldest year in the span, `YYYY`. */
  firstYear: string;
  firstYearTotal: number;
  /** The newest year in the span, `YYYY`; equal to `firstYear` when only one year is comparable. */
  lastYear: string;
  lastYearTotal: number;
  /** Fractional change from `firstYearTotal` to `lastYearTotal` (0.18 = +18%); `null` whenever the comparison would mislead — see the function doc. */
  pctChange: number | null;
};

/**
 * The aggregate change across a chosen multi-year span (FR-INC-7, TICKET-INC-07) — "how has my
 * income changed over the last few years", as opposed to FR-INC-6's adjacent-year deltas.
 *
 * Consumes `computeYearlyIncomeSummary()`'s output rather than re-deriving totals from
 * transactions, so the headline percentage and the bars it sits above can never disagree.
 *
 * **Only complete years are comparable.** `computeYearlyIncomeSummary` already refuses to put a
 * percentage on a partial year, and the same reason applies with more force here: the range's `to`
 * is *today* (`computeFullHistoryRange`), so the newest year is in progress every month except
 * December, and comparing it to a full year reads as a collapse that has nothing to do with income.
 * Partial years are therefore dropped before the span is taken — `span` counts comparable years,
 * not calendar ones, so "3y" on a history running 2023→mid-2026 compares 2023 to 2025.
 *
 * Fewer years of history than the span asks for is not an error: the span truncates to whatever is
 * available, mirroring `computeYearOverYearComparison`'s `yearsBack` cap.
 *
 * Returns `null` when no complete year exists at all — there is no span to describe, which is a
 * different thing from a span whose change can't be expressed as a percentage. `pctChange` is
 * `null` in that second case: a single comparable year (nothing to compare it against) or a first
 * year that totalled zero (which would read as `±∞%`).
 */
export const computeMultiYearIncomeComparison = (
  yearlySummary: readonly YearlyIncomeEntry[],
  span: MultiYearIncomeSpan,
): MultiYearIncomeComparison | null => {
  const comparableYears = yearlySummary.filter((entry) => !entry.isPartialYear);
  const inSpan = span === 'all-time' ? comparableYears : comparableYears.slice(-span);
  const firstEntry = inSpan.at(0);
  const lastEntry = inSpan.at(-1);
  if (firstEntry === undefined || lastEntry === undefined) return null;

  const hasTwoYears = inSpan.length > 1;
  return {
    firstYear: firstEntry.year,
    firstYearTotal: firstEntry.total,
    lastYear: lastEntry.year,
    lastYearTotal: lastEntry.total,
    pctChange:
      hasTwoYears && firstEntry.total !== 0
        ? (lastEntry.total - firstEntry.total) / Math.abs(firstEntry.total)
        : null,
  };
};
