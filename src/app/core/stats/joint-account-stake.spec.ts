import type { Account, Category, Transaction, Transfer } from '@/core/data-access';
import { computeJointAccountStake } from './joint-account-stake';
import type { JointLegContext } from './classify-joint-leg';

const jointAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Joint',
  type: 'joint',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'users',
  archived: false,
  ownershipShare: 0.5,
  ...overrides,
});

const ownAccount: Account = {
  id: 2,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 5000,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'wallet',
  archived: false,
};

const neutralCategory: Category = {
  id: 1,
  name: 'Partner contribution',
  kind: 'neutral',
  color: '#000',
  icon: 'users',
  archived: false,
  isSystem: true,
};

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: 0,
  currency: 'EUR',
  rawDescription: 'txn',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

describe('computeJointAccountStake', () => {
  it('matches the ticket worked example: stake €800 at s=0.5 (I deposit 1000, partner deposits 1000 neutral, we spend 400)', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    const transferLeg: Transaction = transaction({
      id: 1,
      accountId: 1,
      amount: 1000,
      transferId: 100,
    });
    const ownLeg: Transaction = transaction({
      id: 2,
      accountId: 2,
      amount: -1000,
      transferId: 100,
    });
    const partnerDeposit = transaction({ id: 3, accountId: 1, amount: 1000, categoryId: 1 });
    const groceries = transaction({ id: 4, accountId: 1, amount: -400 });
    const transfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    const transactions = [transferLeg, ownLeg, partnerDeposit, groceries];
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, account],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
      categoriesById: new Map([[1, neutralCategory]]),
    };

    expect(computeJointAccountStake(transactions, account, context)).toBe(800);
  });

  it('nets to zero for a deposit from my own account and a withdrawal back to my own account', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    const depositIn = transaction({ id: 1, accountId: 1, amount: 500, transferId: 10 });
    const depositOut = transaction({ id: 2, accountId: 2, amount: -500, transferId: 10 });
    const withdrawOut = transaction({ id: 3, accountId: 1, amount: -500, transferId: 20 });
    const withdrawIn = transaction({ id: 4, accountId: 2, amount: 500, transferId: 20 });
    const transactions = [depositIn, depositOut, withdrawOut, withdrawIn];
    const depositTransfer: Transfer = {
      id: 10,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    const withdrawTransfer: Transfer = {
      id: 20,
      fromTransactionId: 3,
      toTransactionId: 4,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-02T00:00:00.000Z',
    };
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, account],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [1, depositTransfer],
        [2, depositTransfer],
        [3, withdrawTransfer],
        [4, withdrawTransfer],
      ]),
      categoriesById: new Map(),
    };

    expect(computeJointAccountStake(transactions, account, context)).toBe(0);
  });

  it('apportions the opening balance by share', () => {
    const account = jointAccount({ ownershipShare: 0.25, openingBalance: 2000 });
    const context: JointLegContext = {
      transactionsById: new Map(),
      accountsById: new Map([[1, account]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    expect(computeJointAccountStake([], account, context)).toBe(500);
  });

  it('is unaffected by an untagged co-owner inflow identified only by registered IBAN', () => {
    const account = jointAccount({
      ownershipShare: 0.5,
      coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'] }],
    });
    const untaggedCoOwnerInflow = transaction({
      id: 1,
      accountId: 1,
      amount: 1000,
      counterpartyIban: 'BE71096123456769',
    });
    const context: JointLegContext = {
      transactionsById: new Map([[1, untaggedCoOwnerInflow]]),
      accountsById: new Map([[1, account]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    expect(computeJointAccountStake([untaggedCoOwnerInflow], account, context)).toBe(0);
  });

  it('personal-mode override on a joint expense counts it at 100% instead of my share (TICKET-TXN-03)', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    const groceries = transaction({
      id: 1,
      accountId: 1,
      amount: -400,
      attributionOverride: { mode: 'personal' },
    });
    const context: JointLegContext = {
      transactionsById: new Map([[1, groceries]]),
      accountsById: new Map([[1, account]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    expect(computeJointAccountStake([groceries], account, context)).toBe(-400);
  });

  it('excludes the joint leg of a reimbursed transfer from the stake (TICKET-TXN-03)', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    const groceries = transaction({
      id: 1,
      accountId: 2,
      amount: -100,
      attributionOverride: { mode: 'shared', jointAccountId: 1, reimbursementTransferId: 100 },
    });
    const jointReimbursesLeg = transaction({
      id: 2,
      accountId: 1,
      amount: -100,
      transferId: 100,
    });
    const checkingReceivesLeg = transaction({
      id: 3,
      accountId: 2,
      amount: 100,
      transferId: 100,
    });
    const reimbursementTransfer: Transfer = {
      id: 100,
      fromTransactionId: 2,
      toTransactionId: 3,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    const transactions = [groceries, jointReimbursesLeg, checkingReceivesLeg];
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, account],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [2, reimbursementTransfer],
        [3, reimbursementTransfer],
      ]),
      categoriesById: new Map(),
    };

    // The joint account's own withdrawal (jointReimbursesLeg, normally a mineOut at -100) is
    // suppressed instead — the flagged expense's own weighted amount already accounts for it.
    expect(computeJointAccountStake(transactions, account, context)).toBe(0);
  });

  it('accumulates jointSpend across many small transactions with no rounding drift', () => {
    const account = jointAccount({ ownershipShare: 1 / 3 });
    const transactions = Array.from({ length: 100 }, (_, index) =>
      transaction({ id: index + 1, accountId: 1, amount: -1.11 }),
    );
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([[1, account]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    const expected = transactions.reduce((sum, t) => sum + t.amount * (1 / 3), 0);
    expect(computeJointAccountStake(transactions, account, context)).toBeCloseTo(expected, 9);
  });
});
