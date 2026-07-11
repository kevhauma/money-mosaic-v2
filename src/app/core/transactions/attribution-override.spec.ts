import type { Account, Transaction, Transfer } from '@/core/data-access';
import { reimbursementCandidates, validateAttributionOverride } from './attribution-override';

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

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 2,
  bookingDate: '2026-07-15',
  amount: -100,
  currency: 'EUR',
  rawDescription: 'Groceries',
  fingerprint: 'fp',
  createdAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

describe('validateAttributionOverride', () => {
  it('rejects an override on a transaction that already has a transferId', () => {
    const txn = transaction({ transferId: 42 });
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'personal' },
        { jointAccounts: [], transactionsById: new Map(), transfersById: new Map() },
      ),
    ).toThrow(/linked transfer leg/i);
  });

  it('accepts personal/notMine modes without further checks', () => {
    const txn = transaction();
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'personal' },
        { jointAccounts: [], transactionsById: new Map(), transfersById: new Map() },
      ),
    ).not.toThrow();
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'notMine' },
        { jointAccounts: [], transactionsById: new Map(), transfersById: new Map() },
      ),
    ).not.toThrow();
  });

  it('requires jointAccountId for shared mode when more than one joint account exists', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 }), jointAccount({ id: 2 })];
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared' },
        { jointAccounts, transactionsById: new Map(), transfersById: new Map() },
      ),
    ).toThrow(/select which joint account/i);
  });

  it('allows shared mode without jointAccountId when exactly one joint account exists', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 })];
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared' },
        { jointAccounts, transactionsById: new Map(), transfersById: new Map() },
      ),
    ).not.toThrow();
  });

  it('rejects a jointAccountId that doesn’t match any known joint account', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 })];
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared', jointAccountId: 999 },
        { jointAccounts, transactionsById: new Map(), transfersById: new Map() },
      ),
    ).toThrow(/no longer exists/i);
  });

  it('rejects a reimbursementTransferId that doesn’t resolve to a known transfer', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 })];
    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared', jointAccountId: 1, reimbursementTransferId: 999 },
        { jointAccounts, transactionsById: new Map(), transfersById: new Map() },
      ),
    ).toThrow(/no longer exists/i);
  });

  it('rejects a reimbursementTransferId whose transfer doesn’t touch the referenced joint account', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 })];
    const unrelatedTransfer: Transfer = {
      id: 50,
      fromTransactionId: 10,
      toTransactionId: 11,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    const transactionsById = new Map<number, Transaction>([
      [10, transaction({ id: 10, accountId: 3 })],
      [11, transaction({ id: 11, accountId: 4 })],
    ]);

    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared', jointAccountId: 1, reimbursementTransferId: 50 },
        { jointAccounts, transactionsById, transfersById: new Map([[50, unrelatedTransfer]]) },
      ),
    ).toThrow(/does not touch/i);
  });

  it('accepts a reimbursementTransferId whose transfer touches the referenced joint account', () => {
    const txn = transaction();
    const jointAccounts = [jointAccount({ id: 1 })];
    const reimbursementTransfer: Transfer = {
      id: 50,
      fromTransactionId: 10,
      toTransactionId: 11,
      method: 'manual',
      confidence: 'manual',
      linkedAt: '2026-07-01T00:00:00.000Z',
    };
    const transactionsById = new Map<number, Transaction>([
      [10, transaction({ id: 10, accountId: 1 })],
      [11, transaction({ id: 11, accountId: 2 })],
    ]);

    expect(() =>
      validateAttributionOverride(
        txn,
        { mode: 'shared', jointAccountId: 1, reimbursementTransferId: 50 },
        { jointAccounts, transactionsById, transfersById: new Map([[50, reimbursementTransfer]]) },
      ),
    ).not.toThrow();
  });
});

describe('reimbursementCandidates', () => {
  const jointLeg = transaction({ id: 10, accountId: 1, bookingDate: '2026-07-10' });
  const ownLeg = transaction({ id: 11, accountId: 2, bookingDate: '2026-07-10' });
  const transactionsById = new Map<number, Transaction>([
    [10, jointLeg],
    [11, ownLeg],
  ]);
  const transfer: Transfer = {
    id: 50,
    fromTransactionId: 10,
    toTransactionId: 11,
    method: 'manual',
    confidence: 'manual',
    linkedAt: '2026-07-10T00:00:00.000Z',
  };

  it('includes a linked transfer touching the joint account within the match window', () => {
    const candidates = reimbursementCandidates([transfer], transactionsById, 1, '2026-07-12', 3);
    expect(candidates).toEqual([transfer]);
  });

  it('excludes a transfer outside the match window', () => {
    const candidates = reimbursementCandidates([transfer], transactionsById, 1, '2026-07-20', 3);
    expect(candidates).toEqual([]);
  });

  it('excludes a transfer that doesn’t touch the given joint account', () => {
    const candidates = reimbursementCandidates([transfer], transactionsById, 999, '2026-07-12', 3);
    expect(candidates).toEqual([]);
  });
});
