import type { GrossNetRatioPoint } from './gross-net-ratio';

/** Which of the two figures moved. */
export type WageSeries = 'net' | 'gross';

export type WageChange = {
  series: WageSeries;
  /** The month the new level applies from. */
  bucketKey: string;
  /** The month it is measured against — the previous month that had a figure at all. */
  fromBucketKey: string;
  from: number;
  to: number;
  /** `to - from`, signed. */
  delta: number;
  /** Fractional change from `from` to `to` (0.042 = +4.2%), signed. */
  pct: number;
};

/**
 * Anything above this counts as a move worth listing. Deliberately low: on a wage that changes once
 * or twice a year, almost every month is *exactly* flat, so a 1% floor filters rounding and a
 * shifted pay date while still catching an indexation nobody announced.
 */
const WAGE_CHANGE_THRESHOLD = 0.01;

/**
 * What counts as a figure worth measuring from. A month with nothing entered, a month that paid
 * zero, and a month that comes out *negative* are all "nothing to measure" — the last is reachable:
 * `computeGrossNetRatio` subtracts a recorded bonus from what the counted categories received, so a
 * bonus noted against a month with no counted income lands below zero. Comparing against it would
 * report a several-hundred-percent swing that describes bookkeeping, not pay.
 */
const known = (value: number | null): value is number => value !== null && value > 0;

/** One month's figure, once it's known to be measurable. */
type Measured = { bucketKey: string; value: number };

const changeBetween = (
  series: WageSeries,
  previous: Measured,
  current: Measured,
): WageChange | null => {
  const pct = (current.value - previous.value) / previous.value;
  if (Math.abs(pct) <= WAGE_CHANGE_THRESHOLD) return null;

  return {
    series,
    bucketKey: current.bucketKey,
    fromBucketKey: previous.bucketKey,
    from: previous.value,
    to: current.value,
    delta: current.value - previous.value,
    pct,
  };
};

const changesIn = (
  points: GrossNetRatioPoint[],
  series: WageSeries,
  valueOf: (point: GrossNetRatioPoint) => number | null,
): WageChange[] => {
  // Narrowed to the measurable months *first*, so each comparison is against the previous month
  // that had a figure rather than the previous bucket.
  const measured: Measured[] = points
    .map((point) => ({ bucketKey: point.bucketKey, value: valueOf(point) }))
    .filter((entry): entry is Measured => known(entry.value));

  return measured
    .slice(1)
    .map((entry, index) => changeBetween(series, measured[index], entry))
    .filter((change): change is WageChange => change !== null);
};

/**
 * Every month-to-month move in take-home pay or gross wage worth telling the user about
 * (TICKET-INC-17's events rail). Distinct from `detectIncomeStepChanges`, which looks for a
 * *sustained* shift in a category's trailing average and is deliberately slow to fire: this is the
 * literal month-on-month record — the raise you got in March, and the one you didn't notice in
 * September.
 *
 * Takes `computeGrossNetRatio`'s output, so both figures mean exactly what they mean everywhere
 * else on the page: **plain salary**, with the annual lump-sum categories excluded and any recorded
 * bonus subtracted (TICKET-INC-14). A 13th month therefore never shows up here as a raise followed
 * by a cut, which is the entire reason this doesn't read the trend series directly.
 *
 * Compared against the previous month that *had* a figure, not the previous bucket: a gap in gross
 * wages the user hasn't filled in should not turn the next entry into a change from nothing.
 */
export const detectWageChanges = (points: GrossNetRatioPoint[]): WageChange[] => [
  ...changesIn(points, 'net', (point) => point.net),
  ...changesIn(points, 'gross', (point) => point.gross),
];
