import type { SalaryMetadata } from '@/core/data-access';
import type { Granularity } from '@/shared/utils';
import type { CategorySeriesEntry } from './category-composition-trend';
import type { IncomeCategorySeries } from './income-category-series';

/** A bucket key's calendar year — at `'month'` granularity every key is `YYYY-MM`. */
const yearOf = (bucketKey: string): string => bucketKey.slice(0, 4);

/**
 * The id the redistributed-bonus series carries (TICKET-INC-20) — a sentinel, not a `Category` row:
 * no transaction can ever belong to it, because it is derived from `SalaryMetadata.bonus` at query
 * time like every other smoothing pass on the Income page.
 *
 * Negative rather than `null`, which already means "Uncategorised" to `computeGrossNetRatio`'s
 * counted-series filter, and rather than a `synthetic?: true` flag on `CategorySeriesEntry`, which
 * is shared with the dashboard's composition trend. Dexie auto-increment ids start at 1, so this can
 * never collide with a real category.
 */
export const SMOOTHED_BONUS_CATEGORY_ID = -1;

/** Legend entry for the synthetic series — says what the band *is*, since there's no category name to borrow. */
const SMOOTHED_BONUS_SERIES_NAME = 'Bonus (spread over the year)';

/**
 * The synthetic band's fixed colour. A deliberate exception to the "warm hues stay reserved for
 * success/warning/error" rule the categorical palettes follow (`shared/echarts/chart-theme.ts`):
 * this band must be told apart from every *category* at a glance, and it carries its own legend
 * label rather than a signed amount, so the confusion that rule guards against can't arise. A
 * mid-tone gold reads against both the light and dark plot backgrounds, which one fixed hex has to.
 */
const SMOOTHED_BONUS_SERIES_COLOR = '#c9a227';

/**
 * How much of each bucket's income the user has declared to be an embedded bonus, capped at what
 * that bucket actually received. The cap is reachable in practice, not defensive padding: the bonus
 * is entered against the whole deposit, but the series only counts the categories selected under
 * FR-INC-3, so deselecting the salary category leaves a month whose counted income is smaller than
 * the bonus recorded against it (see the ticket's Notes).
 */
const removableBonuses = (
  bucketKeys: string[],
  bucketTotals: number[],
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
): number[] =>
  bucketKeys.map((bucketKey, index) =>
    Math.min(salaryMetadataByMonth.get(bucketKey)?.bonus ?? 0, bucketTotals[index]),
  );

const bucketsPerYearOf = (bucketKeys: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const bucketKey of bucketKeys) {
    const year = yearOf(bucketKey);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return counts;
};

/**
 * Each bucket's declared bonus split *pro rata* across the series that were non-zero there, by their
 * share of that bucket's total. Returns one row per series, aligned with `series`.
 *
 * The fallback path, and correct on its own terms: with one income stream it is simply "take it off
 * the salary line", and with no main category named there is nothing to prefer.
 */
const proRataRemovals = (
  series: CategorySeriesEntry[],
  bonuses: number[],
  bucketTotals: number[],
): number[][] =>
  series.map((entry) =>
    entry.values.map((value, index) =>
      // A zero-total bucket has a zero bonus by the cap in `removableBonuses`, so this never
      // divides by zero.
      bonuses[index] === 0 ? 0 : (bonuses[index] * value) / bucketTotals[index],
    ),
  );

/**
 * How much of each bucket's declared bonus comes off each series (TICKET-INC-19). One row per
 * series, aligned with `series`.
 *
 * With a main income category named and present in the trend, the whole month's bonus comes off that
 * one series — capped at its own value that month, because a deposit really can straddle two
 * categories. Whatever the cap leaves goes pro rata across the others rather than being dropped: the
 * excess is income the user did declare as bonus, and silently keeping it would stop the year's total
 * balancing.
 *
 * An unset id, or one naming a category with no series here (excluded under FR-INC-3, archived, or
 * deleted), falls straight through to `proRataRemovals` — no error state, since a setting the page
 * can no longer act on is indistinguishable from an unset one.
 */
