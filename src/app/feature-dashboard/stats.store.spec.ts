import { TestBed } from '@angular/core/testing';
import { RangeStore } from '@/core/stats';
import type { Transaction } from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
import { StatsStore } from './stats.store';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: 500,
  currency: 'EUR',
  rawDescription: 'Salary',
  fingerprint: 'fp',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('StatsStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('recomputes periodStats when transactions change, with no manual invalidation (FR-STAT-5)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setCustomRange('2026-01-01', '2026-12-31');

    const transactionsStore = TestBed.inject(TransactionsStore);
    const statsStore = TestBed.inject(StatsStore);

    expect(statsStore.periodStats().income).toBe(0);

    transactionsStore.addMany([transaction()]);

    expect(statsStore.periodStats().income).toBe(500);
  });

  it('dataReady mirrors TransactionsStore.hydrated (TICKET-PERF-05)', async () => {
    const transactionsStore = TestBed.inject(TransactionsStore);
    const statsStore = TestBed.inject(StatsStore);

    expect(statsStore.dataReady()).toBe(false);

    await transactionsStore.hydrate();

    expect(statsStore.dataReady()).toBe(true);
  });

  it('recomputes when the range changes', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const transactionsStore = TestBed.inject(TransactionsStore);
    const statsStore = TestBed.inject(StatsStore);

    transactionsStore.addMany([transaction({ bookingDate: '2026-06-15' })]);
    rangeStore.setCustomRange('2026-01-01', '2026-01-31');
    expect(statsStore.periodStats().income).toBe(0);

    rangeStore.setCustomRange('2026-06-01', '2026-06-30');
    expect(statsStore.periodStats().income).toBe(500);
  });

  it('recomputes weekdayWeekendSplit when transactions change', () => {
    const rangeStore = TestBed.inject(RangeStore);
    // 2026-07-10..18: Fri, Sat, Sun, Mon, Tue, Wed, Thu, Fri, Sat -> 6 weekdays, 3 weekend days.
    rangeStore.setCustomRange('2026-07-10', '2026-07-18');

    const transactionsStore = TestBed.inject(TransactionsStore);
    const statsStore = TestBed.inject(StatsStore);

    expect(statsStore.weekdayWeekendSplit()).toEqual({
      weekday: { total: 0, dayCount: 6, avgPerDay: 0 },
      weekend: { total: 0, dayCount: 3, avgPerDay: 0 },
    });

    transactionsStore.addMany([
      transaction({ id: 1, bookingDate: '2026-07-11', amount: -60 }), // Sat
    ]);

    expect(statsStore.weekdayWeekendSplit()).toEqual({
      weekday: { total: 0, dayCount: 6, avgPerDay: 0 },
      weekend: { total: 60, dayCount: 3, avgPerDay: 20 },
    });
  });
});
