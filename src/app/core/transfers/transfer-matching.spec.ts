import type { Account, Transaction } from '@/core/data-access';
import {
  isLikelyTransfer,
  isSavingsMovement,
  resolveTransferMatches,
  savingsAccountIbans,
} from './transfer-matching';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#000000',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -100,
  currency: 'EUR',
  rawDescription: 'Transfer',
  fingerprint: 'fp',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('isLikelyTransfer', () => {
  it('flags an unlinked transaction whose counterparty IBAN is a known own account (FR-TRF-5)', () => {
    const ownIbans = new Set(['BE01']);
    expect(isLikelyTransfer(transaction({ counterpartyIban: 'BE01' }), ownIbans)).toBe(true);
  });

  it('does not flag an already-linked transaction', () => {
    const ownIbans = new Set(['BE01']);
    expect(
      isLikelyTransfer(transaction({ counterpartyIban: 'BE01', transferId: 5 }), ownIbans),
    ).toBe(false);
  });

  it('does not flag a counterparty that is not a known own account', () => {
    const ownIbans = new Set(['BE01']);
    expect(isLikelyTransfer(transaction({ counterpartyIban: 'BE99' }), ownIbans)).toBe(false);
  });

  it('flags a match even when the counterparty IBAN differs in spacing/case (TICKET-TRF-04)', () => {
    const ownIbans = new Set(['BE01']);
    expect(isLikelyTransfer(transaction({ counterpartyIban: 'be 01' }), ownIbans)).toBe(true);
  });
});

describe('isSavingsMovement / savingsAccountIbans', () => {
  it('flags a savings movement even when the stored account IBAN and transaction counterparty IBAN differ in spacing/case (TICKET-TRF-04)', () => {
    const accounts = [account({ id: 1, type: 'savings', iban: 'be 01 23' })];
    const ownSavingsIbans = savingsAccountIbans(accounts);

    expect(isSavingsMovement(transaction({ counterpartyIban: 'BE0123' }), ownSavingsIbans)).toBe(
      true,
    );
  });

  it('still matches when both sides are already formatted identically (regression)', () => {
    const accounts = [account({ id: 1, type: 'savings', iban: 'BE0123' })];
    const ownSavingsIbans = savingsAccountIbans(accounts);

    expect(isSavingsMovement(transaction({ counterpartyIban: 'BE0123' }), ownSavingsIbans)).toBe(
      true,
    );
  });

  it('does not flag a counterparty that is not a known savings account', () => {
    const accounts = [account({ id: 1, type: 'savings', iban: 'BE0123' })];
    const ownSavingsIbans = savingsAccountIbans(accounts);

    expect(isSavingsMovement(transaction({ counterpartyIban: 'BE9999' }), ownSavingsIbans)).toBe(
      false,
    );
  });
});

describe('resolveTransferMatches: high confidence (IBAN)', () => {
  it('auto-links a pair whose counterparty IBAN matches the other account (FR-TRF-3)', () => {
    const accounts = [account({ id: 1, iban: 'BE01' }), account({ id: 2, iban: 'BE02' })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -100, counterpartyIban: 'BE02' }),
      transaction({ id: 2, accountId: 2, amount: 100, bookingDate: '2026-07-02' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([
      { from: transactions[0], to: transactions[1], method: 'auto-iban', confidence: 'high' },
    ]);
    expect(ambiguous).toEqual([]);
  });

  it('auto-links a pair whose counterparty IBAN matches but differs in spacing/case (TICKET-TRF-04)', () => {
    const accounts = [account({ id: 1, iban: 'BE 01' }), account({ id: 2, iban: 'be02' })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -100, counterpartyIban: 'BE02' }),
      transaction({ id: 2, accountId: 2, amount: 100, bookingDate: '2026-07-02' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([
      { from: transactions[0], to: transactions[1], method: 'auto-iban', confidence: 'high' },
    ]);
    expect(ambiguous).toEqual([]);
  });

  it('picks the closest-by-date candidate when several IBAN-confirmed matches exist', () => {
    const accounts = [account({ id: 1, iban: 'BE01' }), account({ id: 2, iban: 'BE02' })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -100, counterpartyIban: 'BE02' }),
      transaction({
        id: 2,
        accountId: 2,
        amount: 100,
        bookingDate: '2026-07-03',
      }),
      transaction({
        id: 3,
        accountId: 2,
        amount: 100,
        bookingDate: '2026-07-01',
      }),
    ];

    const { autoLink } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toHaveLength(1);
    expect(autoLink[0].to.id).toBe(3);
  });
});

describe('resolveTransferMatches: medium confidence (amount + date only)', () => {
  it('auto-links a unique opposite-sign, equal-amount pair within the window', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([
      {
        from: transactions[0],
        to: transactions[1],
        method: 'auto-amountdate',
        confidence: 'medium',
      },
    ]);
    expect(ambiguous).toEqual([]);
  });

  it('does not auto-link when outside the day window', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-10' }),
    ];

    const { autoLink } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([]);
  });

  it('surfaces ambiguous matches instead of guessing when multiple candidates exist', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 }), account({ id: 3 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-02' }),
      transaction({ id: 3, accountId: 3, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([]);
    expect(ambiguous).toHaveLength(2);
  });

  it('does not auto-link medium-confidence matches when the setting is disabled, but still surfaces them', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, false);
    expect(autoLink).toEqual([]);
    expect(ambiguous).toHaveLength(1);
  });

  it('ignores already-linked transactions and never pairs a transaction with itself', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01', transferId: 9 }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-01' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('never matches two transactions within the same account', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 2, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-01' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(transactions, accounts, 3, true);
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });
});
