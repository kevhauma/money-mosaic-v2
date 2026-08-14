import type { Account, Category, Transaction } from '@/core/data-access';
import {
  isExternalContribution,
  isLikelyTransfer,
  isSavingsMovement,
  ownAccountIbans,
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

const noCategories: Category[] = [];

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

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
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

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
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

    const { autoLink } = resolveTransferMatches(transactions, accounts, noCategories, 3, true);
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

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
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

    const { autoLink } = resolveTransferMatches(transactions, accounts, noCategories, 3, true);
    expect(autoLink).toEqual([]);
  });

  it('surfaces ambiguous matches instead of guessing when multiple candidates exist', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 }), account({ id: 3 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-02' }),
      transaction({ id: 3, accountId: 3, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toHaveLength(2);
  });

  it('does not auto-link medium-confidence matches when the setting is disabled, but still surfaces them', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      false,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toHaveLength(1);
  });

  it('ignores already-linked transactions and never pairs a transaction with itself', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01', transferId: 9 }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-01' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('never matches two transactions within the same account', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 2, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-01' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });
});

describe('isExternalContribution / ownAccountIbans', () => {
  const jointAccount = account({
    id: 2,
    type: 'joint',
    coOwners: [{ name: 'Partner', ibans: ['BE68539007547034'] }],
  });

  it('flags a one-sided joint-account inflow from a registered co-owner IBAN', () => {
    const own = ownAccountIbans([account({ id: 1, iban: 'BE01' }), jointAccount]);
    const inflow = transaction({
      id: 1,
      accountId: 2,
      amount: 500,
      counterpartyIban: 'BE68539007547034',
    });

    expect(isExternalContribution(inflow, jointAccount, new Map(), own)).toBe(true);
  });

  it('flags a one-sided joint-account inflow whose counterparty is not a known own IBAN', () => {
    const own = ownAccountIbans([account({ id: 1, iban: 'BE01' }), jointAccount]);
    const inflow = transaction({
      id: 1,
      accountId: 2,
      amount: 500,
      counterpartyIban: 'BE99999999',
    });

    expect(isExternalContribution(inflow, jointAccount, new Map(), own)).toBe(true);
  });

  it('does not flag a joint-account inflow whose counterparty is a known own IBAN', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const own = ownAccountIbans([checking, jointAccount]);
    const inflow = transaction({
      id: 1,
      accountId: 2,
      amount: 500,
      counterpartyIban: 'BE01',
    });

    expect(isExternalContribution(inflow, jointAccount, new Map(), own)).toBe(false);
  });

  it('flags any transaction already tagged with a neutral-kind category, regardless of account', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const categoriesById = new Map([[1, category({ id: 1, kind: 'neutral' })]]);
    const txn = transaction({ id: 1, accountId: 1, amount: -50, categoryId: 1 });

    expect(isExternalContribution(txn, checking, categoriesById, ownAccountIbans([checking]))).toBe(
      true,
    );
  });

  it('does not flag an outflow (spend) from a joint account', () => {
    const own = ownAccountIbans([jointAccount]);
    const outflow = transaction({ id: 1, accountId: 2, amount: -50, counterpartyIban: 'BE99' });

    expect(isExternalContribution(outflow, jointAccount, new Map(), own)).toBe(false);
  });

  it('does not flag an inflow into a non-joint account', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const own = ownAccountIbans([checking]);
    const inflow = transaction({ id: 1, accountId: 1, amount: 50, counterpartyIban: 'BE99' });

    expect(isExternalContribution(inflow, checking, new Map(), own)).toBe(false);
  });
});

