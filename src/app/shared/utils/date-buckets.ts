import { computed } from '@angular/core';
import { locale } from './format-settings';

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `YYYY-MM-DD` → a UTC `Date`. Exported alongside `formatIsoDate` and `MS_PER_DAY` because every
 * date-walking helper in the app needs exactly this trio, and each private copy is another chance
 * to drop the `Z` and pick up the local timezone — which is a whole-day error at either end of the
 * day, not a rounding one.
 */
export const parseIsoDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

export const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Monday-start ISO-8601 week number: the week containing the year's first Thursday is week 1. */
const isoWeekOf = (date: Date): { year: number; week: number } => {
  const target = new Date(date.getTime());
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return { year: target.getUTCFullYear(), week };
};

const isoWeekStart = (year: number, week: number): Date => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4DayNr * MS_PER_DAY);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * MS_PER_DAY);
};

/**
 * Bucket key formats (fixed across the app):
 *   day:     YYYY-MM-DD (e.g. 2026-07-03)
 *   week:    ISO-8601 week, YYYY-Www (e.g. 2026-W27), Monday-start
 *   month:   YYYY-MM (e.g. 2026-07)
 *   quarter: YYYY-Qn (e.g. 2026-Q3)
 *   year:    YYYY (e.g. 2026)
 */
export const bucketKeyForDate = (isoDate: string, granularity: Granularity): string => {
  const date = parseIsoDate(isoDate);

  switch (granularity) {
    case 'day':
      return isoDate;
    case 'week': {
      const { year, week } = isoWeekOf(date);
      return `${year}-W${pad(week)}`;
    }
    case 'month':
      return isoDate.slice(0, 7);
    case 'quarter': {
      const year = date.getUTCFullYear();
      const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
      return `${year}-Q${quarter}`;
    }
    case 'year':
      return `${date.getUTCFullYear()}`;
  }
};

/** Inclusive [start, end] ISO-date boundaries of the bucket identified by `bucketKey`. */
export const bucketDateBoundaries = (
  bucketKey: string,
  granularity: Granularity,
): { start: string; end: string } => {
  switch (granularity) {
    case 'day':
      return { start: bucketKey, end: bucketKey };
    case 'week': {
      const [yearPart, weekPart] = bucketKey.split('-W');
      const start = isoWeekStart(Number(yearPart), Number(weekPart));
      const end = new Date(start.getTime() + 6 * MS_PER_DAY);
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'month': {
      const [yearPart, monthPart] = bucketKey.split('-');
      const year = Number(yearPart);
      const month = Number(monthPart);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'quarter': {
      const [yearPart, quarterPart] = bucketKey.split('-Q');
      const year = Number(yearPart);
      const quarter = Number(quarterPart);
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 0));
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'year': {
      const year = Number(bucketKey);
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31));
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
  }
};

