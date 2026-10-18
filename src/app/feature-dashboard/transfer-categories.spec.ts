import type { Account, Transaction } from '@/core/data-access';
import { UNCATEGORISED_SENTINEL } from '@/shared/utils';
import {
  drilldownCategoryId,
  transferCategories,
  withTransferCategories,
} from './transfer-categories';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Shop',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('transfer categories', () => {
  const accounts = [
    account({ id: 1 }),
    account({ id: 2, name: 'Savings', type: 'savings', iban: 'BE22', color: '#22aa22' }),
  ];
  const context = {
    transfersById: new Map(),
    transactionsById: new Map(),
    accounts,
    ownSavingsIbans: new Set(['BE22']),
  };

  it("names one slice per account after it, in that account's colour", () => {
    expect(transferCategories(accounts)).toEqual([
      expect.objectContaining({ name: 'Transfer · Checking', color: '#3366ff' }),
      expect.objectContaining({ name: 'Transfer · Savings', color: '#22aa22' }),
    ]);
  });

  it("re-categorises a move to another account to that account's slice, and leaves any other row as it was", () => {
    const groceries = transaction({ id: 1, categoryId: 4 });
    const toSavings = transaction({ id: 2, categoryId: 4, counterpartyIban: 'BE22' });

    const [unchanged, moved] = withTransferCategories([groceries, toSavings], context);
    const savingsSlice = transferCategories(accounts)[1];

    expect(unchanged).toBe(groceries);
    expect(moved.categoryId).toBe(savingsSlice.id);
  });

  it('drills a transfer slice into the page scope alone, and every other key as before', () => {
    const [checkingSlice] = transferCategories(accounts);

    expect(drilldownCategoryId(checkingSlice.id)).toBeUndefined();
    expect(drilldownCategoryId(null)).toBe(UNCATEGORISED_SENTINEL);
    expect(drilldownCategoryId(4)).toBe(4);
  });
});
