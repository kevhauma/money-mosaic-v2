import type { Account, Category, Transaction, Transfer } from '@/core/data-access';
import { classifyJointLeg, jointLegStakeDelta, type JointLegContext } from './classify-joint-leg';

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
  coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'], share: 0.5 }],
  ...overrides,
});

const ownAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 2,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-15',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'txn',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const emptyContext = (overrides: Partial<JointLegContext> = {}): JointLegContext => ({
  transactionsById: new Map(),
  accountsById: new Map(),
  transfersById: new Map(),
  categoriesById: new Map(),
  ...overrides,
});

describe('classifyJointLeg', () => {
  it('classifies a linked transfer from my own account as mineIn', () => {
    const own = ownAccount();
    const mineLeg = transaction({ id: 2, accountId: own.id!, amount: -500 });
    const jointLeg = transaction({ id: 1, accountId: 1, amount: 500, transferId: 9 });
    const transfer: Transfer = {
      id: 9,
      fromTransactionId: 2,
      toTransactionId: 1,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-15T00:00:00.000Z',
    };
    const context = emptyContext({
      transactionsById: new Map([
        [1, jointLeg],
        [2, mineLeg],
      ]),
      accountsById: new Map([
        [1, jointAccount()],
        [own.id!, own],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
    });

    expect(classifyJointLeg(jointLeg, jointAccount(), context)).toBe('mineIn');
  });

  it('classifies a linked transfer to my own account as mineOut', () => {
    const own = ownAccount();
    const jointLeg = transaction({ id: 1, accountId: 1, amount: -500, transferId: 9 });
    const mineLeg = transaction({ id: 2, accountId: own.id!, amount: 500 });
    const transfer: Transfer = {
      id: 9,
      fromTransactionId: 1,
      toTransactionId: 2,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-15T00:00:00.000Z',
    };
    const context = emptyContext({
      transactionsById: new Map([
        [1, jointLeg],
        [2, mineLeg],
      ]),
      accountsById: new Map([
        [1, jointAccount()],
        [own.id!, own],
      ]),
      transfersById: new Map([
        [1, transfer],
        [2, transfer],
      ]),
    });

    expect(classifyJointLeg(jointLeg, jointAccount(), context)).toBe('mineOut');
  });

  it('classifies a positive non-transfer amount from an unknown counterparty as mineIn (the "assumed mine" heuristic)', () => {
    const txn = transaction({ amount: 1200, counterpartyIban: 'BE00EMPLOYER' });
    expect(classifyJointLeg(txn, jointAccount(), emptyContext())).toBe('mineIn');
  });

  it('classifies a positive amount tagged with a neutral category as coOwnerIn', () => {
    const category: Category = {
      id: 1,
      name: 'Partner contribution',
      kind: 'neutral',
      color: '#000',
      icon: 'users',
      archived: false,
      isSystem: true,
    };
    const txn = transaction({ amount: 1000, categoryId: 1 });
    const context = emptyContext({ categoriesById: new Map([[1, category]]) });

    expect(classifyJointLeg(txn, jointAccount(), context)).toBe('coOwnerIn');
  });

  it('classifies a positive amount from a registered (even untagged) co-owner IBAN as coOwnerIn', () => {
    const txn = transaction({ amount: 1000, counterpartyIban: 'BE71096123456769' });
    expect(classifyJointLeg(txn, jointAccount(), emptyContext())).toBe('coOwnerIn');
  });

  it('classifies any negative non-transfer amount as jointSpend', () => {
    const txn = transaction({ amount: -80 });
    expect(classifyJointLeg(txn, jointAccount(), emptyContext())).toBe('jointSpend');
  });
});

describe('jointLegStakeDelta', () => {
  it('counts mineIn/mineOut at 100% regardless of share', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    expect(jointLegStakeDelta(transaction({ amount: 500 }), account, 'mineIn')).toBe(500);
    expect(jointLegStakeDelta(transaction({ amount: -500 }), account, 'mineOut')).toBe(-500);
  });

  it('counts jointSpend weighted by ownershipShare', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    expect(jointLegStakeDelta(transaction({ amount: -400 }), account, 'jointSpend')).toBe(-200);
  });

  it('counts coOwnerIn as zero', () => {
    const account = jointAccount({ ownershipShare: 0.5 });
    expect(jointLegStakeDelta(transaction({ amount: 1000 }), account, 'coOwnerIn')).toBe(0);
  });

  it('defaults ownershipShare to 1 when undefined', () => {
    const account = jointAccount({ ownershipShare: undefined });
    expect(jointLegStakeDelta(transaction({ amount: -400 }), account, 'jointSpend')).toBe(-400);
  });
});
