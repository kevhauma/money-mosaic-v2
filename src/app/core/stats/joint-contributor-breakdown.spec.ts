import type { Account, Category, Transaction } from '@/core/data-access';
import { computeContributorBreakdown } from './joint-contributor-breakdown';
import type { JointLegContext } from './classify-joint-leg';

const jointAccount: Account = {
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
  coOwners: [
    { name: 'Partner', ibans: ['BE71096123456769'] },
    { name: 'Parent', ibans: ['BE62510007547061'] },
  ],
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

describe('computeContributorBreakdown', () => {
  it('attributes two different co-owners’ inflows to the right person by IBAN', () => {
    const partnerInflow = transaction({
      id: 1,
      amount: 300,
      categoryId: 1,
      counterpartyIban: 'BE71096123456769',
    });
    const parentInflow = transaction({ id: 2, amount: 150, counterpartyIban: 'BE62510007547061' });
    const transactions = [partnerInflow, parentInflow];
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([[1, jointAccount]]),
      transfersById: new Map(),
      categoriesById: new Map([[1, neutralCategory]]),
    };

    const breakdown = computeContributorBreakdown(transactions, jointAccount, context);

    expect(breakdown.byCoOwner.get('Partner')).toBe(300);
    expect(breakdown.byCoOwner.get('Parent')).toBe(150);
    expect(breakdown.mine).toBe(0);
    expect(breakdown.unattributed).toBe(0);
  });

  it('attributes a verified transfer from my own account to "mine"', () => {
    const ownAccount: Account = { ...jointAccount, id: 2, type: 'checking', coOwners: undefined };
    const myDeposit = transaction({ id: 1, accountId: 1, amount: 500, transferId: 10 });
    const otherLeg = transaction({ id: 2, accountId: 2, amount: -500, transferId: 10 });
    const transactions = [myDeposit, otherLeg];
    const context: JointLegContext = {
      transactionsById: new Map(transactions.map((t) => [t.id!, t])),
      accountsById: new Map([
        [1, jointAccount],
        [2, ownAccount],
      ]),
      transfersById: new Map([
        [
          1,
          {
            id: 10,
            fromTransactionId: 2,
            toTransactionId: 1,
            method: 'manual',
            confidence: 'manual',
            linkedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
        [
          2,
          {
            id: 10,
            fromTransactionId: 2,
            toTransactionId: 1,
            method: 'manual',
            confidence: 'manual',
            linkedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      ]),
      categoriesById: new Map(),
    };

    const breakdown = computeContributorBreakdown(transactions, jointAccount, context);
    expect(breakdown.mine).toBe(500);
  });

  it('buckets an unidentified positive inflow as unattributed even though it still counts toward my stake', () => {
    const salary = transaction({ id: 1, amount: 1200, counterpartyIban: 'BE00EMPLOYER' });
    const context: JointLegContext = {
      transactionsById: new Map([[1, salary]]),
      accountsById: new Map([[1, jointAccount]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    const breakdown = computeContributorBreakdown([salary], jointAccount, context);
    expect(breakdown.unattributed).toBe(1200);
    expect(breakdown.mine).toBe(0);
  });

  it('ignores jointSpend and mineOut legs (breakdown is inflows only)', () => {
    const groceries = transaction({ id: 1, amount: -80 });
    const context: JointLegContext = {
      transactionsById: new Map([[1, groceries]]),
      accountsById: new Map([[1, jointAccount]]),
      transfersById: new Map(),
      categoriesById: new Map(),
    };

    const breakdown = computeContributorBreakdown([groceries], jointAccount, context);
    expect(breakdown).toEqual({ mine: 0, byCoOwner: new Map(), unattributed: 0 });
  });
});
