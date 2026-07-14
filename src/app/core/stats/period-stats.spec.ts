import type { Account, Category, Transaction } from '@/core/data-access';
import { computePeriodStats } from './period-stats';

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

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Partner contribution',
  kind: 'neutral',
  color: '#94A3B8',
  icon: 'users',
  archived: false,
  isSystem: true,
  ...overrides,
});

const SAVINGS_IBAN = 'BE00SAVINGS';
const ownSavings = new Set([SAVINGS_IBAN]);

describe('computePeriodStats', () => {
  it('sums income and expense separately and computes net', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -300 }),
      transaction({ id: 3, amount: -200 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 500,
      savings: 0,
      net: 500,
      savingsRate: 0,
    });
  });

  it('excludes transactions linked as transfers from both income and expense (FR-STAT-2)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -1000, transferId: 7 }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 0,
      savings: 0,
      net: 1000,
      savingsRate: 0,
    });
  });

  it('reports a one-sided movement to a savings IBAN as savings, not expense (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Unlinked (transferId null) outbound movement whose counterparty is an own savings account.
      transaction({ id: 2, amount: -200, counterpartyIban: SAVINGS_IBAN }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });

  it('reports a linked transfer to savings as savings without double-counting the savings-side leg (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Spending-side leg: counterparty is the savings account.
      transaction({ id: 2, amount: -200, transferId: 9, counterpartyIban: SAVINGS_IBAN }),
      // Savings-side leg: sits in the savings account, counterparty points back at checking.
      transaction({ id: 3, amount: 200, transferId: 9, counterpartyIban: 'BE00CHECKING' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });

  it('does not count a withdrawal from savings as income — the reverse leg nets savings down (TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      // Inbound from the savings account (money withdrawn back to checking).
      transaction({ id: 2, amount: 200, counterpartyIban: SAVINGS_IBAN }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: -200,
      net: 1000,
      savingsRate: -0.2,
    });
  });

  it('still counts an expense to a non-savings counterparty as expense (TICKET-TRF-02)', () => {
    const transactions = [transaction({ id: 1, amount: -50, counterpartyIban: 'BE00SHOP' })];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 0,
      expense: 50,
      savings: 0,
      net: -50,
      savingsRate: null,
    });
  });

  it('excludes transactions outside the date range', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000, bookingDate: '2026-06-30' }),
      transaction({ id: 2, amount: -300, bookingDate: '2026-07-15' }),
      transaction({ id: 3, amount: -200, bookingDate: '2026-08-01' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 0,
      expense: 300,
      savings: 0,
      net: -300,
      savingsRate: null,
    });
  });

  it('includes transactions on the exact from/to boundary dates', () => {
    const transactions = [
      transaction({ id: 1, amount: 100, bookingDate: '2026-07-01' }),
      transaction({ id: 2, amount: 100, bookingDate: '2026-07-31' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').income).toBe(200);
  });

  it('returns null savings rate when income is zero, rather than dividing by zero', () => {
    const transactions = [transaction({ id: 1, amount: -100 })];
    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31').savingsRate).toBeNull();
  });

  it('excludes a neutral-kind transaction from income/expense/savingsRate — kind, not sign, drives it (TICKET-CAT-02)', () => {
    const categoriesById = new Map<number, Category>([[1, category({ id: 1 })]]);
    const transactions = [
      // A partner's contribution: positive amount, but categorised neutral.
      transaction({ id: 1, amount: 500, categoryId: 1 }),
      transaction({ id: 2, amount: -50 }),
    ];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById),
    ).toEqual({
      income: 0,
      expense: 50,
      savings: 0,
      net: -50,
      savingsRate: null,
    });
  });

  it('still counts a same-account positive income transaction as income when its category kind is income (TICKET-CAT-02)', () => {
    const categoriesById = new Map<number, Category>([
      [2, category({ id: 2, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [transaction({ id: 1, amount: 1000, categoryId: 2 })];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById)
        .income,
    ).toBe(1000);
  });
});

describe('computePeriodStats: signed netting by category kind (TICKET-STAT-11)', () => {
  it('nets an expense category with only spends to their simple sum', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -30, categoryId: 1 }),
      transaction({ id: 2, amount: -20, categoryId: 1 }),
    ];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById)
        .expense,
    ).toBe(50);
  });

  it('nets a spend and a smaller payback on the same expense category down to spend - payback', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: -30, categoryId: 1 }),
      transaction({ id: 2, amount: 10, categoryId: 1 }),
    ];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById)
        .expense,
    ).toBe(20);
  });

  it('nets an income category with a spend-side correction (e.g. a salary clawback) down symmetrically', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Salary', kind: 'income' })],
    ]);
    const transactions = [
      transaction({ id: 1, amount: 2000, categoryId: 1 }),
      transaction({ id: 2, amount: -300, categoryId: 1 }),
    ];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById)
        .income,
    ).toBe(1700);
  });

  it('still buckets an uncategorised transaction by raw amount sign', () => {
    const transactions = [transaction({ id: 1, amount: -30 }), transaction({ id: 2, amount: 500 })];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 500,
      expense: 30,
      savings: 0,
      net: 470,
      savingsRate: 0,
    });
  });

  it('regression: a positive-amount transaction categorised as expense lands in expense, not income', () => {
    const categoriesById = new Map<number, Category>([
      [1, category({ id: 1, name: 'Groceries', kind: 'expense' })],
    ]);
    // A payback/refund booked to an expense category: raw sign is positive, but the category's
    // kind must drive the bucket, netting expense down rather than adding to income.
    const transactions = [
      transaction({ id: 1, amount: -50, categoryId: 1 }),
      transaction({ id: 2, amount: 20, categoryId: 1 }),
    ];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById),
    ).toEqual({ income: 0, expense: 30, savings: 0, net: -30, savingsRate: null });
  });
});

