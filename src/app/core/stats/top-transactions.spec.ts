import type { Transaction } from '@/core/data-access';
import { computeTopTransactions, DEFAULT_TOP_TRANSACTIONS_LIMIT } from './top-transactions';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

describe('computeTopTransactions', () => {
  it('sorts by absolute amount descending', () => {
    const transactions = [
      transaction({ id: 1, amount: -30 }),
      transaction({ id: 2, amount: -800 }),
      transaction({ id: 3, amount: -100 }),
    ];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('breaks ties on equal absolute amount by booking date descending (most recent first)', () => {
    const transactions = [
      transaction({ id: 1, amount: -100, bookingDate: '2026-07-05' }),
      transaction({ id: 2, amount: -100, bookingDate: '2026-07-20' }),
      transaction({ id: 3, amount: -100, bookingDate: '2026-07-12' }),
    ];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('excludes income (positive amount) transactions', () => {
    const transactions = [
      transaction({ id: 1, amount: 2000 }),
      transaction({ id: 2, amount: -50 }),
    ];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result.map((t) => t.id)).toEqual([2]);
  });

  it('excludes a zero-amount transaction', () => {
    const transactions = [transaction({ id: 1, amount: 0 })];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result).toEqual([]);
  });

  it('excludes transfer-linked transactions', () => {
    const transactions = [transaction({ id: 1, amount: -500, transferId: 9 })];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result).toEqual([]);
  });

  it('excludes movements to an own savings account', () => {
    const transactions = [
      transaction({ id: 1, amount: -500, counterpartyIban: 'BE00SAVINGS' }),
      transaction({ id: 2, amount: -20, counterpartyIban: 'BE00SHOP' }),
    ];

    const result = computeTopTransactions(
      transactions,
      '2026-07-01',
      '2026-07-31',
      new Set(['BE00SAVINGS']),
    );

    expect(result.map((t) => t.id)).toEqual([2]);
  });

  it('excludes transactions outside the date range', () => {
    const transactions = [transaction({ id: 1, amount: -500, bookingDate: '2026-06-01' })];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result).toEqual([]);
  });

  it('defaults to the top 5 when no limit is given', () => {
    const transactions = Array.from({ length: 8 }, (_, i) =>
      transaction({ id: i + 1, amount: -(i + 1) * 10 }),
    );

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31');

    expect(result).toHaveLength(DEFAULT_TOP_TRANSACTIONS_LIMIT);
    expect(result.map((t) => t.id)).toEqual([8, 7, 6, 5, 4]);
  });

  it('respects a custom limit', () => {
    const transactions = [
      transaction({ id: 1, amount: -100 }),
      transaction({ id: 2, amount: -90 }),
      transaction({ id: 3, amount: -80 }),
    ];

    const result = computeTopTransactions(transactions, '2026-07-01', '2026-07-31', new Set(), 2);

    expect(result.map((t) => t.id)).toEqual([1, 2]);
  });
});
