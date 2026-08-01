import type { Granularity } from '@/shared/utils';
import type { CategorySeriesEntry } from './category-composition-trend';
import type { IncomeCategorySeries } from './income-category-series';

export type IncomeStepChange = {
  categoryId: number;
  /** The first bucket of the "after" window — the month the new level took effect, not the month it became detectable. */
  changedAtBucketKey: string;
  direction: 'increase' | 'decrease';
  fromAvg: number;
  toAvg: number;
  /** Fractional change from `fromAvg` to `toAvg` (0.12 = +12%). */
  pctChange: number;
};

/**
 * How far the trailing average must move to count as a step rather than noise. Fixed for now — a
 * settings surface is an explicit follow-up (see the ticket's Notes).
 *
 * **10%, not the ±15% TICKET-INC-08's to-be section names.** That ticket's user story and its own
 * acceptance criterion both give "€2,500/mo → €2,800/mo" as the raise this feature exists to
 * catch — and that is +12%, which a 15% threshold silently ignores. The criterion is the contract;
 * the constant was the guess. See the ticket's implementation notes.
 */
const STEP_CHANGE_THRESHOLD = 0.1;

/** Months averaged on each side of the boundary. The two windows never overlap, so a raise shows as a clean before/after. */
const WINDOW_MONTHS = 3;

/** A category needs both windows' worth of its own history before it can flag — a brand-new income stream has nothing to have stepped away from. */
const MIN_HISTORY_MONTHS = WINDOW_MONTHS * 2;

const averageOf = (values: number[], startIndex: number, length: number): number => {
  let total = 0;
  for (let index = startIndex; index < startIndex + length; index++) total += values[index];
  return total / length;
};

/**
 * True when *every* month of the after-window sits past the threshold in the same direction — not
 * merely the window's average. One unusually good month lifts a 3-month average by a third of its
 * excess, which is enough to clear the threshold on its own; requiring all three rejects it.
 */
const heldForWholeWindow = (
  values: number[],
  afterStart: number,
  beforeAvg: number,
  direction: 'increase' | 'decrease',
): boolean => {
  const bound =
    beforeAvg * (direction === 'increase' ? 1 + STEP_CHANGE_THRESHOLD : 1 - STEP_CHANGE_THRESHOLD);
  for (let index = afterStart; index < afterStart + WINDOW_MONTHS; index++) {
    if (direction === 'increase' ? values[index] < bound : values[index] > bound) return false;
  }
  return true;
};

/**
 * True when no month of the window strays past the threshold from the window's own average.
 *
 * Applied to the *before* window, and it is what stops one freak month from being reported twice.
 * A 6000 spike in an otherwise-2000 category doesn't just fail the after-window rule when it lands;
 * three months later it sits inside the before-window and drags its average up, at which point a
 * perfectly normal quarter reads as a 40% pay cut. A window containing a spike is not a baseline to
 * measure a step against.
 */
const isStableWindow = (values: number[], startIndex: number, average: number): boolean => {
  if (average === 0) return false;
  for (let index = startIndex; index < startIndex + WINDOW_MONTHS; index++) {
    if (Math.abs((values[index] - average) / Math.abs(average)) > STEP_CHANGE_THRESHOLD) {
      return false;
    }
  }
  return true;
};

/** The first bucket this category ever paid into — leading zeros are "before it existed", not "a period of no income". */
const firstActiveIndex = (values: number[]): number => values.findIndex((value) => value !== 0);

const detectForCategory = (
  { categoryId, values }: CategorySeriesEntry,
  bucketKeys: string[],
): IncomeStepChange[] => {
  if (categoryId === null) return [];

  const start = firstActiveIndex(values);
  if (start === -1 || values.length - start < MIN_HISTORY_MONTHS) return [];

  const changes: IncomeStepChange[] = [];
  // `afterStart` is the first month of the after-window; the before-window is the three months
  // immediately preceding it, and may not reach back past this category's own first payment.
  let afterStart = start + WINDOW_MONTHS;
  while (afterStart + WINDOW_MONTHS <= values.length) {
    const beforeAvg = averageOf(values, afterStart - WINDOW_MONTHS, WINDOW_MONTHS);
    const toAvg = averageOf(values, afterStart, WINDOW_MONTHS);
    const pctChange = beforeAvg === 0 ? 0 : (toAvg - beforeAvg) / Math.abs(beforeAvg);
    const direction = pctChange > 0 ? 'increase' : 'decrease';

    if (
      isStableWindow(values, afterStart - WINDOW_MONTHS, beforeAvg) &&
      Math.abs(pctChange) >= STEP_CHANGE_THRESHOLD &&
      heldForWholeWindow(values, afterStart, beforeAvg, direction)
    ) {
      changes.push({
        categoryId,
        changedAtBucketKey: bucketKeys[afterStart],
        direction,
        fromAvg: beforeAvg,
        toAvg,
        pctChange,
      });
      // Restart past the change, so the same raise isn't re-reported with a diminishing percentage
      // for each of the next two months as it bleeds into the before-window.
      afterStart += WINDOW_MONTHS * 2;
    } else {
      afterStart++;
    }
  }

  return changes;
};

/**
 * Sustained step-changes in each income category's typical monthly amount (FR-INC-8,
 * TICKET-INC-08) — a raise or a pay cut, surfaced instead of buried in the trend chart.
 *
 * Compares the trailing 3-month average ending at each month against the 3 months before it (two
 * non-overlapping windows) and flags a move of at least ±10% that **every** month of the after
 * window holds, not just the average, and that is measured against a before-window with no spike of
 * its own. A category may step more than once over its history — a raise and, later, a pay cut are
 * two entries.
 *
 * Expects `smoothAnnualLumpSums(computeIncomeCategorySeries(...))`'s output, so a category the user
 * has marked as an annual lump sum (FR-INC-4) arrives already spread across its year and its bonus
 * month cannot register as a raise followed by a pay cut.
 *
 * **Monthly granularity only.** The 3-month window has no meaning at day/week/quarter buckets, so
 * every other granularity returns an empty result rather than silently misapplying it.
 *
 * The series' last bucket is usually the in-progress month, which is short through no fault of the
 * income. It can't produce a false "pay cut" on its own: it is only ever the *last* month of an
 * after-window, and the rule above requires all three of them to have moved.
 */
export const detectIncomeStepChanges = (
  trend: IncomeCategorySeries,
  granularity: Granularity,
): IncomeStepChange[] => {
  if (granularity !== 'month') return [];
  return trend.series.flatMap((entry) => detectForCategory(entry, trend.bucketKeys));
};
