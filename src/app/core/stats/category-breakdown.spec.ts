import type { Account, Category, Transaction } from '@/core/data-access';
import { computeCategoryBreakdown } from './category-breakdown';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#000000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

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

describe('computeCategoryBreakdown', () => {
  it('splits expense and income totals by category kind with share-of-total summing to 1', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
      [2, category({ id: 2, name: 'Rent', kind: 'expense' })],
      [3, category({ id: 3, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -60, categoryId: 1 }),
      transaction({ id: 2, amount: -40, categoryId: 2 }),
      transaction({ id: 3, amount: 2000, categoryId: 3 }),
    ];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 60, share: 0.6, transactionCount: 1 },
      { categoryId: 2, total: 40, share: 0.4, transactionCount: 1 },
    ]);
    expect(incomeBySource).toEqual([{ categoryId: 3, total: 2000, share: 1, transactionCount: 1 }]);
  });

  it('buckets uncategorised transactions by amount sign into their own entry', () => {
    const categoriesById = new Map<number, Category>();
    const transactions = [transaction({ id: 1, amount: -30 }), transaction({ id: 2, amount: 500 })];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: null, total: 30, share: 1, transactionCount: 1 },
    ]);
    expect(incomeBySource).toEqual([
      { categoryId: null, total: 500, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes movements to a savings account so they never surface as an uncategorised expense (TICKET-TRF-02)', () => {
    const categoriesById = new Map<number, Category>();
    const transactions = [
      // Uncategorised movement to an own savings account — must NOT appear as an expense entry.
      transaction({ id: 1, amount: -200, counterpartyIban: 'BE00SAVINGS' }),
      // A genuinely uncategorised spend still shows up.
      transaction({ id: 2, amount: -30, counterpartyIban: 'BE00SHOP' }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(['BE00SAVINGS']),
    );

    expect(expenseByCategory).toEqual([
      { categoryId: null, total: 30, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes transfer-linked transactions', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const transactions = [transaction({ id: 1, amount: -100, categoryId: 1, transferId: 5 })];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory).toEqual([]);
  });

  it('excludes transactions outside the date range', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const transactions = [
      transaction({ id: 1, amount: -100, categoryId: 1, bookingDate: '2026-06-01' }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory).toEqual([]);
  });

  it('excludes a neutral-kind category from both expenseByCategory and incomeBySource (TICKET-CAT-02)', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Partner contribution', kind: 'neutral' })],
      [2, category({ id: 2, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [
      // A partner's contribution: positive amount, but must never surface as an income source.
      transaction({ id: 1, amount: 500, categoryId: 1 }),
      transaction({ id: 2, amount: -60, categoryId: 2 }),
    ];

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(incomeBySource).toEqual([]);
    expect(expenseByCategory).toEqual([
      { categoryId: 2, total: 60, share: 1, transactionCount: 1 },
    ]);
  });

  it('sorts entries by total descending', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1 })],
      [2, category({ id: 2 })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -10, categoryId: 1 }),
      transaction({ id: 2, amount: -90, categoryId: 2 }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );
    expect(expenseByCategory.map((entry) => entry.categoryId)).toEqual([2, 1]);
  });
});

describe('computeCategoryBreakdown: signed netting by category kind (TICKET-STAT-11)', () => {
  it('nets an expense category with only spends to their simple sum', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1, kind: 'expense' })]]);
    const transactions = [
      transaction({ id: 1, amount: -30, categoryId: 1 }),
      transaction({ id: 2, amount: -20, categoryId: 1 }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 50, share: 1, transactionCount: 2 },
    ]);
  });

  it('nets a spend and a smaller payback on the same expense category down to spend - payback', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1, kind: 'expense' })]]);
    const transactions = [
      transaction({ id: 1, amount: -30, categoryId: 1 }),
      // A payback booked to the same expense category — must reduce the total, not inflate it.
      transaction({ id: 2, amount: 10, categoryId: 1 }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 20, share: 1, transactionCount: 2 },
    ]);
  });

  it('clamps an expense category to 0 when paybacks exceed spend in the range', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1, kind: 'expense' })]]);
    const transactions = [
      transaction({ id: 1, amount: -10, categoryId: 1 }),
      transaction({ id: 2, amount: 30, categoryId: 1 }),
    ];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([{ categoryId: 1, total: 0, share: 0, transactionCount: 2 }]);
  });

  it('nets an income category with a spend-side correction (e.g. a salary clawback) down symmetrically', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: 2000, categoryId: 1 }),
      // A correction/clawback on the same income category — must reduce income, not add expense.
      transaction({ id: 2, amount: -300, categoryId: 1 }),
    ];

    const { incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(incomeBySource).toEqual([{ categoryId: 1, total: 1700, share: 1, transactionCount: 2 }]);
  });
});

