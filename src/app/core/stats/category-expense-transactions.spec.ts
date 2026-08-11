import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown } from './category-breakdown';
import { computeCategoryExpenseTransactions } from './category-expense-transactions';

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
  icon: 'cart',
  archived: false,
  isSystem: false,
};

const salary: Category = { ...groceries, id: 2, name: 'Salary', kind: 'income' };

const categoriesById = new Map([groceries, salary].map((one) => [one.id!, one]));

const checking: Account = {
  id: 1,
  name: 'Main account',
  type: 'checking',
  iban: 'NL01BANK0000000001',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#111111',
  icon: 'wallet',
  archived: false,
};

const savings: Account = { ...checking, id: 2, type: 'savings', iban: 'NL02BANK0000000002' };

const accountsById = new Map([checking, savings].map((one) => [one.id!, one]));

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-10',
  amount: -10,
  currency: 'EUR',
  rawDescription: 'Something',
  fingerprint: 'fp',
  createdAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

const run = (transactions: Transaction[]) =>
  computeCategoryExpenseTransactions(
    transactions,
    categoriesById,
    '2026-07-01',
    '2026-07-31',
    new Set(['NL02BANK0000000002']),
    accountsById,
  );

describe('computeCategoryExpenseTransactions (TICKET-EXP-08)', () => {
  it('groups a range payments by category, heaviest first, named by counterparty', () => {
    const result = run([
      transaction({ id: 1, amount: -12.5, categoryId: 1, counterpartyName: '  Corner shop  ' }),
      transaction({ id: 2, amount: -40, categoryId: 1, rawDescription: 'SUPERMARKET 4451' }),
      transaction({ id: 3, amount: -8, counterpartyName: 'Unknown shop' }),
    ]);

    expect(result.get(1)?.transactions).toEqual([
      { transactionId: 2, name: 'SUPERMARKET 4451', value: 40, date: '2026-07-10' },
      { transactionId: 1, name: 'Corner shop', value: 12.5, date: '2026-07-10' },
    ]);
    // An uncategorised payment keys on `null`, the same bucket `CategoryBreakdownEntry` uses.
    expect(result.get(null)?.transactions).toHaveLength(1);
  });

  it('inherits every exclusion from classifyForStats rather than repeating them', () => {
    const result = run([
      transaction({ id: 1, bookingDate: '2026-06-30', amount: -50, categoryId: 1 }),
      transaction({ id: 2, amount: -50, categoryId: 1, nullified: true }),
      transaction({ id: 3, amount: -50, categoryId: 1, transferId: 7 }),
      transaction({ id: 4, amount: -50, counterpartyIban: savings.iban }),
      transaction({ id: 5, amount: 2000, categoryId: salary.id }),
      transaction({ id: 6, amount: 0, categoryId: 1 }),
      transaction({ id: 7, amount: -25, categoryId: 1 }),
    ]);

    // Out of range, nullified, a linked transfer leg, a savings movement, income and a zero amount
    // all drop out — only the one real payment survives.
    expect([...result.values()].flatMap((entry) => entry.transactions)).toEqual([
      { transactionId: 7, name: 'Something', value: 25, date: '2026-07-10' },
    ]);
  });

  it('counts a refund as money back rather than as a tile with negative area', () => {
    const result = run([
      transaction({ id: 1, amount: -100, categoryId: 1 }),
      transaction({ id: 2, amount: 30, categoryId: 1 }),
    ]);

    expect(result.get(1)?.transactions.map((one) => one.value)).toEqual([100]);
    expect(result.get(1)?.refunded).toBe(30);
  });

  it('adds up to what the breakdown says, minus what came back', () => {
    const transactions = [
      transaction({ id: 1, amount: -100, categoryId: 1 }),
      transaction({ id: 2, amount: -60.55, categoryId: 1 }),
      transaction({ id: 3, amount: 30, categoryId: 1 }),
      transaction({ id: 4, amount: -5.5 }),
    ];
    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(['NL02BANK0000000002']),
      accountsById,
    );
    const result = run(transactions);

    for (const entry of expenseByCategory) {
      const payments = result.get(entry.categoryId)!;
      const paid = payments.transactions.reduce((sum, one) => sum + one.value, 0);
      expect(paid - payments.refunded).toBeCloseTo(entry.total, 10);
    }
  });
});