describe('computePeriodStats: joint-account share weighting (TICKET-STAT-03)', () => {
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

  it('weights a joint account’s shared spending by ownershipShare into expense', () => {
    const transactions = [transaction({ id: 1, accountId: 1, amount: -400 })];

    expect(
      computePeriodStats(
        transactions,
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 200, savings: 0, net: -200, savingsRate: null });
  });

  it('counts my income into the joint account at 100%', () => {
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 1200, counterpartyIban: 'BE00EMPLOYER' }),
    ];

    expect(
      computePeriodStats(
        transactions,
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ).income,
    ).toBe(1200);
  });

  it('excludes an untagged co-owner inflow (identified only by IBAN) from income, not just a neutral-kind one', () => {
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: 800, counterpartyIban: 'BE71096123456769' }),
    ];

    expect(
      computePeriodStats(
        transactions,
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 0, savings: 0, net: 0, savingsRate: null });
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

    // spend nets to 400 * 0.5 = 200; payback nets down by 40 * 0.5 = 20 -> 180.
    expect(
      computePeriodStats(
        [spend, payback],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        categoriesById,
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 180, savings: 0, net: -180, savingsRate: null });
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

    expect(
      computePeriodStats(
        transactions,
        '2026-07-01',
        '2026-07-31',
        new Set(),
        categoriesById,
        accountsById,
      ).income,
    ).toBe(1200);
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

    expect(
      computePeriodStats(
        transactions,
        '2026-07-01',
        '2026-07-31',
        new Set(),
        categoriesById,
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 0, savings: 0, net: 0, savingsRate: null });
  });
});

