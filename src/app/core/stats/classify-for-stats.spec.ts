import type { Account, Category, Transaction } from '@/core/data-access';
import { classifyForStats } from './classify-for-stats';

const FROM = '2026-07-01';
const TO = '2026-07-31';

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
  name: 'Groceries',
  kind: 'expense',
  color: '#000000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
  ...overrides,
});

const classify = (
  txn: Transaction,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  categoriesById: ReadonlyMap<number, Category> = new Map(),
  accountsById: ReadonlyMap<number, Account> = new Map(),
) => classifyForStats(txn, FROM, TO, ownSavingsIbans, categoriesById, accountsById);

describe('classifyForStats: base exclusions', () => {
  it('skips a transaction outside the date range', () => {
    expect(classify(transaction({ bookingDate: '2026-08-01' }))).toEqual({ kind: 'skip' });
  });

  it('skips a linked transfer leg', () => {
    expect(classify(transaction({ transferId: 5 }))).toEqual({ kind: 'skip' });
  });

  it('skips a nullified transaction', () => {
    expect(classify(transaction({ nullified: true }))).toEqual({ kind: 'skip' });
  });

  it('skips a zero-amount transaction', () => {
    expect(classify(transaction({ amount: 0 }))).toEqual({ kind: 'skip' });
  });

  it('classifies a movement to an own savings IBAN as savings, signed so a deposit adds and a withdrawal subtracts', () => {
    const ownSavings = new Set(['BE00SAVINGS']);
    expect(
      classify(transaction({ amount: -200, counterpartyIban: 'BE00SAVINGS' }), ownSavings),
    ).toEqual({ kind: 'savings', amount: 200 });
    expect(
      classify(transaction({ amount: 200, counterpartyIban: 'BE00SAVINGS' }), ownSavings),
    ).toEqual({ kind: 'savings', amount: -200 });
  });

  it('a nullified savings movement is skipped, not classified as savings (TICKET-STAT-18: nullified runs before the savings check)', () => {
    const ownSavings = new Set(['BE00SAVINGS']);
    expect(
      classify(
        transaction({ amount: -200, counterpartyIban: 'BE00SAVINGS', nullified: true }),
        ownSavings,
      ),
    ).toEqual({ kind: 'skip' });
  });

  it('a linked transfer leg to a savings account still counts as savings (transfer check stays below the savings check)', () => {
    const ownSavings = new Set(['BE00SAVINGS']);
    expect(
      classify(
        transaction({ amount: -200, counterpartyIban: 'BE00SAVINGS', transferId: 9 }),
        ownSavings,
      ),
    ).toEqual({ kind: 'savings', amount: 200 });
  });

  it('excludes a neutral-kind category from both buckets', () => {
    const categoriesById = new Map([[1, category({ id: 1, kind: 'neutral' })]]);
    expect(
      classify(transaction({ amount: 500, categoryId: 1 }), new Set(), categoriesById),
    ).toEqual({
      kind: 'skip',
    });
  });

  it('buckets a plain own-account transaction by category kind, netting a refund down (TICKET-STAT-11)', () => {
    const categoriesById = new Map([[1, category({ id: 1, kind: 'expense' })]]);
    expect(
      classify(transaction({ amount: -30, categoryId: 1 }), new Set(), categoriesById),
    ).toEqual({ kind: 'expense', amount: 30, categoryId: 1 });
    expect(classify(transaction({ amount: 10, categoryId: 1 }), new Set(), categoriesById)).toEqual(
      { kind: 'expense', amount: -10, categoryId: 1 },
    );
  });

  it('falls back to raw amount sign for an uncategorised transaction', () => {
    expect(classify(transaction({ amount: -30 }))).toEqual({
      kind: 'expense',
      amount: 30,
      categoryId: null,
    });
    expect(classify(transaction({ amount: 500 }))).toEqual({
      kind: 'income',
      amount: 500,
      categoryId: null,
    });
  });
});

describe('classifyForStats: joint account routing (TICKET-STAT-03)', () => {
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

  it('mineIn: my income into the pot counts at 100%', () => {
    expect(
      classify(
        transaction({ accountId: 1, amount: 1200, counterpartyIban: 'BE00EMPLOYER' }),
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ kind: 'income', amount: 1200, categoryId: null });
  });

  it('jointSpend: shared spending contributes only my ownershipShare to expense', () => {
    expect(
      classify(transaction({ accountId: 1, amount: -400 }), new Set(), new Map(), accountsById),
    ).toEqual({ kind: 'expense', amount: 200, categoryId: null });
  });

  it('coOwnerIn: an untagged co-owner inflow (identified by IBAN) is excluded entirely', () => {
    expect(
      classify(
        transaction({ accountId: 1, amount: 800, counterpartyIban: 'BE71096123456769' }),
        new Set(),
        new Map(),
        accountsById,
      ),
    ).toEqual({ kind: 'skip' });
  });

  it('the untagged expense-category refund rule: a positive-amount transaction under an expense category on a joint account nets my ownershipShare down against expense, not into income', () => {
    const categoriesById = new Map([[1, category({ id: 1, kind: 'expense' })]]);
    expect(
      classify(
        transaction({ accountId: 1, amount: 40, categoryId: 1, counterpartyIban: 'BE00OTHER' }),
        new Set(),
        categoriesById,
        accountsById,
      ),
    ).toEqual({ kind: 'expense', amount: -20, categoryId: 1 });
  });
});

describe('classifyForStats: manual attributionOverride (TICKET-TXN-03)', () => {
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

  it('shared: a shared-flagged personal expense counts only my share against expense', () => {
    const groceries = transaction({
      accountId: checkingAccountId,
      amount: -100,
      attributionOverride: { mode: 'shared', jointAccountId },
    });
    expect(classify(groceries, new Set(), new Map(), accountsById)).toEqual({
      kind: 'expense',
      amount: 50,
      categoryId: null,
    });
  });

  it('personal: counts 100% instead of the account default share, netted by category kind so a payback reduces expense rather than counting as income', () => {
    const categoriesById = new Map([[1, category({ id: 1, kind: 'expense' })]]);
    const spend = transaction({
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
    expect(classify(spend, new Set(), categoriesById, accountsById)).toEqual({
      kind: 'expense',
      amount: 100,
      categoryId: 1,
    });
    expect(classify(payback, new Set(), categoriesById, accountsById)).toEqual({
      kind: 'expense',
      amount: -30,
      categoryId: 1,
    });
  });

  it('notMine: excluded entirely instead of counting the account default share', () => {
    const groceries = transaction({
      accountId: jointAccountId,
      amount: -100,
      attributionOverride: { mode: 'notMine' },
    });
    expect(classify(groceries, new Set(), new Map(), accountsById)).toEqual({ kind: 'skip' });
  });
});