describe('computeCategoryBreakdown: joint-account share weighting (TICKET-STAT-03)', () => {
  const jointAccount: Account = {
    id: 1,
    name: 'Joint',
    type: 'joint',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2026-01-01',
    color: '#000000',
    icon: 'users',
    archived: false,
    ownershipShare: 0.5,
    coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'] }],
  };
  const accountsById = new Map<number, Account>([[1, jointAccount]]);

  it('weights a joint account’s expense category slice by ownershipShare, reflecting my borne cost', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [transaction({ id: 1, accountId: 1, amount: -400, categoryId: 1 })];

    const { expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 200, share: 1, transactionCount: 1 },
    ]);
  });

  it('counts my income into the joint account at 100% in incomeBySource', () => {
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 1200, counterpartyIban: 'BE00EMPLOYER' }),
    ];

    const { incomeBySource } = computeCategoryBreakdown(
      transactions,
      new Map(),
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(incomeBySource).toEqual([
      { categoryId: null, total: 1200, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes an untagged co-owner inflow (identified only by IBAN) from both buckets', () => {
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 800, counterpartyIban: 'BE71096123456769' }),
    ];

    const { incomeBySource, expenseByCategory } = computeCategoryBreakdown(
      transactions,
      new Map(),
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(incomeBySource).toEqual([]);
    expect(expenseByCategory).toEqual([]);
  });

  it('nets an unflagged positive-amount joint expense-category transaction by my ownershipShare against expense, not into income', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const spend = transaction({ id: 1, accountId: 1, amount: -400, categoryId: 1 });
    const payback = transaction({
      id: 2,
      accountId: 1,
      amount: 40,
      categoryId: 1,
      counterpartyIban: 'BE00OTHER',
    });

    const { incomeBySource, expenseByCategory } = computeCategoryBreakdown(
      [spend, payback],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    // spend nets to 400 * 0.5 = 200; payback nets down by 40 * 0.5 = 20 -> 180.
    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 180, share: 1, transactionCount: 2 },
    ]);
    expect(incomeBySource).toEqual([]);
  });

  it('still counts an unflagged positive-amount joint transaction under an income-kind category fully as income', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({
        id: 1,
        accountId: 1,
        amount: 1200,
        categoryId: 1,
        counterpartyIban: 'BE00EMPLOYER',
      }),
    ];

    const { incomeBySource } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(incomeBySource).toEqual([{ categoryId: 1, total: 1200, share: 1, transactionCount: 1 }]);
  });

  it('excludes a co-owner-tagged positive-amount transaction from the expense-share netting too (still excluded entirely)', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [
      // counterpartyIban matches the joint account's registered co-owner IBAN.
      transaction({
        id: 1,
        accountId: 1,
        amount: 40,
        categoryId: 1,
        counterpartyIban: 'BE71096123456769',
      }),
    ];

    const { incomeBySource, expenseByCategory } = computeCategoryBreakdown(
      transactions,
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(incomeBySource).toEqual([]);
    expect(expenseByCategory).toEqual([]);
  });
});

describe('computeCategoryBreakdown: manual attributionOverride (TICKET-TXN-03)', () => {
  const jointAccountId = 1;
  const checkingAccountId = 2;
  const accountsById = new Map<number, Account>([
    [
      jointAccountId,
      {
        id: jointAccountId,
        name: 'Joint',
        type: 'joint',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#000000',
        icon: 'users',
        archived: false,
        ownershipShare: 0.5,
      },
    ],
    [
      checkingAccountId,
      {
        id: checkingAccountId,
        name: 'Checking',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#000000',
        icon: 'wallet',
        archived: false,
      },
    ],
  ]);

  it('weights a shared-flagged personal expense’s category slice by the referenced joint account’s share', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const groceries = transaction({
      id: 1,
      accountId: checkingAccountId,
      amount: -100,
      categoryId: 1,
      attributionOverride: { mode: 'shared', jointAccountId },
    });

    const { expenseByCategory } = computeCategoryBreakdown(
      [groceries],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 50, share: 1, transactionCount: 1 },
    ]);
  });

  it('excludes a notMine-flagged joint expense from the breakdown entirely', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const groceries = transaction({
      id: 1,
      accountId: jointAccountId,
      amount: -100,
      categoryId: 1,
      attributionOverride: { mode: 'notMine' },
    });

    const { expenseByCategory } = computeCategoryBreakdown(
      [groceries],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(expenseByCategory).toEqual([]);
  });

  it('nets a personal-flagged positive-amount payback fully against its expense category, not into income', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const spend = transaction({
      id: 1,
      accountId: jointAccountId,
      amount: -100,
      categoryId: 1,
      attributionOverride: { mode: 'personal' },
    });
    const payback = transaction({
      id: 2,
      accountId: jointAccountId,
      amount: 30,
      categoryId: 1,
      attributionOverride: { mode: 'personal' },
    });

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      [spend, payback],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(expenseByCategory).toEqual([
      { categoryId: 1, total: 70, share: 1, transactionCount: 2 },
    ]);
    expect(incomeBySource).toEqual([]);
  });

  it('does not net a shared-flagged positive-amount payback — it still buckets by weight sign into income', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const payback = transaction({
      id: 1,
      accountId: checkingAccountId,
      amount: 30,
      categoryId: 1,
      attributionOverride: { mode: 'shared', jointAccountId },
    });

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      [payback],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
      new Set(),
      accountsById,
    );

    expect(expenseByCategory).toEqual([]);
    expect(incomeBySource).toEqual([{ categoryId: 1, total: 15, share: 1, transactionCount: 1 }]);
  });
});

describe('computeCategoryBreakdown: nullified exclusion (TICKET-TXN-04)', () => {
  it('excludes a nullified transaction from expenseByCategory even when categorised', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const groceries = transaction({ id: 1, amount: -60, categoryId: 1, nullified: true });

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      [groceries],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([]);
    expect(incomeBySource).toEqual([]);
  });

  it('excludes a nullified transaction from incomeBySource even when categorised', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Salary', kind: 'income' })],
    ]);
    const salary = transaction({ id: 1, amount: 2000, categoryId: 1, nullified: true });

    const { expenseByCategory, incomeBySource } = computeCategoryBreakdown(
      [salary],
      categoriesById,
      '2026-07-01',
      '2026-07-31',
    );

    expect(expenseByCategory).toEqual([]);
    expect(incomeBySource).toEqual([]);
  });
});
