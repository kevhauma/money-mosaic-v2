import type { RecurringPaymentSeries } from './recurring-payments';
import { projectRecurringOccurrences } from './recurring-projection';

const series = (overrides: Partial<RecurringPaymentSeries> = {}): RecurringPaymentSeries => ({
  key: 'iban:BE00|12.99',
  label: 'Streamly',
  categoryId: 1,
  cadence: 'monthly',
  occurrences: [],
  typicalAmount: 12.99,
  lastDate: '2026-07-11',
  nextExpectedDate: '2026-08-11',
  monthlyEquivalent: 12.99,
  ...overrides,
});

const AUGUST = { from: '2026-08-01', to: '2026-08-31' };

const datesOf = (entries: readonly RecurringPaymentSeries[], window = AUGUST): string[] =>
  projectRecurringOccurrences(entries, window.from, window.to).map((occurrence) => occurrence.date);

describe('projectRecurringOccurrences', () => {
  it('returns nothing for no series, and for an inverted window', () => {
    expect(projectRecurringOccurrences([], AUGUST.from, AUGUST.to)).toEqual([]);
    expect(projectRecurringOccurrences([series()], '2026-08-31', '2026-08-01')).toEqual([]);
  });

  it('lands a monthly series once in the month, carrying the series’ own facts', () => {
    const [occurrence] = projectRecurringOccurrences([series()], AUGUST.from, AUGUST.to);

    expect(occurrence).toEqual({
      seriesKey: 'iban:BE00|12.99',
      label: 'Streamly',
      categoryId: 1,
      date: '2026-08-11',
      amount: 12.99,
    });
  });

  it('lands a weekly series on every seventh day across the month', () => {
    const weekly = series({ cadence: 'weekly', nextExpectedDate: '2026-08-03' });

    expect(datesOf([weekly])).toEqual([
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ]);
  });

  it('lands a quarterly series only in the months its rhythm reaches', () => {
    const quarterly = series({ cadence: 'quarterly', nextExpectedDate: '2026-09-15' });

    expect(datesOf([quarterly])).toEqual([]); // August is not one of its months
    expect(datesOf([quarterly], { from: '2026-09-01', to: '2026-09-30' })).toEqual(['2026-09-15']);
    expect(datesOf([quarterly], { from: '2026-12-01', to: '2026-12-31' })).toEqual(['2026-12-15']);
  });

  it('lands a yearly series in one month of twelve', () => {
    const yearly = series({ cadence: 'yearly', nextExpectedDate: '2027-03-01' });

    expect(datesOf([yearly])).toEqual([]);
    expect(datesOf([yearly], { from: '2027-03-01', to: '2027-03-31' })).toEqual(['2027-03-01']);
    expect(datesOf([yearly], { from: '2028-03-01', to: '2028-03-31' })).toEqual(['2028-03-01']);
  });

  it('steps by the calendar, so a month-end bill neither drifts nor overflows a short month', () => {
    const monthEnd = series({ nextExpectedDate: '2026-01-31' });

    // February has no 31st: the step lands on its last day rather than spilling into March.
    expect(datesOf([monthEnd], { from: '2026-02-01', to: '2026-02-28' })).toEqual(['2026-02-28']);
    // And the clamp is not sticky — March gets its 31st back.
    expect(datesOf([monthEnd], { from: '2026-03-01', to: '2026-03-31' })).toEqual(['2026-03-31']);
  });

  it('projects backwards too, so the current month’s past days show what was expected', () => {
    // Anchored in the future, asked about a window that ends before it.
    const monthly = series({ nextExpectedDate: '2026-08-11' });

    expect(datesOf([monthly], { from: '2026-06-01', to: '2026-06-30' })).toEqual(['2026-06-11']);
    expect(datesOf([monthly], { from: '2026-08-01', to: '2026-08-31' })).toEqual(['2026-08-11']);
  });

  it('orders by date across series, breaking ties by label', () => {
    const occurrences = projectRecurringOccurrences(
      [
        series({ key: 'b', label: 'Zeta', nextExpectedDate: '2026-08-20' }),
        series({ key: 'c', label: 'Alpha', nextExpectedDate: '2026-08-20' }),
        series({ key: 'a', label: 'Middle', nextExpectedDate: '2026-08-05' }),
      ],
      AUGUST.from,
      AUGUST.to,
    );

    expect(occurrences.map(({ date, label }) => `${date} ${label}`)).toEqual([
      '2026-08-05 Middle',
      '2026-08-20 Alpha',
      '2026-08-20 Zeta',
    ]);
  });
});
