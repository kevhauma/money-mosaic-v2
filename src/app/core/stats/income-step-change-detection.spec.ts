import type { CategorySeriesEntry } from './category-composition-trend';
import { SMOOTHED_BONUS_CATEGORY_ID } from './embedded-bonus-smoothing';
import type { IncomeCategorySeries } from './income-category-series';
import { detectIncomeStepChanges } from './income-step-change-detection';

/** `count` monthly bucket keys starting at `2025-01`. */
const bucketKeys = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const year = 2025 + Math.floor(index / 12);
    return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
  });

const entry = (values: number[], categoryId = 1): CategorySeriesEntry => ({
  categoryId,
  name: 'Salary',
  color: '#34d399',
  values,
});

const trendOf = (...entries: CategorySeriesEntry[]): IncomeCategorySeries => ({
  bucketKeys: bucketKeys(Math.max(...entries.map((e) => e.values.length))),
  series: entries,
});

const detect = (values: number[]) => detectIncomeStepChanges(trendOf(entry(values)), 'month');

/** `months` copies of `amount`. */
const flat = (amount: number, months: number): number[] =>
  Array.from({ length: months }, () => amount);

describe('detectIncomeStepChanges: a genuine sustained shift (FR-INC-8)', () => {
  it('flags a raise held for three months, with its direction and size', () => {
    const changes = detect([...flat(2500, 6), ...flat(2800, 4)]);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ categoryId: 1, direction: 'increase' });
    expect(changes[0].fromAvg).toBe(2500);
    expect(changes[0].toAvg).toBe(2800);
    expect(changes[0].pctChange).toBeCloseTo(0.12);
  });

  it('names the month the new level took effect, not the month it became detectable', () => {
    // Six months at 2500 (2025-01..2025-06), then 2800 from 2025-07.
    expect(detect([...flat(2500, 6), ...flat(2800, 4)])[0].changedAtBucketKey).toBe('2025-07');
  });

  it('flags a pay cut as a decrease', () => {
    const changes = detect([...flat(3000, 6), ...flat(2400, 3)]);

    expect(changes).toHaveLength(1);
    expect(changes[0].direction).toBe('decrease');
    expect(changes[0].pctChange).toBeCloseTo(-0.2);
  });

  it('reports a raise and a later pay cut as two separate changes', () => {
    const changes = detect([...flat(2000, 6), ...flat(2600, 6), ...flat(1900, 6)]);

    expect(changes.map((change) => change.direction)).toEqual(['increase', 'decrease']);
  });

  it('reports one raise once, not again for each month it bleeds into the before-window', () => {
    expect(detect([...flat(2000, 6), ...flat(2600, 12)])).toHaveLength(1);
  });

  it('keeps each category’s changes separate', () => {
    const changes = detectIncomeStepChanges(
      trendOf(entry([...flat(2000, 6), ...flat(2600, 3)], 1), entry(flat(500, 9), 2)),
      'month',
    );

    expect(changes.map((change) => change.categoryId)).toEqual([1]);
  });
});

