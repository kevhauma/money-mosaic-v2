import type { Account, Transaction } from '@/core/data-access';
import { buildDayTransactionIndex, dayMovementsFor } from './day-transactions';

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
  bookingDate: '2026-03-10',
  amount: -20,
  currency: 'EUR',
  rawDescription: 'CARD PAYMENT 1234',
  fingerprint: 'fp',
  createdAt: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

describe('buildDayTransactionIndex (TICKET-ACC-11)', () => {
  const checking = account({ id: 1, name: 'Checking' });
  const savings = account({ id: 2, name: 'Savings' });
  const credit = account({ id: 3, name: 'Credit line' });

  it('groups a day with movement on two accounts, keeping the per-account day totals', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: 2800, counterpartyName: 'Acme Payroll' }),
        transaction({ id: 2, accountId: 1, amount: -58.4, counterpartyName: 'FreshMarket' }),
        transaction({ id: 3, accountId: 2, amount: 500, counterpartyName: 'Transfer in' }),
      ],
      [checking, savings],
    );

    const movements = dayMovementsFor(index, '2026-03-10');

    expect(movements.map((m) => m.accountName)).toEqual(['Checking', 'Savings']);
    expect(movements[0].lines).toEqual([
      { label: 'Acme Payroll', amount: 2800 },
      { label: 'FreshMarket', amount: -58.4 },
    ]);
    expect(movements[0].net).toBeCloseTo(2741.6, 5);
    expect(movements[1].net).toBe(500);
  });

  it('lists only the account that moved when one of three did — not a column of zeroes', () => {
    const index = buildDayTransactionIndex(
      [transaction({ id: 1, accountId: 2, amount: 40 })],
      [checking, savings, credit],
    );

    const movements = dayMovementsFor(index, '2026-03-10');

    expect(movements).toHaveLength(1);
    expect(movements[0].accountName).toBe('Savings');
  });

  it('returns an empty list for a day nothing happened on, rather than undefined', () => {
    const index = buildDayTransactionIndex(
      [transaction({ bookingDate: '2026-03-10' })],
      [checking],
    );

    expect(dayMovementsFor(index, '2026-03-11')).toEqual([]);
    expect(index.has('2026-03-11')).toBe(false);
  });

  it('handles a single-account input as the same shape, not a special case', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: -20 }),
        // Another account's transaction is simply not in view.
        transaction({ id: 2, accountId: 2, amount: -999 }),
      ],
      [checking],
    );

    const movements = dayMovementsFor(index, '2026-03-10');

    expect(movements).toHaveLength(1);
    expect(movements[0].accountId).toBe(1);
    expect(movements[0].net).toBe(-20);
  });

  it("excludes an account that isn't in the list — the Accounts overview passes activeAccounts()", () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 1, amount: -20 }),
        transaction({ id: 2, accountId: 9, amount: -300 }),
      ],
      // What `activeAccounts()` yields — the archived account is absent from the stack, so it must
      // be absent from the tooltip explaining that stack.
      [checking],
    );

    expect(dayMovementsFor(index, '2026-03-10').map((m) => m.accountId)).toEqual([1]);
  });

  it("returns an archived account's own transactions when that account is the one passed in", () => {
    const archived = account({ id: 9, name: 'Old joint', archived: true });

    // The detail page renders for archived accounts too, and passes just that account.
    const index = buildDayTransactionIndex(
      [transaction({ id: 2, accountId: 9, amount: -300, counterpartyName: 'Final settlement' })],
      [archived],
    );

    const movements = dayMovementsFor(index, '2026-03-10');

    expect(movements).toHaveLength(1);
    expect(movements[0].accountName).toBe('Old joint');
    expect(movements[0].lines).toEqual([{ label: 'Final settlement', amount: -300 }]);
  });

  it('falls back to the raw description when the import captured no counterparty', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, rawDescription: 'CARD PAYMENT 1234' }),
        transaction({ id: 2, counterpartyName: '   ', rawDescription: 'SEPA DIRECT DEBIT' }),
      ],
      [checking],
    );

    expect(dayMovementsFor(index, '2026-03-10')[0].lines.map((line) => line.label)).toEqual([
      'CARD PAYMENT 1234',
      'SEPA DIRECT DEBIT',
    ]);
  });

  it('lists accounts in the order given, so the tooltip matches the chart’s stacking order', () => {
    const index = buildDayTransactionIndex(
      [
        transaction({ id: 1, accountId: 3, amount: -10 }),
        transaction({ id: 2, accountId: 1, amount: -10 }),
        transaction({ id: 3, accountId: 2, amount: -10 }),
      ],
      [checking, savings, credit],
    );

    expect(dayMovementsFor(index, '2026-03-10').map((m) => m.accountName)).toEqual([
      'Checking',
      'Savings',
      'Credit line',
    ]);
  });

  it('indexes the whole input once, so a hover is a Map lookup rather than an array scan', () => {
    const transactions = Array.from({ length: 500 }, (_, i) =>
      transaction({ id: i + 1, bookingDate: `2026-03-${String((i % 28) + 1).padStart(2, '0')}` }),
    );

    const index = buildDayTransactionIndex(transactions, [checking]);

    // One entry per distinct day present, built up front — not recomputed per lookup. Day 01 takes
    // every i where i % 28 === 0: 0, 28, … 476, i.e. 18 of the 500.
    expect(index.size).toBe(28);
    expect(dayMovementsFor(index, '2026-03-01')[0].lines).toHaveLength(18);
  });
});
