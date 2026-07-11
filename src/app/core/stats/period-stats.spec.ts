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
});
