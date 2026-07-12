import type { Transaction } from '@/core/data-access';
import { computeWeekdayWeekendSplit } from './weekday-weekend-split';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-10',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

describe('computeWeekdayWeekendSplit', () => {
  // 2026-07-10..18: Fri, Sat, Sun, Mon, Tue, Wed, Thu, Fri, Sat -> 6 weekdays, 3 weekend days.
  const FROM = '2026-07-10';
  const TO = '2026-07-18';

  it('classifies Sat/Sun as weekend across a range starting/ending mid-week, with correct totals and per-day averages', () => {
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-10', amount: -60 }), // Fri (weekday)
      transaction({ id: 2, bookingDate: '2026-07-14', amount: -30 }), // Tue (weekday)
      transaction({ id: 3, bookingDate: '2026-07-11', amount: -45 }), // Sat (weekend)
      transaction({ id: 4, bookingDate: '2026-07-12', amount: -15 }), // Sun (weekend)
    ];

    expect(computeWeekdayWeekendSplit(transactions, FROM, TO)).toEqual({
      weekday: { total: 90, dayCount: 6, avgPerDay: 15 },
      weekend: { total: 60, dayCount: 3, avgPerDay: 20 },
    });
  });

  it('counts calendar days regardless of transaction presence, so a quiet day still lowers the average', () => {
    const transactions = [transaction({ id: 1, bookingDate: '2026-07-10', amount: -60 })]; // one weekday spend, no weekend spend

    const result = computeWeekdayWeekendSplit(transactions, FROM, TO);

    expect(result?.weekday.dayCount).toBe(6);
    expect(result?.weekday.avgPerDay).toBe(10); // 60 / 6, not 60 / 1
    expect(result?.weekend.dayCount).toBe(3);
    expect(result?.weekend.total).toBe(0);
    expect(result?.weekend.avgPerDay).toBe(0);
  });

  it('excludes transfers and savings movements using the same predicates as computePeriodStats', () => {
    const SAVINGS_IBAN = 'BE00SAVINGS';
    const ownSavings = new Set([SAVINGS_IBAN]);
    const transactions = [
      transaction({ id: 1, bookingDate: '2026-07-10', amount: -60 }), // Fri, counted
      transaction({ id: 2, bookingDate: '2026-07-14', amount: -500, transferId: 1 }), // linked transfer, excluded
      transaction({
        id: 3,
        bookingDate: '2026-07-11',
        amount: -300,
        counterpartyIban: SAVINGS_IBAN,
      }), // savings movement, excluded
    ];

    expect(computeWeekdayWeekendSplit(transactions, FROM, TO, ownSavings)).toEqual({
      weekday: { total: 60, dayCount: 6, avgPerDay: 10 },
      weekend: { total: 0, dayCount: 3, avgPerDay: 0 },
    });
  });

  it('returns null for a range shorter than 2 calendar days', () => {
    expect(computeWeekdayWeekendSplit([], '2026-07-10', '2026-07-10')).toBeNull();
  });
});
