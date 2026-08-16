import { formatIsoDate, parseIsoDate, type CalendarUnit } from './date-buckets';
import { parseRangeExpression, resolveRangeExpression } from './range-expression';

/** Display order for the picker (TICKET-STAT-37) — `QUICK_RANGES` is authored in this order too. */
export type QuickRangeGroup = 'relative' | 'previous-period' | 'current-period' | 'everything';

type QuickRangeBase = {
  id: string;
  label: string;
  group: QuickRangeGroup;
  /** Set only for entries whose span is a whole calendar unit, so `RangeStore.shiftRange` can step by it (TICKET-STAT-16). Absent for rolling windows (day-count stepping instead) and "so far"/`all-time` (stepping disabled instead, see `steppingDisabled`). */
  calendarUnit?: CalendarUnit;
  /** Set only for entries with no fixed, repeatable length — "so far" variants and `all-time` — where "previous"/"next" has no well-defined target (TICKET-STAT-16). */
  steppingDisabled?: true;
};

/** Every non-fiscal, non-`all-time` entry — a pair of STAT-35 expression text, resolved fresh against `todayIso` on every read. */
export type QuickRangeExpressionEntry = QuickRangeBase & { fromExpr: string; toExpr: string };

/**
 * Quarters and the two fiscal entries carry a resolver instead of an expression pair. Quarters
 * because STAT-35's expression grammar deliberately has no quarter unit (see its Notes); the fiscal
 * entries because a fiscal boundary is a user setting, not a property of the calendar, so encoding
 * it in the grammar would make expression resolution depend on application state.
 */
export type QuickRangeResolverEntry = QuickRangeBase & {
  resolve: (todayIso: string, fiscalYearStartMonth: number) => { from: string; to: string };
};

/**
 * `all-time` alone: its `from` depends on imported account/transaction data, which this pure module
 * has no access to and never will (TICKET-STAT-03's original reasoning, carried forward). Resolved
 * by the caller via `computeFullHistoryRange` instead — this entry exists in the catalogue only so
 * the picker can list it alongside every other range.
 */
export type QuickRangeExternalEntry = QuickRangeBase & { external: true };

export type QuickRangeEntry =
  QuickRangeExpressionEntry | QuickRangeResolverEntry | QuickRangeExternalEntry;

export const ALL_TIME_QUICK_RANGE_ID = 'all-time';

const absoluteMonth = (year: number, month0: number): number => year * 12 + month0;

const monthFromAbsolute = (absMonth: number): { year: number; month0: number } => ({
  year: Math.floor(absMonth / 12),
  month0: ((absMonth % 12) + 12) % 12,
});

const monthRangeBoundaries = (
  startAbsMonth: number,
  endAbsMonth: number,
): { from: string; to: string } => {
  const start = monthFromAbsolute(startAbsMonth);
  const end = monthFromAbsolute(endAbsMonth);
  return {
    from: formatIsoDate(new Date(Date.UTC(start.year, start.month0, 1))),
    to: formatIsoDate(new Date(Date.UTC(end.year, end.month0 + 1, 0))),
  };
};

/**
 * Boundaries of a fiscal period (quarter or year) offset from the one containing `todayIso`, for a
 * fiscal year starting in `fiscalYearStartMonth` (1-12). `offsetPeriods: -1` means "the previous
 * one", `0` means "the current one". With `fiscalYearStartMonth = 1` this coincides exactly with
 * the plain calendar quarter/year (verified against the old `resolvePresetRange` quarter/year
 * branches), which is what lets `previous-fiscal-quarter`/`previous-fiscal-year` fall back to
 * today's exact calendar behaviour when the setting is unset (TICKET-SET-09) — and is why
 * `previous-quarter`/`this-quarter` below reuse this same function with `fiscalYearStartMonth`
 * hardcoded to 1 rather than duplicating the arithmetic.
 */
const fiscalPeriodBoundaries = (
  todayIso: string,
  fiscalYearStartMonth: number,
  periodMonths: 3 | 12,
  offsetPeriods: number,
): { from: string; to: string } => {
  const today = parseIsoDate(todayIso);
  const startMonth0 = fiscalYearStartMonth - 1;
  const todayAbsMonth = absoluteMonth(today.getUTCFullYear(), today.getUTCMonth());
  const fiscalYearStartAbsMonth = Math.floor((todayAbsMonth - startMonth0) / 12) * 12 + startMonth0;
  const currentPeriodIndex = Math.floor((todayAbsMonth - fiscalYearStartAbsMonth) / periodMonths);
  const periodStartAbsMonth =
    fiscalYearStartAbsMonth + (currentPeriodIndex + offsetPeriods) * periodMonths;

  return monthRangeBoundaries(periodStartAbsMonth, periodStartAbsMonth + periodMonths - 1);
};

/**
 * The 21 quick ranges the picker offers (TICKET-STAT-37), grouped and ordered exactly as listed —
 * adding a range is one entry here. Six ids are renamed from their pre-STAT-37 spelling (see the
 * ticket's rename table); `last-30-days` is also a genuine one-day-narrower behaviour change, not
 * just a rename — `now-29d` is a true 30-day inclusive span, one day short of old `last-31-days`'s
 * `now-30d`-equivalent 31-day span.
 */
