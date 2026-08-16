import {
  alignedCalendarUnit,
  bucketDateBoundaries,
  bucketKeyForDate,
  bucketKeysInRange,
  formatAlignedRangeLabel,
  shiftRangeByDayCount,
} from './date-buckets';
import { DEFAULT_LOCALE, syncFormatSettings } from './format-settings';
import { withCleanFormatSettings } from './format-settings.testing';

describe('bucketKeyForDate', () => {
  it('formats a day bucket as the ISO date itself', () => {
    expect(bucketKeyForDate('2026-07-03', 'day')).toBe('2026-07-03');
  });

  it('formats a month bucket as YYYY-MM', () => {
    expect(bucketKeyForDate('2026-07-03', 'month')).toBe('2026-07');
  });

  it('formats a quarter bucket as YYYY-Qn', () => {
    expect(bucketKeyForDate('2026-01-01', 'quarter')).toBe('2026-Q1');
    expect(bucketKeyForDate('2026-04-01', 'quarter')).toBe('2026-Q2');
    expect(bucketKeyForDate('2026-07-01', 'quarter')).toBe('2026-Q3');
    expect(bucketKeyForDate('2026-12-31', 'quarter')).toBe('2026-Q4');
  });

  it('formats a week bucket as ISO-8601 YYYY-Www', () => {
    // 2026-07-03 is a Friday, in ISO week 27 of 2026.
    expect(bucketKeyForDate('2026-07-03', 'week')).toBe('2026-W27');
  });

  it("handles the ISO-week year-boundary case where late-December dates belong to next year's week 1", () => {
    // 2025-12-31 is a Wednesday; ISO week containing it is week 1 of 2026 (Thursday, Jan 1 2026, falls in it).
    expect(bucketKeyForDate('2025-12-31', 'week')).toBe('2026-W01');
  });

  it("handles the ISO-week case where early-January dates still belong to the previous year's last week", () => {
    // 2027-01-01 is a Friday; the Thursday of that week (Dec 31 2026) falls in 2026, so it's week 53 of 2026.
    expect(bucketKeyForDate('2027-01-01', 'week')).toBe('2026-W53');
  });

  it('formats a year bucket as YYYY', () => {
    expect(bucketKeyForDate('2026-07-03', 'year')).toBe('2026');
  });
});

describe('bucketDateBoundaries', () => {
  it('round-trips a day bucket', () => {
    expect(bucketDateBoundaries('2026-07-03', 'day')).toEqual({
      start: '2026-07-03',
      end: '2026-07-03',
    });
  });

  it('round-trips a month bucket to its first/last day', () => {
    expect(bucketDateBoundaries('2026-02', 'month')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('handles a leap-year February', () => {
    expect(bucketDateBoundaries('2028-02', 'month')).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    });
  });

  it('round-trips a quarter bucket', () => {
    expect(bucketDateBoundaries('2026-Q3', 'quarter')).toEqual({
      start: '2026-07-01',
      end: '2026-09-30',
    });
  });

  it('round-trips a week bucket to Monday..Sunday', () => {
    expect(bucketDateBoundaries('2026-W27', 'week')).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    });
  });

  it('round-trips a year bucket to Jan 1..Dec 31', () => {
    expect(bucketDateBoundaries('2026', 'year')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });
});

