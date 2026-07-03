export type Granularity = 'day' | 'week' | 'month' | 'quarter';

export type RangePreset = 'this-month' | 'last-month' | 'this-quarter' | 'this-year';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseIsoDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

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

/** Resolves a named preset to concrete [from, to] ISO dates, relative to `todayIso` (injected, not read from `Date.now()`, so it stays pure/testable). */
export const resolvePresetRange = (
  preset: RangePreset,
  todayIso: string,
): { from: string; to: string } => {
  const today = parseIsoDate(todayIso);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  switch (preset) {
    case 'this-month': {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0));
      return { from: formatIsoDate(start), to: formatIsoDate(end) };
    }
    case 'last-month': {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));
      return { from: formatIsoDate(start), to: formatIsoDate(end) };
    }
    case 'this-quarter': {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(Date.UTC(year, quarterStartMonth, 1));
      const end = new Date(Date.UTC(year, quarterStartMonth + 3, 0));
      return { from: formatIsoDate(start), to: formatIsoDate(end) };
    }
    case 'this-year': {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31));
      return { from: formatIsoDate(start), to: formatIsoDate(end) };
    }
  }
};
