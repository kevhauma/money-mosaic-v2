import type { GrossNetRatioPoint } from './gross-net-ratio';

export type GrossNetGrowthPoint = {
  /** `YYYY-MM`. */
  bucketKey: string;
  /** The gross wage entered for that month, or `null` when none was. */
  grossValue: number | null;
  /** The month's plain wage, on exactly the take-home panel's basis (TICKET-INC-14). */
  netValue: number | null;
  /** Distance from the shared baseline month, or `null` before it / with nothing to measure. */
  grossFromStart: number | null;
  netFromStart: number | null;
  /** The same distance relative to the baseline; `null` when the baseline is zero. */
  grossPctFromStart: number | null;
  netPctFromStart: number | null;
};

/** `null` rather than a misleading number when the basis is zero — `income-growth.ts`'s rule. */
const percentFrom = (value: number, baseline: number): number | null =>
  baseline === 0 ? null : (value - baseline) / Math.abs(baseline);

/** A month before the baseline, or one in a history with no baseline at all: levels only, nothing to measure from. */
const unmeasurable = (point: GrossNetRatioPoint): GrossNetGrowthPoint => ({
  bucketKey: point.bucketKey,
  grossValue: point.gross,
  netValue: point.net,
  grossFromStart: null,
  netFromStart: null,
  grossPctFromStart: null,
  netPctFromStart: null,
});

const measured = (
  point: GrossNetRatioPoint,
  baselineGross: number,
  baselineNet: number,
): GrossNetGrowthPoint => ({
  bucketKey: point.bucketKey,
  grossValue: point.gross,
  netValue: point.net,
  grossFromStart: point.gross === null ? null : point.gross - baselineGross,
  netFromStart: point.net - baselineNet,
  grossPctFromStart: point.gross === null ? null : percentFrom(point.gross, baselineGross),
  netPctFromStart: percentFrom(point.net, baselineNet),
});

/**
 * Gross and net side by side over time (FR-INC-13, TICKET-INC-16): their levels, how far each has
 * travelled from the first month both were known, and that same distance as a percentage — the one
 * that answers the actual question, since gross and net rising at the same rate means raises pass
 * through intact while gross outrunning net means the deduction rate is climbing.
 *
 * Sourced from `computeGrossNetRatio`'s output rather than re-derived from the trend, so "gross" and
 * "net" mean exactly the same thing here as on the take-home band — including TICKET-INC-14's
 * exclusions (annual lump-sum categories out, the recorded `bonus` subtracted), which therefore
 * apply here for free instead of being restated and eventually drifting apart.
 *
 * **One shared baseline**, the earliest bucket where gross *and* net are both known: two separately
 * anchored lines would be answering different questions, which is the opposite of why they're drawn
 * together. Every `*FromStart` field is `null` before that month and `0` at it.
 *
 * A month with no `SalaryMetadata` row leaves every gross field `null` while the net fields carry
 * on, so a chart breaks only the gross line over a month the user hasn't annotated.
 */
export const computeGrossNetGrowth = (points: GrossNetRatioPoint[]): GrossNetGrowthPoint[] => {
  const baselineIndex = points.findIndex((point) => point.gross !== null);
  if (baselineIndex === -1) return points.map(unmeasurable);

  const { gross, net } = points[baselineIndex];
  return points.map((point, index) =>
    index < baselineIndex ? unmeasurable(point) : measured(point, gross!, net),
  );
};
