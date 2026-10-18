import type { Account, Transaction, Transfer } from '@/core/data-access';
import {
  counterpartAccountId,
  counterpartTransactionId,
  type CounterpartContext,
} from './transfer-counterpart';
import { savingsAccountIbans } from './transfer-matching';

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

const accounts = [
  account({ id: 1, name: 'Checking', iban: 'BE11 1111 1111 1111' }),
  account({ id: 2, name: 'Savings', type: 'savings', iban: 'BE22 2222 2222 2222' }),
];

const context: CounterpartContext = {
  transfersById: new Map([[7, transfer]]),
  transactionsById: new Map([
    [1, transaction({ id: 1, accountId: 1, transferId: 7 })],
    [2, transaction({ id: 2, accountId: 2, amount: 500, transferId: 7 })],
  ]),
  accounts,
  ownSavingsIbans: savingsAccountIbans(accounts),
};

describe('counterpartTransactionId (TICKET-TRF-06)', () => {
  it('returns the other leg, whichever end it is asked from', () => {
    expect(counterpartTransactionId(transfer, 1)).toBe(2);
    expect(counterpartTransactionId(transfer, 2)).toBe(1);
  });

  it('is undefined for a transaction the transfer does not name', () => {
    expect(counterpartTransactionId(transfer, 99)).toBeUndefined();
  });
});

describe('counterpartAccountId', () => {
  it("names the counterpart leg's account for a linked transfer, from either leg", () => {
    expect(counterpartAccountId(context.transactionsById.get(1)!, context)).toBe(2);
    expect(counterpartAccountId(context.transactionsById.get(2)!, context)).toBe(1);
  });

  it('names the savings account an unlinked savings movement pays, IBAN spacing aside', () => {
    const toSavings = transaction({ id: 3, counterpartyIban: 'be22222222222222' });

    expect(counterpartAccountId(toSavings, context)).toBe(2);
  });

  it('is undefined for an ordinary payment, and for a linked leg whose pair is gone', () => {
    expect(
      counterpartAccountId(transaction({ id: 4, counterpartyIban: 'BE99' }), context),
    ).toBeUndefined();
    expect(
      counterpartAccountId(transaction({ id: 1, transferId: 7 }), {
        ...context,
        transactionsById: new Map(),
      }),
    ).toBeUndefined();
    expect(counterpartAccountId(transaction({ id: 1, transferId: 8 }), context)).toBeUndefined();
  });
});
