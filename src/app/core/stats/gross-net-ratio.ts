import type { SalaryMetadata } from '@/core/data-access';
import type { IncomeCategorySeries } from './income-category-series';

export type GrossNetRatioPoint = {
  /** `YYYY-MM`. */
  bucketKey: string;
  /**
   * The month's plain wage: selected-category income actually received, minus the categories the
   * user flagged as an annual lump sum and minus any bonus embedded in the deposit itself.
   */
  net: number;
  /** The gross wage entered for that month, or `null` when none was. */
  gross: number | null;
  /** `net / gross`; `null` whenever there's no gross to divide by — never `0`, `Infinity` or `NaN`. */
  ratio: number | null;
};

/**
 * What share of each month's gross pay actually reached the account (FR-INC-11, TICKET-INC-11) — a
 * drifting take-home rate is invisible in "net income is up".
 *
 * Takes the **raw** `computeIncomeCategorySeries()` output, deliberately not FR-INC-4's smoothed
 * one: this is the single panel where the actual month matters more than a clean trend line. A gross
 * wage is entered for a specific month, and comparing it against a figure redistributed across the
 * year would divide two things that aren't about the same month.
 *
 * **Both bonus mechanisms are removed from the basis, by the same rule** (TICKET-INC-14) — a lump
 * sum is not part of the monthly wage a monthly gross figure describes, however it was paid:
 * - `excludedCategoryIds` (in practice `IncomeStore.smoothedBonusCategoryIds()`, FR-INC-4) drops a
 *   whole category's income — the case where the 13th month has its own category;
 * - a month's `bonus` (FR-INC-10) is subtracted on top — the case where it's baked into the salary
 *   deposit, with no separate category to flag.
 *
 * Left in, either one inflates that month's ratio into a take-home rate the user never had, past
 * 100% for a big enough lump sum. They never double-subtract: the category exclusion drops the
 * series before the sum, and `bonus` only ever comes off what remains.
 *
 * This is the deliberate *opposite* call from TICKET-INC-13, which spreads the same lump sums across
 * their year on the trend chart. The two never disagree about what counts as a bonus — both read the
 * same `smoothedBonusCategoryIds`/`SalaryMetadata.bonus` — they disagree about what a lump sum means
 * for the question each answers.
 *
 * Months with no `SalaryMetadata` row come back with `gross: null` and `ratio: null` so a chart can
 * leave a gap rather than draw a dip to zero — the user hasn't said, which is not the same as zero.
 */
export const computeGrossNetRatio = (
  trend: IncomeCategorySeries,
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
  excludedCategoryIds: ReadonlySet<number> = new Set(),
): GrossNetRatioPoint[] => {
  // The series is already scoped to the user's selection (FR-INC-3) by its builder, so summing what
  // survives this filter *is* summing the selected, non-lump-sum categories.
  const counted = trend.series.filter(
    (series) => series.categoryId === null || !excludedCategoryIds.has(series.categoryId),
  );

  return trend.bucketKeys.map((bucketKey, index) => {
    const entry = salaryMetadataByMonth.get(bucketKey);
    const received = counted.reduce((sum, series) => sum + series.values[index], 0);
    const net = received - (entry?.bonus ?? 0);
    const gross = entry?.grossWage ?? null;

    return { bucketKey, net, gross, ratio: gross === null || gross === 0 ? null : net / gross };
  });
};