describe('computePeriodStats: manual attributionOverride (TICKET-TXN-03)', () => {
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

  it('worked example: a shared-flagged personal expense drops expense by only my share, not the full amount', () => {
    const groceries = transaction({
      id: 1,
      accountId: checkingAccountId,
      amount: -100,
      attributionOverride: { mode: 'shared', jointAccountId },
    });

    expect(
      computePeriodStats(
        [groceries],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 50, savings: 0, net: -50, savingsRate: null });
  });

  it('personal-mode joint expense counts 100% instead of the account’s default share', () => {
    const groceries = transaction({
      id: 1,
      accountId: jointAccountId,
      amount: -100,
      attributionOverride: { mode: 'personal' },
    });

    expect(
      computePeriodStats(
        [groceries],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ).expense,
    ).toBe(100);
  });

  it('notMine-mode joint expense is excluded entirely instead of counting the account’s default share', () => {
    const groceries = transaction({
      id: 1,
      accountId: jointAccountId,
      amount: -100,
      attributionOverride: { mode: 'notMine' },
    });

    expect(
      computePeriodStats(
        [groceries],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 0, savings: 0, net: 0, savingsRate: null });
  });

  it('nets a personal-flagged positive-amount payback fully against expense, not into income', () => {
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

    expect(
      computePeriodStats(
        [spend, payback],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        categoriesById,
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 70, savings: 0, net: -70, savingsRate: null });
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

    expect(
      computePeriodStats(
        [payback],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        categoriesById,
        accountsById,
      ),
    ).toEqual({ income: 15, expense: 0, savings: 0, net: 15, savingsRate: 0 });
  });

  it('a shared-overridden and nullified transaction is excluded from income/expense (net worth is computed elsewhere, unaffected)', () => {
    const groceries = transaction({
      id: 1,
      accountId: jointAccountId,
      amount: -100,
      attributionOverride: { mode: 'personal' },
      nullified: true,
    });

    expect(
      computePeriodStats(
        [groceries],
        '2026-07-01',
        '2026-07-31',
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ income: 0, expense: 0, savings: 0, net: 0, savingsRate: null });
  });
});

describe('computePeriodStats: nullified exclusion (TICKET-TXN-04)', () => {
  it('excludes a nullified transaction from income, expense, and savingsRate', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -300, nullified: true }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31')).toEqual({
      income: 1000,
      expense: 0,
      savings: 0,
      net: 1000,
      savingsRate: 0,
    });
  });

  it('keeps its category (if any) but still excludes it from income/expense', () => {
    const categoriesById = new Map([[1, category({ id: 1, kind: 'expense' })]]);
    const transactions = [transaction({ id: 1, amount: -50, categoryId: 1, nullified: true })];

    expect(
      computePeriodStats(transactions, '2026-07-01', '2026-07-31', new Set(), categoriesById),
    ).toEqual({ income: 0, expense: 0, savings: 0, net: 0, savingsRate: null });
  });

  it('excludes a nullified savings deposit from savings/savingsRate too (CR3-1.1)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({
        id: 2,
        amount: -200,
        counterpartyIban: SAVINGS_IBAN,
        nullified: true,
      }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 0,
      net: 1000,
      savingsRate: 0,
    });
  });

  it('excludes a nullified savings withdrawal from savings/savingsRate too (CR3-1.1)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({
        id: 2,
        amount: 200,
        counterpartyIban: SAVINGS_IBAN,
        nullified: true,
      }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 0,
      net: 1000,
      savingsRate: 0,
    });
  });

  it('a non-nullified savings deposit is still counted (regression guard for the nullified/savings check order)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -200, counterpartyIban: SAVINGS_IBAN }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });

  it('a linked transfer leg to savings (not nullified) is still counted (regression guard, TICKET-TRF-02)', () => {
    const transactions = [
      transaction({ id: 1, amount: 1000 }),
      transaction({ id: 2, amount: -200, transferId: 9, counterpartyIban: SAVINGS_IBAN }),
      transaction({ id: 3, amount: 200, transferId: 9, counterpartyIban: 'BE00CHECKING' }),
    ];

    expect(computePeriodStats(transactions, '2026-07-01', '2026-07-31', ownSavings)).toEqual({
      income: 1000,
      expense: 0,
      savings: 200,
      net: 1000,
      savingsRate: 0.2,
    });
  });
});
