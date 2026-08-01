import type { SalaryMetadata } from '@/core/data-access';
import type { IncomeCategorySeries } from './income-category-series';

export type GrossNetRatioPoint = {
  /** `YYYY-MM`. */
  bucketKey: string;
  /** Selected-category income actually received that month, minus any bonus embedded in the deposit. */
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
 * A month's `bonus` — the part of that deposit that was a 13th month or holiday pay rather than
 * regular wage (FR-INC-10) — is subtracted from `net` first. Left in, it inflates the ratio for
 * that month into a take-home rate the user never actually had. This is the complement of FR-INC-4:
 * that one handles a bonus in its *own* category, this one a bonus baked into the salary deposit
 * where there's no separate category to flag.
 *
 * Months with no `SalaryMetadata` row come back with `gross: null` and `ratio: null` so a chart can
 * leave a gap rather than draw a dip to zero — the user hasn't said, which is not the same as zero.
 */
export const computeGrossNetRatio = (
  trend: IncomeCategorySeries,
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
): GrossNetRatioPoint[] =>
  trend.bucketKeys.map((bucketKey, index) => {
    const entry = salaryMetadataByMonth.get(bucketKey);
    // The series is already scoped to the user's selection (FR-INC-3) by its builder, so summing
    // every entry here *is* summing only the selected categories.
    const received = trend.series.reduce((sum, series) => sum + series.values[index], 0);
    const net = received - (entry?.bonus ?? 0);
    const gross = entry?.grossWage ?? null;

    return { bucketKey, net, gross, ratio: gross === null || gross === 0 ? null : net / gross };
  });
