import type { Account, Transaction, Transfer } from '@/core/data-access';
import { counterpartTransactionId, transferLabelFor } from './transfer-label';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -500,
  currency: 'EUR',
  rawDescription: 'Transfer to savings',
  fingerprint: 'fp-1',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

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

const transfer: Transfer = {
  id: 7,
  fromTransactionId: 1,
  toTransactionId: 2,
  method: 'auto-iban',
  confidence: 'high',
  linkedAt: '2026-07-01T00:00:00.000Z',
};

const accountsById = new Map([
  [1, account({ id: 1, name: 'Checking' })],
  [2, account({ id: 2, name: 'Savings', type: 'savings' })],
]);

const transactionsById = new Map([
  [1, transaction({ id: 1, accountId: 1, transferId: 7 })],
  [2, transaction({ id: 2, accountId: 2, amount: 500, transferId: 7 })],
]);

describe('counterpartTransactionId (TICKET-TRF-06)', () => {
  it('returns the other leg, whichever end it is asked from', () => {
    expect(counterpartTransactionId(transfer, 1)).toBe(2);
    expect(counterpartTransactionId(transfer, 2)).toBe(1);
  });

  it('is undefined for a transaction the transfer does not name', () => {
    expect(counterpartTransactionId(transfer, 99)).toBeUndefined();
  });
});

describe('transferLabelFor (TICKET-TRF-06)', () => {
  it('names the account at the other end, from either leg', () => {
    const outgoing = transactionsById.get(1) as Transaction;
    const incoming = transactionsById.get(2) as Transaction;

    // The row itself is on Checking; what the cell has to say is where the money went.
    expect(transferLabelFor(outgoing, transfer, transactionsById, accountsById)).toBe(
      'Transfer · Savings',
    );
    expect(transferLabelFor(incoming, transfer, transactionsById, accountsById)).toBe(
      'Transfer · Checking',
    );
  });

  it('is undefined for an unlinked transaction, which keeps its category picker', () => {
    // The regression this guards: an uncategorised row must be left exactly as it was, since going
    // and categorising it is the correct thing for the user to do there.
    expect(
      transferLabelFor(
        transaction({ id: 3, transferId: undefined }),
        undefined,
        transactionsById,
        accountsById,
      ),
    ).toBeUndefined();
  });

  it('is undefined when the row claims a transfer but none was passed', () => {
    expect(
      transferLabelFor(
        transaction({ id: 1, transferId: 7 }),
        undefined,
        transactionsById,
        accountsById,
      ),
    ).toBeUndefined();
  });

  it('degrades to a bare "Transfer" when the counterpart leg is gone', () => {
    // Half-deleted pair: still linked as far as this row knows, so it must not read as
    // uncategorised — but there is no account left to name.
    expect(
      transferLabelFor(transactionsById.get(1) as Transaction, transfer, new Map(), accountsById),
    ).toBe('Transfer');
  });

  it('degrades to a bare "Transfer" when the counterpart account is gone', () => {
    expect(
      transferLabelFor(
        transactionsById.get(1) as Transaction,
        transfer,
        transactionsById,
        new Map(),
      ),
    ).toBe('Transfer');
  });
});