/** Ordered, gap-filled list of bucket keys spanning [from, to] inclusive (so empty buckets can render as zero). */
export const bucketKeysInRange = (from: string, to: string, granularity: Granularity): string[] => {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = parseIsoDate(from);
  const end = parseIsoDate(to);

  while (cursor.getTime() <= end.getTime()) {
    const key = bucketKeyForDate(formatIsoDate(cursor), granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return keys;
};

export type CalendarUnit = 'week' | 'month' | 'quarter' | 'year';

/**
 * Shifts a calendar-aligned `[from, to]` range back `count` whole `unit`s, recomputing that unit's
 * real boundaries at the target position rather than shifting by a fixed day-count — so a shifted
 * month is a full different-length month (e.g. 31-day March shifted to 28/29-day February), not
 * "30 days back" (TICKET-STAT-04). `count` may be negative to shift forward. Assumes `from`/`to`
 * are already that unit's true start/end (true of every calendar-aligned quick range, see
 * `quick-ranges.ts`); callers with an unaligned range should use a day-count shift instead.
 */
export const shiftRangeByCalendarUnit = (
  from: string,
  to: string,
  unit: CalendarUnit,
  count: number,
): { from: string; to: string } => {
  const start = parseIsoDate(from);
  const year = start.getUTCFullYear();

  switch (unit) {
    case 'week': {
      const shiftedStart = new Date(start.getTime() - count * 7 * MS_PER_DAY);
      const shiftedEnd = new Date(shiftedStart.getTime() + 6 * MS_PER_DAY);
      return { from: formatIsoDate(shiftedStart), to: formatIsoDate(shiftedEnd) };
    }
    case 'month': {
      const month = start.getUTCMonth();
      const shiftedStart = new Date(Date.UTC(year, month - count, 1));
      const shiftedEnd = new Date(Date.UTC(year, month - count + 1, 0));
      return { from: formatIsoDate(shiftedStart), to: formatIsoDate(shiftedEnd) };
    }
    case 'quarter': {
      const quarterStartMonth = start.getUTCMonth();
      const shiftedStart = new Date(Date.UTC(year, quarterStartMonth - count * 3, 1));
      const shiftedEnd = new Date(Date.UTC(year, quarterStartMonth - count * 3 + 3, 0));
      return { from: formatIsoDate(shiftedStart), to: formatIsoDate(shiftedEnd) };
    }
    case 'year': {
      const shiftedStart = new Date(Date.UTC(year - count, 0, 1));
      const shiftedEnd = new Date(Date.UTC(year - count, 11, 31));
      return { from: formatIsoDate(shiftedStart), to: formatIsoDate(shiftedEnd) };
    }
  }
};

/**
 * Shifts an unaligned `[from, to]` range back `count` whole spans of its own length (in days) — for
 * rolling-window quick ranges (`last-30-days`, `last-1-year`, ...) and hand-built ranges, which have
 * no calendar-unit alignment for `shiftRangeByCalendarUnit` to use. `count` may be negative to shift
 * forward, matching that function's sign convention.
 */
export const shiftRangeByDayCount = (
  from: string,
  to: string,
  count: number,
): { from: string; to: string } => {
  const spanDays =
    Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY) + 1;
  const shiftMs = count * spanDays * MS_PER_DAY;
  return {
    from: formatIsoDate(new Date(parseIsoDate(from).getTime() - shiftMs)),
    to: formatIsoDate(new Date(parseIsoDate(to).getTime() - shiftMs)),
  };
};

// `computed`, not a module-level constant — rebuilt (memoized here) whenever `locale` changes
// (TICKET-NG-10). Display-only: `.label` is only ever rendered as text (see
// `formatAlignedRangeLabel`'s callers), never re-parsed or compared as a bucketing key — the
// actual bucket identity (`.unit`, and `bucketKeyForDate` elsewhere in this file) is derived
// independently of this formatted string, so localizing it changes no behavior but the display.
const MONTH_NAME_FORMATTER = computed(
  () => new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }),
);

const isFullCalendarYear = (from: string, to: string): boolean => {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  return (
    start.getUTCMonth() === 0 &&
    start.getUTCDate() === 1 &&
    end.getUTCMonth() === 11 &&
    end.getUTCDate() === 31 &&
    start.getUTCFullYear() === end.getUTCFullYear()
  );
};

type CalendarAlignment = { unit: CalendarUnit; label: string };

/**
 * Detects whether `[from, to]` exactly matches a single calendar week/month/quarter/year —
 * reusing the same bucket boundaries `bucketKeyForDate`/`bucketDateBoundaries` already use for
 * chart bucketing, so "aligned" here means the identical definition of a bucket elsewhere in the
 * app. Returns `null` for any range that doesn't land exactly on one of these boundaries (a
 * custom/arbitrary span).
 */
const detectCalendarAlignment = (from: string, to: string): CalendarAlignment | null => {
  if (isFullCalendarYear(from, to)) {
    return { unit: 'year', label: `${parseIsoDate(from).getUTCFullYear()}` };
  }

  for (const granularity of ['quarter', 'month', 'week'] as const) {
    const key = bucketKeyForDate(from, granularity);
    const boundaries = bucketDateBoundaries(key, granularity);
    if (boundaries.start !== from || boundaries.end !== to) {
      continue;
    }

    const year = parseIsoDate(from).getUTCFullYear();
    switch (granularity) {
      case 'quarter':
        return { unit: 'quarter', label: `Q${key.split('-Q')[1]} ${year}` };
      case 'month':
        return {
          unit: 'month',
          label: `${MONTH_NAME_FORMATTER().format(parseIsoDate(from))} ${year}`,
        };
      case 'week':
        return { unit: 'week', label: `W${key.split('-W')[1]} ${year}` };
    }
  }

  return null;
};

/**
 * Compact label ("W27 2026", "July 2026", "Q3 2026", "2026") for a range that exactly matches a
 * calendar week/month/quarter/year, or `null` for an arbitrary span — the caller should fall back
 * to formatting the raw dates in that case.
 */
export const formatAlignedRangeLabel = (from: string, to: string): string | null =>
  detectCalendarAlignment(from, to)?.label ?? null;

/**
 * The `CalendarUnit` a range is aligned to, or `null` if it's an arbitrary/rolling span. Lets
 * prev/next navigation (TICKET-STAT-16) keep shifting by whole calendar units even after the
 * range's preset has flipped to `'custom'` — e.g. repeatedly stepping "previous" from a year-aligned
 * range should keep landing on real year boundaries, not drift by fixed day-counts across
 * leap years.
 */
export const alignedCalendarUnit = (from: string, to: string): CalendarUnit | null =>
  detectCalendarAlignment(from, to)?.unit ?? null;