describe('resolveTransferMatches: TICKET-TRF-03 external-contribution guard', () => {
  it('does not auto-link a co-owner deposit into a joint account with an unrelated same-amount own transaction', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const joint = account({
      id: 2,
      type: 'joint',
      coOwners: [{ name: 'Partner', ibans: ['BE68539007547034'] }],
    });
    const transactions = [
      transaction({
        id: 1,
        accountId: 2,
        amount: 500,
        bookingDate: '2026-07-01',
        counterpartyIban: 'BE68539007547034',
      }),
      transaction({ id: 2, accountId: 1, amount: -500, bookingDate: '2026-07-02' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      [checking, joint],
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('does not auto-link an inflow from an unregistered non-own IBAN into a joint account', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const joint = account({ id: 2, type: 'joint' });
    const transactions = [
      transaction({
        id: 1,
        accountId: 2,
        amount: 500,
        bookingDate: '2026-07-01',
        counterpartyIban: 'BE99999999',
      }),
      transaction({ id: 2, accountId: 1, amount: -500, bookingDate: '2026-07-02' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      [checking, joint],
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('excludes a neutral-tagged inflow from all auto-matching', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const categories = [category({ id: 1, kind: 'neutral' })];
    const transactions = [
      transaction({
        id: 1,
        accountId: 1,
        amount: 50,
        bookingDate: '2026-07-01',
        categoryId: 1,
      }),
      transaction({ id: 2, accountId: 2, amount: -50, bookingDate: '2026-07-02' }),
    ];

    const { autoLink, ambiguous } = resolveTransferMatches(
      transactions,
      accounts,
      categories,
      3,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('a co-owner IBAN also (mis)configured as an own account IBAN still links via high confidence', () => {
    const checking = account({ id: 1, iban: 'BE68539007547034' });
    const joint = account({
      id: 2,
      type: 'joint',
      coOwners: [{ name: 'Partner', ibans: ['BE68539007547034'] }],
    });
    const transactions = [
      transaction({
        id: 1,
        accountId: 2,
        amount: 500,
        bookingDate: '2026-07-01',
        counterpartyIban: 'BE68539007547034',
      }),
      transaction({
        id: 2,
        accountId: 1,
        amount: -500,
        bookingDate: '2026-07-02',
        counterpartyIban: 'BE68539007547034',
      }),
    ];

    const { autoLink } = resolveTransferMatches(
      transactions,
      [checking, joint],
      noCategories,
      3,
      true,
    );
    // The pair is what this asserts, not its orientation: since TICKET-TRF-05 the suspected
    // contribution no longer initiates the one-sided pass, so the own-account leg is `from`.
    expect(autoLink).toHaveLength(1);
    expect(autoLink[0]).toMatchObject({ method: 'auto-iban', confidence: 'high' });
    expect([autoLink[0].from.id, autoLink[0].to.id].sort((a, b) => a! - b!)).toEqual([1, 2]);
  });

  it('still links a genuine own-account transfer into a joint account (high confidence)', () => {
    const checking = account({ id: 1, iban: 'BE01' });
    const joint = account({ id: 2, type: 'joint', iban: 'BE02' });
    const transactions = [
      transaction({
        id: 1,
        accountId: 1,
        amount: -500,
        bookingDate: '2026-07-01',
        counterpartyIban: 'BE02',
      }),
      transaction({
        id: 2,
        accountId: 2,
        amount: 500,
        bookingDate: '2026-07-02',
        counterpartyIban: 'BE01',
      }),
    ];

    const { autoLink } = resolveTransferMatches(
      transactions,
      [checking, joint],
      noCategories,
      3,
      true,
    );
    expect(autoLink).toEqual([
      { from: transactions[0], to: transactions[1], method: 'auto-iban', confidence: 'high' },
    ]);
  });

  it('still medium-matches two genuine own non-joint accounts (regression)', () => {
    const accounts = [account({ id: 1 }), account({ id: 2 })];
    const transactions = [
      transaction({ id: 1, accountId: 1, amount: -50, bookingDate: '2026-07-01' }),
      transaction({ id: 2, accountId: 2, amount: 50, bookingDate: '2026-07-03' }),
    ];

    const { autoLink } = resolveTransferMatches(transactions, accounts, noCategories, 3, true);
    expect(autoLink).toEqual([
      {
        from: transactions[0],
        to: transactions[1],
        method: 'auto-amountdate',
        confidence: 'medium',
      },
    ]);
  });
});

describe('resolveTransferMatches: TICKET-TRF-05 mutual IBAN corroboration', () => {
  const checking = account({ id: 1, iban: 'BE01' });
  const joint = account({
    id: 2,
    type: 'joint',
    iban: 'BE02',
    coOwners: [{ name: 'Partner', ibans: ['BE99'] }],
  });

  /** My outflow into the joint pot: names the joint account, so it corroborates every credit on it. */
  const myOutflow = transaction({
    id: 1,
    accountId: 1,
    amount: -500,
    bookingDate: '2026-07-05',
    counterpartyIban: 'BE02',
  });
  /** My matching deposit leg — names my checking account back, so the pair is mutually corroborated. */
  const myDepositLeg = transaction({
    id: 2,
    accountId: 2,
    amount: 500,
    bookingDate: '2026-07-05',
    counterpartyIban: 'BE01',
  });
  /** A co-owner's same-amount contribution, closer in date than my own leg on purpose. */
  const coOwnerContribution = transaction({
    id: 3,
    accountId: 2,
    amount: 500,
    bookingDate: '2026-07-04',
    counterpartyIban: 'BE99',
  });

  const linkedPairs = (transactions: Transaction[]) =>
    resolveTransferMatches(transactions, [checking, joint], noCategories, 5, true).autoLink.map(
      (candidate) => [candidate.from.id, candidate.to.id].sort((a, b) => a! - b!),
    );

  it('links my own two legs and leaves a co-owner contribution unlinked, whatever the input order', () => {
    expect(linkedPairs([myOutflow, myDepositLeg, coOwnerContribution])).toEqual([[1, 2]]);
    // The contribution first: it used to confirm one-sidedly against my outflow and consume it.
    expect(linkedPairs([coOwnerContribution, myOutflow, myDepositLeg])).toEqual([[1, 2]]);
  });

  it('still prefers my own leg when the contribution carries no counterparty IBAN at all', () => {
    const anonymousContribution = transaction({
      ...coOwnerContribution,
      counterpartyIban: undefined,
    });

    expect(linkedPairs([myOutflow, myDepositLeg, anonymousContribution])).toEqual([[1, 2]]);
    expect(linkedPairs([anonymousContribution, myOutflow, myDepositLeg])).toEqual([[1, 2]]);
  });

  it('excludes a neutral-tagged inflow from high-confidence matching even when its counterparty is an own account', () => {
    const categories = [category({ id: 1, kind: 'neutral' })];
    const taggedContribution = transaction({
      id: 3,
      accountId: 2,
      amount: 500,
      bookingDate: '2026-07-05',
      counterpartyIban: 'BE01',
      categoryId: 1,
    });

    const { autoLink, ambiguous } = resolveTransferMatches(
      [myOutflow, taggedContribution],
      [checking, joint],
      categories,
      5,
      true,
    );
    expect(autoLink).toEqual([]);
    expect(ambiguous).toEqual([]);
  });

  it('falls back to the closest-by-date candidate when every candidate is a suspected contribution', () => {
    // My own leg carries no counterparty IBAN either, so the fallback heuristic flags it too and
    // nothing distinguishes the two credits — pre-TRF-05 behaviour is deliberately kept here, and
    // the contribution wins purely on date proximity.
    const undocumentedOwnLeg = transaction({
      ...myDepositLeg,
      counterpartyIban: undefined,
      bookingDate: '2026-07-02',
    });
    const sameDayContribution = transaction({ ...coOwnerContribution, bookingDate: '2026-07-05' });

    expect(linkedPairs([myOutflow, undocumentedOwnLeg, sameDayContribution])).toEqual([[1, 3]]);
  });

  it('still links a lone one-sided IBAN-confirmed pair at high confidence (regression)', () => {
    const soleCredit = transaction({
      id: 2,
      accountId: 2,
      amount: 500,
      bookingDate: '2026-07-06',
    });

    const { autoLink } = resolveTransferMatches(
      [myOutflow, soleCredit],
      [checking, joint],
      noCategories,
      5,
      true,
    );
    expect(autoLink).toEqual([
      { from: myOutflow, to: soleCredit, method: 'auto-iban', confidence: 'high' },
    ]);
  });
});