const bonusRemovals = (
  series: CategorySeriesEntry[],
  bonuses: number[],
  bucketTotals: number[],
  mainIncomeCategoryId: number | undefined,
): number[][] => {
  const mainIndex =
    mainIncomeCategoryId === undefined
      ? -1
      : series.findIndex((entry) => entry.categoryId === mainIncomeCategoryId);
  if (mainIndex === -1) return proRataRemovals(series, bonuses, bucketTotals);

  const mainValues = series[mainIndex].values;
  // Never more than the main series holds, and never negative — a refund-heavy month can leave a
  // category's own total below zero, which is not an amount a bonus can be taken out of.
  const fromMain = bonuses.map((bonus, index) => Math.max(0, Math.min(bonus, mainValues[index])));

  return series.map((entry, seriesIndex) =>
    entry.values.map((value, index) => {
      if (seriesIndex === mainIndex) return fromMain[index];

      const remainder = bonuses[index] - fromMain[index];
      // `bonuses` is capped at the bucket's total, so the remainder never exceeds what the other
      // series hold — meaning a zero divisor here always comes with a zero remainder.
      const othersTotal = bucketTotals[index] - mainValues[index];
      return remainder === 0 ? 0 : (remainder * value) / othersTotal;
    }),
  );
};

/** Everything taken off every series in a given year, keyed by year — the total the synthetic band hands back. */
const removedPerYearOf = (bucketKeys: string[], removals: number[][]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const row of removals) {
    for (const [index, removed] of row.entries()) {
      const year = yearOf(bucketKeys[index]);
      totals.set(year, (totals.get(year) ?? 0) + removed);
    }
  }
  return totals;
};

/**
 * Spreads bonuses recorded *inside* a salary deposit across their year (TICKET-INC-13), the
 * complement of `smoothAnnualLumpSums`: that one flattens a bonus that has its own category, this
 * one a bonus baked into the regular deposit, where there is no category id to flag and the
 * `SalaryMetadata.bonus` figure (FR-INC-10) is the only record that part of the month wasn't wage.
 *
 * Two passes, both per calendar year:
 * - **Removal** — each bucket's declared bonus comes off the user's main income category
 *   (`mainIncomeCategoryId`, TICKET-INC-19), or pro rata across the non-zero series when none is
 *   named; see `bonusRemovals`.
 * - **Redistribution** — every series' removed total is pooled per year and handed to **one extra
 *   series** of its own (`SMOOTHED_BONUS_CATEGORY_ID`, TICKET-INC-20), spread evenly over that
 *   year's buckets. The real categories keep only their non-bonus remainder, so the chart says "this
 *   much of my year was bonus" instead of quietly inflating salary by a twelfth.
 *
 * That extra series **replaces** TICKET-INC-13's per-series hand-back, and with it that ticket's
 * "each series' own annual total is preserved" property: the bonus now moves *between* series. What
 * still holds exactly — and is what the page's totals, growth figures and yearly panel all read — is
 * the sum across all series, per bucket and per year.
 *
 * Even redistribution across all of the year's buckets (not just the ones after the deposit) matches
 * `smoothAnnualLumpSums` exactly — a user comparing the two mechanisms shouldn't find they smooth
 * differently.
 *
 * **Monthly granularity only**, and a documented pass-through otherwise: `salaryMetadata` is keyed
 * `YYYY-MM`, so any other bucket size has nothing to join on. Query-time like FR-INC-4 — no recorded
 * bonus is ever written back onto a transaction, so editing or clearing one re-shapes the chart
 * immediately. Entering the figure *is* the opt-in; there is no separate setting.
 */
export const smoothEmbeddedBonuses = (
  trend: IncomeCategorySeries,
  salaryMetadataByMonth: ReadonlyMap<string, SalaryMetadata>,
  granularity: Granularity,
  mainIncomeCategoryId?: number,
): IncomeCategorySeries => {
  if (granularity !== 'month') return trend;

  const { bucketKeys, series } = trend;
  const bucketTotals = bucketKeys.map((_, index) =>
    series.reduce((total, entry) => total + entry.values[index], 0),
  );
  const bonuses = removableBonuses(bucketKeys, bucketTotals, salaryMetadataByMonth);
  if (bonuses.every((bonus) => bonus === 0)) return trend;

  const removals = bonusRemovals(series, bonuses, bucketTotals, mainIncomeCategoryId);
  const bucketsPerYear = bucketsPerYearOf(bucketKeys);
  const removedPerYear = removedPerYearOf(bucketKeys, removals);

  return {
    bucketKeys,
    series: [
      ...series.map((entry, seriesIndex) => ({
        ...entry,
        values: entry.values.map((value, index) => value - removals[seriesIndex][index]),
      })),
      {
        categoryId: SMOOTHED_BONUS_CATEGORY_ID,
        name: SMOOTHED_BONUS_SERIES_NAME,
        color: SMOOTHED_BONUS_SERIES_COLOR,
        values: bucketKeys.map((bucketKey) => {
          const year = yearOf(bucketKey);
          return (removedPerYear.get(year) ?? 0) / bucketsPerYear.get(year)!;
        }),
      },
    ],
  };
};
