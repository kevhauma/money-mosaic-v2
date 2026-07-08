import type { Account, Transaction } from '@/core/data-access';
import { computeFullHistoryRange } from './full-history-range';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-01-15',
  amount: 100,
  currency: 'EUR',
  rawDescription: 'Deposit',
  fingerprint: 'fp',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('computeFullHistoryRange', () => {
  it('uses the opening-balance date when it is earlier than any transaction', () => {
    const range = computeFullHistoryRange(
      [account({ openingBalanceDate: '2025-06-01' })],
      [transaction({ bookingDate: '2025-07-01' })],
      '2026-07-08',
    );
    expect(range).toEqual({ from: '2025-06-01', to: '2026-07-08' });
  });

  it('uses the earliest transaction date when it precedes the opening-balance date', () => {
    const range = computeFullHistoryRange(
      [account({ openingBalanceDate: '2026-01-01' })],
      [transaction({ bookingDate: '2025-03-15' })],
      '2026-07-08',
    );
    expect(range).toEqual({ from: '2025-03-15', to: '2026-07-08' });
  });

  it('takes the earliest across multiple accounts and ignores transactions of unrelated accounts', () => {
    const range = computeFullHistoryRange(
      [
        account({ id: 1, openingBalanceDate: '2024-01-01' }),
        account({ id: 2, openingBalanceDate: '2023-01-01' }),
      ],
      [transaction({ accountId: 3, bookingDate: '2000-01-01' })],
      '2026-07-08',
    );
    expect(range).toEqual({ from: '2023-01-01', to: '2026-07-08' });
  });

  it('returns todayIso for both ends when given no accounts', () => {
    expect(computeFullHistoryRange([], [], '2026-07-08')).toEqual({
      from: '2026-07-08',
      to: '2026-07-08',
    });
  });
});
