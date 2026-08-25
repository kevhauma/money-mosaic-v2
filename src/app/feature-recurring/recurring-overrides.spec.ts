import type { RecurringOverride } from '@/core/data-access';
import type { RecurringPaymentSeries } from '@/core/stats';
import { anchorOf, applyRecurringOverrides, mergeCandidatePairs } from './recurring-overrides';

/**
 * A detected series, built by hand rather than run through the detector: these cases are about what
 * happens to a detection once the user corrects it, and going through `detectRecurringPayments`
 * would make every one of them a test of the detector too.
 */
const series = (
  key: string,
  transactionIds: number[],
  overrides: Partial<RecurringPaymentSeries> = {},
): RecurringPaymentSeries => {
  const occurrences = transactionIds.map((transactionId, index) => ({
    transactionId,
    date: `2026-0${index + 1}-05`,
    amount: 30,
  }));

  return {
    key,
    label: key.split('|')[0],
    categoryId: 7,
    cadence: 'monthly',
    occurrences,
    typicalAmount: 30,
    lastDate: occurrences[occurrences.length - 1].date,
    nextExpectedDate: '2026-05-05',
    monthlyEquivalent: 30,
    intervalDays: 30,
    flags: {},
    confidence: { level: 'high', reason: '' },
    ...overrides,
  };
};

const dismissal = (id: number, anchorTransactionId: number): RecurringOverride => ({
  id,
  kind: 'dismissed',
  anchorTransactionId,
  createdAt: '2026-08-24T00:00:00.000Z',
});

const merge = (
  id: number,
  anchorTransactionId: number,
  mergedIntoTransactionId: number,
): RecurringOverride => ({
  id,
  kind: 'merged',
  anchorTransactionId,
  mergedIntoTransactionId,
  createdAt: '2026-08-24T00:00:00.000Z',
});

describe('applyRecurringOverrides: dismissals (TICKET-REC-11)', () => {
  it('leaves an undismissed detection exactly as it was', () => {
    const detected = [series('a|30.00', [1, 2, 3])];

    const applied = applyRecurringOverrides(detected, []);

    expect(applied.series).toEqual(detected);
    expect(applied.dismissed).toEqual([]);
  });

  it('removes a dismissed detection from the list and keeps it for restoring', () => {
    const dismissed = series('a|30.00', [1, 2, 3]);
    const kept = series('b|30.00', [4, 5, 6]);

    const applied = applyRecurringOverrides([dismissed, kept], [dismissal(1, 1)]);

    expect(applied.series.map((entry) => entry.key)).toEqual(['b|30.00']);
    expect(applied.dismissed).toEqual([{ series: dismissed, overrideId: 1 }]);
  });

  it('stays dismissed when re-detection moves the series key', () => {
    // A price change moves the band median, so `key` becomes `a|42.00` — which is exactly why the
    // override anchors on a transaction id and not on the key.
    const repriced = series('a|42.00', [1, 2, 3, 9], { typicalAmount: 42 });

    const applied = applyRecurringOverrides([repriced], [dismissal(1, 1)]);

    expect(applied.series).toEqual([]);
    expect(applied.dismissed[0].series.key).toBe('a|42.00');
  });

  it('stays dismissed when older history arrives and moves the first occurrence', () => {
    // The anchor is transaction 1; an import of earlier payments prepends 90 and 91 to the series.
    const widened = series('a|30.00', [90, 91, 1, 2, 3]);

    const applied = applyRecurringOverrides([widened], [dismissal(1, 1)]);

    expect(applied.series).toEqual([]);
  });

  it('skips an override whose series no longer exists, rather than failing', () => {
    const detected = [series('a|30.00', [1, 2, 3])];

    const applied = applyRecurringOverrides(detected, [dismissal(1, 404)]);

    expect(applied.series).toEqual(detected);
    expect(applied.dismissed).toEqual([]);
  });
});

describe('applyRecurringOverrides: merges (TICKET-REC-11)', () => {
  it('folds the duplicate into the primary and lists one row', () => {
    const primary = series('fresh|73.15', [1, 2, 3], { typicalAmount: 73.15 });
    const duplicate = series('fresh|58.40', [4, 5, 6], { typicalAmount: 58.4 });

    const applied = applyRecurringOverrides([primary, duplicate], [merge(1, 4, 1)]);

    expect(applied.series).toHaveLength(1);
    expect(applied.series[0].key).toBe('fresh|73.15');
    expect(applied.series[0].occurrences.map((occurrence) => occurrence.transactionId)).toEqual([
      1, 4, 2, 5, 3, 6,
    ]);
  });

  it('stays merged when re-detection moves either key', () => {
    const primary = series('fresh|80.00', [1, 2, 3, 11], { typicalAmount: 80 });
    const duplicate = series('fresh|60.00', [4, 5, 6], { typicalAmount: 60 });

    const applied = applyRecurringOverrides([primary, duplicate], [merge(1, 4, 1)]);

    expect(applied.series).toHaveLength(1);
  });

  it('never resurrects a row the user has since dismissed', () => {
    const primary = series('fresh|73.15', [1, 2, 3]);
    const duplicate = series('fresh|58.40', [4, 5, 6]);

    const applied = applyRecurringOverrides(
      [primary, duplicate],
      [dismissal(1, 1), merge(2, 4, 1)],
    );

    // The primary was dismissed, so the merge has nothing to fold into and the duplicate stands
    // on its own rather than being silently absorbed into a hidden row.
    expect(applied.series.map((entry) => entry.key)).toEqual(['fresh|58.40']);
  });

  it('skips a merge whose other half is gone', () => {
    const detected = [series('a|30.00', [1, 2, 3])];

    const applied = applyRecurringOverrides(detected, [merge(1, 404, 1)]);

    expect(applied.series).toEqual(detected);
  });
});

describe('mergeCandidatePairs (TICKET-REC-11)', () => {
  it('offers two same-counterparty same-category detections', () => {
    const first = series('fresh|73.15', [1, 2, 3], { label: 'FreshMarket' });
    const second = series('fresh|58.40', [4, 5, 6], { label: 'FreshMarket' });

    const pairs = mergeCandidatePairs([first, second]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].primary.key).toBe('fresh|73.15');
    expect(pairs[0].duplicate.key).toBe('fresh|58.40');
  });

  it('leaves different counterparties alone', () => {
    const pairs = mergeCandidatePairs([
      series('a|30.00', [1, 2, 3], { label: 'FreshMarket' }),
      series('b|30.00', [4, 5, 6], { label: 'Netflix' }),
    ]);

    expect(pairs).toEqual([]);
  });

  it('leaves same-counterparty different-category detections alone', () => {
    const pairs = mergeCandidatePairs([
      series('a|30.00', [1, 2, 3], { label: 'FreshMarket', categoryId: 7 }),
      series('b|30.00', [4, 5, 6], { label: 'FreshMarket', categoryId: 9 }),
    ]);

    expect(pairs).toEqual([]);
  });

  it('does not offer a pair that already shares occurrences', () => {
    const pairs = mergeCandidatePairs([
      series('a|30.00', [1, 2, 3], { label: 'FreshMarket' }),
      series('b|30.00', [3, 4, 5], { label: 'FreshMarket' }),
    ]);

    expect(pairs).toEqual([]);
  });
});

describe('anchorOf (TICKET-REC-11)', () => {
  it('anchors on the earliest occurrence, which a later import cannot displace', () => {
    expect(anchorOf(series('a|30.00', [11, 22, 33]))).toBe(11);
  });
});
