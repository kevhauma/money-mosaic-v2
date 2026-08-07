import { formatMonthShort, formatWeekdayShort } from './date-format';

/**
 * A repeating calendar cycle a date can be folded onto (TICKET-STAT-29/30) — "which day of the
 * week", "which month of the year". The direct sibling of [`Granularity`](./date-buckets.ts), and
 * here for the same reason: it is calendar vocabulary, so both `core/` aggregates and `shared/ui`
 * controls can name it without either depending on the other.
 *
 * Not a `Granularity`: that names bucket *sizes* along a timeline (every January its own bucket),
 * while a cycle names a *position within* a repeating one (every January in the same column).
 */
export type CycleKey = 'day-of-week' | 'day-of-month' | 'month-of-year' | 'quarter-of-year';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const DAYS_IN_LONGEST_MONTH = 31;
const QUARTERS_PER_YEAR = 4;
const MONTHS_PER_QUARTER = 3;

/**
 * A Monday-first week of real dates (2024-01-01 was a Monday), used only to ask `Intl` for each
 * weekday's name in the active locale — a fixed reference week keeps the labels deterministic
 * without hardcoding an English table.
 */
const weekdayReferenceDate = (index: number): string => `2024-01-0${index + 1}`;

/** Mid-month so no timezone or short-month edge can shift the month a label is asked for. */
const monthReferenceDate = (index: number): string =>
  `2024-${String(index + 1).padStart(2, '0')}-15`;

/**
 * Every column a cycle has, as stable locale-independent keys — always the full set, so a position
 * with no data is an empty column rather than a missing one. Safe as a template `track` key and in
 * assertions; `cycleColumnLabels` is the display half.
 */
export const cycleColumnKeys = (cycle: CycleKey): string[] => {
  switch (cycle) {
    case 'day-of-week':
      return [...WEEKDAY_KEYS];
    case 'day-of-month':
      // 1-31 always, even though only seven months can reach 31 — the thinner tail is the
      // calendar's, and hiding it would misstate which days of the month are quiet.
      return Array.from({ length: DAYS_IN_LONGEST_MONTH }, (_, index) => String(index + 1));
    case 'month-of-year':
      return [...MONTH_KEYS];
    case 'quarter-of-year':
      return Array.from({ length: QUARTERS_PER_YEAR }, (_, index) => `q${index + 1}`);
  }
};

/**
 * The same columns as display labels, in the same order. Locale-aware for the two cycles whose
 * columns are named days/months (`Intl` via `formatWeekdayShort`/`formatMonthShort`, so a locale
 * change relabels the axis); day-of-month and quarter are numerals either way.
 *
 * Deliberately *not* part of the aggregate that computes the cells: labels are presentation, and
 * folding them in would make an expensive whole-transaction-set aggregation re-run every time the
 * locale setting changed.
 */
export const cycleColumnLabels = (cycle: CycleKey): string[] => {
  switch (cycle) {
    case 'day-of-week':
      return WEEKDAY_KEYS.map((_, index) => formatWeekdayShort(weekdayReferenceDate(index)));
    case 'month-of-year':
      return MONTH_KEYS.map((_, index) => formatMonthShort(monthReferenceDate(index)));
    case 'day-of-month':
    case 'quarter-of-year':
      return cycleColumnKeys(cycle).map((key) => key.replace('q', 'Q'));
  }
};

/**
 * Monday-first index (`Date`'s own week starts on Sunday), on the UTC calendar date — the same
 * convention as `weekday-weekend-split.ts`. Exported because any Monday-first calendar layout needs
 * exactly this (TICKET-REC-03's bill grid aligns its first row with it); a second copy would be a
 * second chance to get the Sunday offset wrong.
 */
export const mondayFirstWeekdayIndex = (isoDate: string): number =>
  (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Read off the ISO string rather than a `Date`: `YYYY-MM-DD` is fixed-width, and parsing it can only introduce a timezone to get wrong. */
const monthIndex = (isoDate: string): number => Number(isoDate.slice(5, 7)) - 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How long a range has to be before a cycle is worth asking about (TICKET-STAT-31), in days:
 * a full week, the shortest calendar month, and a full year for the two year-shaped cycles.
 * Quarter takes the year threshold rather than ~90 days for the same reason as month — a
 * single-quarter range puts everything in one of four columns, which is the defect, not the view.
 */
const MINIMUM_RANGE_DAYS: Record<CycleKey, number> = {
  'day-of-week': 7,
  'day-of-month': 28,
  'month-of-year': 365,
  'quarter-of-year': 365,
};

/** Inclusive day count of an ISO date range — `2026-07-06`..`2026-07-12` is 7, not 6. */
const rangeDayCount = (from: string, to: string): number =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY) + 1;

/**
 * The cycles a range is long enough to fill, shortest first (TICKET-STAT-31) — a one-week range
 * has no business offering a month-of-year view, where eleven columns would be empty for calendar
 * reasons rather than spending ones.
 *
 * `'day-of-week'` is always included, even for a three-day range: it is the smallest unit on offer
 * and the default, and a picker with nothing in it is worse than one honest option.
 *
 * Gated on range *length*, not on column coverage: a whole 28-day February never reaches the 31st,
 * but it is plainly enough range to read day-of-month patterns from. Coverage is a separate
 * question, and the panel reports it separately.
 */
export const cyclesForRange = (from: string, to: string): CycleKey[] => {
  const days = rangeDayCount(from, to);
  return (Object.keys(MINIMUM_RANGE_DAYS) as CycleKey[]).filter(
    (cycle) => cycle === 'day-of-week' || days >= MINIMUM_RANGE_DAYS[cycle],
  );
};

/** Which of the cycle's columns a date falls in. */
export const cycleColumnIndex = (isoDate: string, cycle: CycleKey): number => {
  switch (cycle) {
    case 'day-of-week':
      return mondayFirstWeekdayIndex(isoDate);
    case 'day-of-month':
      return Number(isoDate.slice(8, 10)) - 1;
    case 'month-of-year':
      return monthIndex(isoDate);
    case 'quarter-of-year':
      return Math.floor(monthIndex(isoDate) / MONTHS_PER_QUARTER);
  }
};
