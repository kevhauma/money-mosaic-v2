import type { CategorySeriesEntry } from './category-composition-trend';
import { detectIncomeGaps } from './income-gap-detection';
import type { IncomeCategorySeries } from './income-category-series';

/** `count` monthly bucket keys starting at `2025-01`. */
const bucketKeys = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const year = 2025 + Math.floor(index / 12);
    return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
  });

const entry = (values: number[], categoryId = 1): CategorySeriesEntry => ({
  categoryId,
  name: 'Other Income',
  color: '#34d399',
  values,
});

const trendOf = (...entries: CategorySeriesEntry[]): IncomeCategorySeries => ({
  bucketKeys: bucketKeys(Math.max(...entries.map((e) => e.values.length))),
  series: entries,
});

/**
 * Runs the detector over `values`, treating the **last** bucket as the newest complete month — the
 * caller's `lastCompleteBucketKey()` in production.
 */
const detect = (values: number[]) => {
  const trend = trendOf(entry(values));
  return detectIncomeGaps(trend, 'month', trend.bucketKeys[values.length - 1]);
};

/** `months` copies of `amount`. */
const flat = (amount: number, months: number): number[] =>
  Array.from({ length: months }, () => amount);

describe('detectIncomeGaps: a recurring stream that stopped (FR-INC-9)', () => {
  it('flags a monthly category that has been silent for two months', () => {
    // Ten paid months (2025-01..2025-10), then nothing in November or December.
    const gaps = detect([...flat(300, 10), 0, 0]);

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toEqual({
      categoryId: 1,
      lastSeenBucketKey: '2025-10',
      monthsMissing: 2,
    });
  });

  it('counts every silent month, not just the two that triggered it', () => {
    expect(detect([...flat(300, 8), ...flat(0, 5)])[0].monthsMissing).toBe(5);
  });

  it('flags a category present in ~90% of its months, not only a perfect one', () => {
    // One missed month early on still leaves the cadence well above the 75% bar.
    const gaps = detect([300, 300, 0, 300, 300, 300, 300, 300, 300, 300, 0, 0]);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].lastSeenBucketKey).toBe('2025-10');
  });

  it('keeps each category’s verdict separate', () => {
    const gaps = detectIncomeGaps(
      trendOf(entry([...flat(300, 10), 0, 0], 1), entry(flat(2000, 12), 2)),
      'month',
      '2025-12',
    );

    expect(gaps.map((gap) => gap.categoryId)).toEqual([1]);
  });
});

describe('detectIncomeGaps: not every silence is a lost stream', () => {
  it('never flags a category that is still arriving', () => {
    expect(detect(flat(2000, 12))).toEqual([]);
  });

  it('never flags on a single quiet month — that is a late payment, not a lost stream', () => {
    expect(detect([...flat(300, 11), 0])).toEqual([]);
  });

  it('never flags an inherently irregular category', () => {
    // Paid in 5 of the first 9 months (~44%), then quiet — below the 75% recurring bar.
    const irregular = [300, 0, 300, 0, 300, 0, 300, 0, 300, 0, 0, 0];

    expect(detect(irregular)).toEqual([]);
  });

  it('excludes the trailing months from the cadence, so the gap cannot hide itself', () => {
    // 9 paid months then 3 silent ones: counting the silence would drop the cadence to 75% exactly
    // and, with one more silent month, below the bar — the very stream that stopped.
    expect(detect([...flat(300, 9), 0, 0, 0])).toHaveLength(1);
  });
});

describe('detectIncomeGaps: eligibility', () => {
  it('never evaluates a category with under six months of history', () => {
    expect(detect([...flat(300, 3), 0, 0])).toEqual([]);
  });

  it('counts history from the category’s first payment, not the start of the chart', () => {
    // Eight leading zero months (it didn't exist yet), then three paid ones and two silent — five
    // months of its own history, which is too little to call a cadence even though the chart is
    // thirteen months long.
    expect(detect([...flat(0, 8), ...flat(300, 3), 0, 0])).toEqual([]);
  });

  it('ignores an uncategorised series, which has no category to warn about', () => {
    const uncategorised = trendOf({ ...entry([...flat(300, 10), 0, 0]), categoryId: null });

    expect(detectIncomeGaps(uncategorised, 'month', '2025-12')).toEqual([]);
  });
});

describe('detectIncomeGaps: the in-progress month is not evidence', () => {
  it('ignores buckets past the newest complete month', () => {
    // 2025-12 is in progress, and the salary lands on the 25th — so it reads as zero for most of
    // the month. Judged through 2025-11, nothing is wrong.
    const trend = trendOf(entry([...flat(2000, 11), 0]));

    expect(detectIncomeGaps(trend, 'month', '2025-11')).toEqual([]);
  });

  it('flags the same history once the silent month is complete', () => {
    const trend = trendOf(entry([...flat(2000, 10), 0, 0]));

    expect(detectIncomeGaps(trend, 'month', '2025-12')).toHaveLength(1);
  });

  it('returns nothing when there is no complete month to judge from', () => {
    expect(detectIncomeGaps(trendOf(entry([...flat(300, 10), 0, 0])), 'month', undefined)).toEqual(
      [],
    );
  });

  it('returns nothing when the given bucket key is not in the series', () => {
    expect(detectIncomeGaps(trendOf(entry([...flat(300, 10), 0, 0])), 'month', '2030-01')).toEqual(
      [],
    );
  });
});

describe('detectIncomeGaps: monthly granularity only', () => {
  const stopped = [...flat(300, 10), 0, 0];

  it.each(['day', 'week', 'quarter', 'year'] as const)(
    'returns nothing at %s granularity, where the constants would not mean the same thing',
    (granularity) => {
      expect(detectIncomeGaps(trendOf(entry(stopped)), granularity, '2025-12')).toEqual([]);
    },
  );

  it('still detects at month granularity, so the guard above is not just always-empty', () => {
    expect(detectIncomeGaps(trendOf(entry(stopped)), 'month', '2025-12')).toHaveLength(1);
  });
});
