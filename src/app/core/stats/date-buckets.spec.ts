import {
  bucketDateBoundaries,
  bucketKeyForDate,
  bucketKeysInRange,
  resolvePresetRange,
} from './date-buckets';

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
});

describe('resolvePresetRange', () => {
  it('resolves "this-month" relative to the given today', () => {
    expect(resolvePresetRange('this-month', '2026-07-15')).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('resolves "last-month" across a year boundary', () => {
    expect(resolvePresetRange('last-month', '2026-01-15')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('resolves "this-quarter"', () => {
    expect(resolvePresetRange('this-quarter', '2026-08-01')).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
    });
  });

  it('resolves "this-year"', () => {
    expect(resolvePresetRange('this-year', '2026-08-01')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('resolves "this-week" to its Monday-start ISO week', () => {
    // 2026-07-03 is a Friday, in ISO week 27 (Mon 2026-06-29 .. Sun 2026-07-05).
    expect(resolvePresetRange('this-week', '2026-07-03')).toEqual({
      from: '2026-06-29',
      to: '2026-07-05',
    });
  });

  it('resolves "last-31-days" as a 31-day span ending today', () => {
    expect(resolvePresetRange('last-31-days', '2026-07-15')).toEqual({
      from: '2026-06-15',
      to: '2026-07-15',
    });
  });

  it('resolves "last-quarter" across a year boundary', () => {
    expect(resolvePresetRange('last-quarter', '2026-01-15')).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    });
  });

  it('resolves "last-year"', () => {
    expect(resolvePresetRange('last-year', '2026-08-01')).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });

  it('resolves "last-365-days" as a 365-day span ending today', () => {
    expect(resolvePresetRange('last-365-days', '2026-07-15')).toEqual({
      from: '2025-07-16',
      to: '2026-07-15',
    });
  });

  it('resolves "year-to-date" from Jan 1 through today', () => {
    expect(resolvePresetRange('year-to-date', '2026-04-10')).toEqual({
      from: '2026-01-01',
      to: '2026-04-10',
    });
  });
});