describe('detectIncomeStepChanges: rejecting noise', () => {
  it('ignores a single unusually high month', () => {
    // The 3-month average clears the threshold, but only one of the three months moved.
    expect(detect([...flat(2000, 6), 6000, 2000, 2000, 2000])).toEqual([]);
  });

  it('ignores a single unusually low month', () => {
    expect(detect([...flat(2000, 6), 0, 2000, 2000, 2000])).toEqual([]);
  });

  it('ignores a move smaller than the ±10% threshold', () => {
    // 2000 → 2150 is +7.5%.
    expect(detect([...flat(2000, 6), ...flat(2150, 3)])).toEqual([]);
  });

  it('flags a move that sits exactly on the threshold', () => {
    // 2000 → 2200 is exactly +10%.
    expect(detect([...flat(2000, 6), ...flat(2200, 3)])).toHaveLength(1);
  });

  it('measures against a before-window with no spike of its own', () => {
    // Three months after the 6000 spike, the spike sits in the before-window and drags its average
    // to 3333 — against which a perfectly normal 2000 quarter reads as a 40% pay cut.
    expect(detect([...flat(2000, 6), 6000, ...flat(2000, 6)])).toEqual([]);
  });

  it('tolerates ordinary month-to-month variation in the baseline', () => {
    // Overtime makes a real salary wobble a few percent; that must not disqualify the baseline.
    expect(detect([2400, 2500, 2600, 2450, 2550, 2500, ...flat(3000, 3)])).toHaveLength(1);
  });

  it('never flags a perfectly flat category', () => {
    expect(detect(flat(2500, 24))).toEqual([]);
  });

  it('leaves an annual lump sum alone once it has been smoothed (FR-INC-4)', () => {
    // What FR-INC-4 hands over: a flat 500/mo baseline with a 2000 bonus already spread over its
    // twelve months, so nothing steps at all.
    const smoothedBonus = flat(500 + 2000 / 12, 24);

    expect(detect(smoothedBonus)).toEqual([]);
  });

  it('is doubly safe on an unsmoothed bonus: a lone spike clears neither window rule', () => {
    // Smoothing is still the right input (AC 1) — but a bonus the user *hasn't* flagged is caught
    // by the same rules that reject any one-off month, so it can't slip through as a raise either.
    expect(detect([...flat(500, 6), 2500, ...flat(500, 6)])).toEqual([]);
  });
});

describe('detectIncomeStepChanges: eligibility', () => {
  it('never flags a category with less than six months of history', () => {
    expect(detect([...flat(2000, 2), ...flat(3000, 3)])).toEqual([]);
  });

  it('flags once the category reaches six months', () => {
    expect(detect([...flat(2000, 3), ...flat(3000, 3)])).toHaveLength(1);
  });

  it('counts history from the category’s first payment, not the start of the chart', () => {
    // Four leading zero months (the category didn't exist yet), then only five real ones.
    expect(detect([...flat(0, 4), ...flat(2000, 3), ...flat(3000, 2)])).toEqual([]);
  });

  it('never reads a category’s first payment as a raise from zero', () => {
    const changes = detect([...flat(0, 6), ...flat(2000, 6)]);

    expect(changes.every((change) => change.fromAvg !== 0)).toBe(true);
    expect(changes).toEqual([]);
  });

  it('ignores an uncategorised series, which has no category to attribute a raise to', () => {
    const uncategorised = trendOf({
      ...entry([...flat(2000, 6), ...flat(3000, 3)]),
      categoryId: null,
    });

    expect(detectIncomeStepChanges(uncategorised, 'month')).toEqual([]);
  });

  it('ignores the redistributed-bonus band, while still flagging a real raise beside it', () => {
    // TICKET-INC-20's synthetic series is flat within a year, so a bonus that doubles from one
    // year to the next steps at every January — exactly the phantom raise FR-INC-8 avoids.
    const withBonusBand = trendOf(entry([...flat(2000, 12), ...flat(2000, 6), ...flat(2600, 6)]), {
      ...entry([...flat(2000 / 12, 12), ...flat(4000 / 12, 12)]),
      categoryId: SMOOTHED_BONUS_CATEGORY_ID,
      name: 'Bonus (spread over the year)',
    });

    const changes = detectIncomeStepChanges(withBonusBand, 'month');

    expect(changes.some((change) => change.categoryId === SMOOTHED_BONUS_CATEGORY_ID)).toBe(false);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ categoryId: 1, changedAtBucketKey: '2026-07' });
  });
});

describe('detectIncomeStepChanges: monthly granularity only', () => {
  const stepped = [...flat(2000, 6), ...flat(2600, 3)];

  it.each(['day', 'week', 'quarter', 'year'] as const)(
    'returns nothing at %s granularity rather than misapplying the 3-month window',
    (granularity) => {
      expect(detectIncomeStepChanges(trendOf(entry(stepped)), granularity)).toEqual([]);
    },
  );

  it('still detects at month granularity, so the guard above is not just always-empty', () => {
    expect(detectIncomeStepChanges(trendOf(entry(stepped)), 'month')).toHaveLength(1);
  });
});