export const QUICK_RANGES: QuickRangeEntry[] = [
  // Relative
  { id: 'last-7-days', label: 'Last 7 days', group: 'relative', fromExpr: 'now-6d', toExpr: 'now' },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    group: 'relative',
    fromExpr: 'now-29d',
    toExpr: 'now',
  },
  {
    id: 'last-90-days',
    label: 'Last 90 days',
    group: 'relative',
    fromExpr: 'now-89d',
    toExpr: 'now',
  },
  {
    id: 'last-6-months',
    label: 'Last 6 months',
    group: 'relative',
    fromExpr: 'now-6M',
    toExpr: 'now',
  },
  { id: 'last-1-year', label: 'Last 1 year', group: 'relative', fromExpr: 'now-1y', toExpr: 'now' },
  {
    id: 'last-2-years',
    label: 'Last 2 years',
    group: 'relative',
    fromExpr: 'now-2y',
    toExpr: 'now',
  },
  {
    id: 'last-5-years',
    label: 'Last 5 years',
    group: 'relative',
    fromExpr: 'now-5y',
    toExpr: 'now',
  },

  // Previous period
  {
    id: 'previous-week',
    label: 'Previous week',
    group: 'previous-period',
    calendarUnit: 'week',
    fromExpr: 'now-1w/w',
    toExpr: 'now-1w/w',
  },
  {
    id: 'previous-month',
    label: 'Previous month',
    group: 'previous-period',
    calendarUnit: 'month',
    fromExpr: 'now-1M/M',
    toExpr: 'now-1M/M',
  },
  {
    id: 'previous-quarter',
    label: 'Previous quarter',
    group: 'previous-period',
    calendarUnit: 'quarter',
    resolve: (todayIso) => fiscalPeriodBoundaries(todayIso, 1, 3, -1),
  },
  {
    id: 'previous-fiscal-quarter',
    label: 'Previous fiscal quarter',
    group: 'previous-period',
    calendarUnit: 'quarter',
    resolve: (todayIso, fiscalYearStartMonth) =>
      fiscalPeriodBoundaries(todayIso, fiscalYearStartMonth, 3, -1),
  },
  {
    id: 'previous-year',
    label: 'Previous year',
    group: 'previous-period',
    calendarUnit: 'year',
    fromExpr: 'now-1y/y',
    toExpr: 'now-1y/y',
  },
  {
    id: 'previous-fiscal-year',
    label: 'Previous fiscal year',
    group: 'previous-period',
    calendarUnit: 'year',
    resolve: (todayIso, fiscalYearStartMonth) =>
      fiscalPeriodBoundaries(todayIso, fiscalYearStartMonth, 12, -1),
  },

  // Current period
  {
    id: 'this-week',
    label: 'This week',
    group: 'current-period',
    calendarUnit: 'week',
    fromExpr: 'now/w',
    toExpr: 'now/w',
  },
  {
    id: 'this-week-so-far',
    label: 'This week so far',
    group: 'current-period',
    steppingDisabled: true,
    fromExpr: 'now/w',
    toExpr: 'now',
  },
  {
    id: 'this-month',
    label: 'This month',
    group: 'current-period',
    calendarUnit: 'month',
    fromExpr: 'now/M',
    toExpr: 'now/M',
  },
  {
    id: 'this-month-so-far',
    label: 'This month so far',
    group: 'current-period',
    steppingDisabled: true,
    fromExpr: 'now/M',
    toExpr: 'now',
  },
  {
    id: 'this-quarter',
    label: 'This quarter',
    group: 'current-period',
    calendarUnit: 'quarter',
    resolve: (todayIso) => fiscalPeriodBoundaries(todayIso, 1, 3, 0),
  },
  {
    id: 'this-year',
    label: 'This year',
    group: 'current-period',
    calendarUnit: 'year',
    fromExpr: 'now/y',
    toExpr: 'now/y',
  },
  {
    id: 'this-year-so-far',
    label: 'This year so far',
    group: 'current-period',
    steppingDisabled: true,
    fromExpr: 'now/y',
    toExpr: 'now',
  },

  // Everything
  {
    id: ALL_TIME_QUICK_RANGE_ID,
    label: 'All time',
    group: 'everything',
    steppingDisabled: true,
    external: true,
  },
];

export const quickRangeById = (id: string): QuickRangeEntry | undefined =>
  QUICK_RANGES.find((entry) => entry.id === id);

/**
 * Resolves an expression or resolver entry to concrete `[from, to]` ISO dates. Never called with
 * the `external` (`all-time`) entry — its resolution needs account/transaction data this module
 * doesn't have, so callers special-case it via `computeFullHistoryRange` instead (see `RangeStore`).
 */
export const resolveQuickRange = (
  entry: QuickRangeExpressionEntry | QuickRangeResolverEntry,
  todayIso: string,
  fiscalYearStartMonth: number,
): { from: string; to: string } => {
  if ('resolve' in entry) {
    return entry.resolve(todayIso, fiscalYearStartMonth);
  }

  const resolveEdge = (expr: string, edge: 'from' | 'to'): string => {
    const parsed = parseRangeExpression(expr);
    return parsed.ok ? resolveRangeExpression(parsed.value, todayIso, edge) : expr;
  };

  return { from: resolveEdge(entry.fromExpr, 'from'), to: resolveEdge(entry.toExpr, 'to') };
};
