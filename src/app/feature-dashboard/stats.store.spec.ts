import { TestBed } from '@angular/core/testing';
import { RangeStore } from '@/core/stats';
import type { Transaction } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
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
});