describe('bucketKeysInRange', () => {
  it('returns a single key for a range within one month bucket', () => {
    expect(bucketKeysInRange('2026-07-01', '2026-07-31', 'month')).toEqual(['2026-07']);
  });

  it('fills gaps so every month in the range appears even with no data', () => {
    expect(bucketKeysInRange('2026-01-15', '2026-03-15', 'month')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('handles a single-day range', () => {
    expect(bucketKeysInRange('2026-07-03', '2026-07-03', 'day')).toEqual(['2026-07-03']);
  });

  it('spans a full year grouped by quarter', () => {
    expect(bucketKeysInRange('2026-01-01', '2026-12-31', 'quarter')).toEqual([
      '2026-Q1',
      '2026-Q2',
      '2026-Q3',
      '2026-Q4',
    ]);
  });

  it('fills gaps so every year in the range appears even with no data', () => {
    expect(bucketKeysInRange('2024-06-01', '2026-03-01', 'year')).toEqual(['2024', '2025', '2026']);
  });
});

describe('shiftRangeByDayCount', () => {
  it('shifts a range backward by its own span length (positive count)', () => {
    expect(shiftRangeByDayCount('2026-06-15', '2026-07-15', 1)).toEqual({
      from: '2026-05-15',
      to: '2026-06-14',
    });
  });

  it('shifts a range forward by its own span length (negative count)', () => {
    expect(shiftRangeByDayCount('2026-06-15', '2026-07-15', -1)).toEqual({
      from: '2026-07-16',
      to: '2026-08-15',
    });
  });

  it('preserves the span length across the shift', () => {
    const shifted = shiftRangeByDayCount('2026-06-15', '2026-07-15', 1);
    const originalSpanDays =
      (Date.parse('2026-07-15') - Date.parse('2026-06-15')) / (24 * 60 * 60 * 1000);
    const shiftedSpanDays =
      (Date.parse(shifted.to) - Date.parse(shifted.from)) / (24 * 60 * 60 * 1000);
    expect(shiftedSpanDays).toBe(originalSpanDays);
  });
});

describe('formatAlignedRangeLabel', () => {
  withCleanFormatSettings();

  it('formats a range matching a full ISO week as "W<week> <year>"', () => {
    // Mon 2026-06-29 .. Sun 2026-07-05 is ISO week 27 of 2026 (see bucketKeyForDate tests above).
    expect(formatAlignedRangeLabel('2026-06-29', '2026-07-05')).toBe('W27 2026');
  });

  it('formats a range matching a full calendar month as "<Month> <year>"', () => {
    expect(formatAlignedRangeLabel('2026-07-01', '2026-07-31')).toBe('July 2026');
  });

  it('formats a range matching a full calendar quarter as "Q<n> <year>"', () => {
    expect(formatAlignedRangeLabel('2026-07-01', '2026-09-30')).toBe('Q3 2026');
  });

  it('formats a range matching a full calendar year as "<year>"', () => {
    expect(formatAlignedRangeLabel('2026-01-01', '2026-12-31')).toBe('2026');
  });

  it('returns null for an arbitrary range matching no calendar boundary', () => {
    expect(formatAlignedRangeLabel('2026-07-05', '2026-07-20')).toBeNull();
  });

  it('handles a non-leap-year February with its shorter length', () => {
    expect(formatAlignedRangeLabel('2026-02-01', '2026-02-28')).toBe('February 2026');
  });

  it('renders the month name in the current locale (TICKET-NG-10)', () => {
    syncFormatSettings({ locale: 'fr-FR' });
    expect(formatAlignedRangeLabel('2026-07-01', '2026-07-31')).toBe('juillet 2026');
  });

  it('rebuilds the month-name formatter once the locale changes back', () => {
    syncFormatSettings({ locale: 'fr-FR' });
    expect(formatAlignedRangeLabel('2026-07-01', '2026-07-31')).toBe('juillet 2026');

    syncFormatSettings({ locale: DEFAULT_LOCALE });
    expect(formatAlignedRangeLabel('2026-07-01', '2026-07-31')).toBe('July 2026');
  });
});

describe('alignedCalendarUnit', () => {
  it.each([
    ['2026-06-29', '2026-07-05', 'week'],
    ['2026-07-01', '2026-07-31', 'month'],
    ['2026-07-01', '2026-09-30', 'quarter'],
    ['2026-01-01', '2026-12-31', 'year'],
  ] as const)('returns "%s" for the matching span', (from, to, expectedUnit) => {
    expect(alignedCalendarUnit(from, to)).toBe(expectedUnit);
  });

  it('returns null for an arbitrary range matching no calendar boundary', () => {
    expect(alignedCalendarUnit('2026-07-05', '2026-07-20')).toBeNull();
  });
});
