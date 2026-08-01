import type { SalaryMetadata } from '@/core/data-access';

/** One editable month in the salary-metadata table. */
export type SalaryMetadataRow = {
  /** `YYYY-MM`. */
  yearMonth: string;
  /** "July 2025" — the full month *and* year, so a row read out of context still says which month it is. */
  label: string;
  grossWage: number | null;
  bonus: number | null;
};

export type SalaryMetadataYearSection = {
  year: string;
  rows: SalaryMetadataRow[];
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2025-07" → "July 2025". Month names are structural labels here, not formatted dates, so they don't route through `formatDate`. */
export const monthLabel = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

/**
 * Turns the income page's months into editable rows, newest year first (TICKET-INC-10).
 *
 * **Every month in range gets a row**, whether or not it has a stored entry — a blank row is the
 * normal state for most months, and typing into one is what creates the entry. Driving the table
 * off the stored rows instead would mean a user could never fill in a month retroactively without
 * some separate "add" affordance.
 */
export const buildSalaryMetadataSections = (
  bucketKeys: string[],
  byMonth: ReadonlyMap<string, SalaryMetadata>,
): SalaryMetadataYearSection[] => {
  const byYear = new Map<string, SalaryMetadataRow[]>();
  for (const yearMonth of bucketKeys) {
    const year = yearMonth.slice(0, 4);
    const entry = byMonth.get(yearMonth);
    const rows = byYear.get(year) ?? [];
    rows.push({
      yearMonth,
      label: monthLabel(yearMonth),
      grossWage: entry?.grossWage ?? null,
      bonus: entry?.bonus ?? null,
    });
    byYear.set(year, rows);
  }

  // Newest year first: the month a user came to fill in is almost always a recent one.
  return [...byYear.entries()]
    .map(([year, rows]) => ({ year, rows }))
    .sort((a, b) => b.year.localeCompare(a.year));
};
