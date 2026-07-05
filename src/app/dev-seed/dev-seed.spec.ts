import { computeFingerprint } from '@/shared/utils';
import { buildSeedAccounts, buildSeedTransactions, shouldSeed } from './dev-seed';

// Mirrors the DEFAULT_CATEGORIES names the seed references, with arbitrary stable ids.
const CATEGORY_IDS = new Map<string, number>([
  ['Groceries', 1],
  ['Shopping', 2],
  ['Subscriptions', 3],
  ['Housing', 4],
  ['Transport', 5],
  ['Eating Out', 6],
  ['Utilities', 7],
  ['Health', 8],
  ['Salary', 9],
  ['Other Income', 10],
]);

const NOW = new Date(2026, 5, 15); // 15 June 2026, local time

describe('shouldSeed: dev-mode empty-database gate', () => {
  it('seeds when in dev mode with an empty database (zero accounts and zero transactions)', () => {
    expect(shouldSeed({ isDevMode: true, accountCount: 0, transactionCount: 0 })).toBe(true);
  });

  it('is a no-op when accounts already exist', () => {
    expect(shouldSeed({ isDevMode: true, accountCount: 2, transactionCount: 0 })).toBe(false);
  });

  it('is a no-op when transactions already exist', () => {
    expect(shouldSeed({ isDevMode: true, accountCount: 0, transactionCount: 20 })).toBe(false);
  });

  it('is a no-op when dev mode is off, even on an empty database', () => {
    expect(shouldSeed({ isDevMode: false, accountCount: 0, transactionCount: 0 })).toBe(false);
  });
});

describe('buildSeedAccounts: sample accounts', () => {
  it('produces at least two accounts with opening dates predating the transaction spread', () => {
    const accounts = buildSeedAccounts(NOW);
    expect(accounts.length).toBeGreaterThanOrEqual(2);
    // 4 months before June 2026.
    expect(accounts.every((account) => account.openingBalanceDate === '2026-02-01')).toBe(true);
    expect(accounts.every((account) => account.currency === 'EUR')).toBe(true);
  });
});

describe('buildSeedTransactions: sample dataset', () => {
  const { transactions, transferPairIndices } = buildSeedTransactions([1, 2], CATEGORY_IDS, NOW);

  it('produces a date-spread of at least 20 transactions', () => {
    expect(transactions.length).toBeGreaterThanOrEqual(20);
  });

  it('spreads bookings across several months including the current one', () => {
    const months = new Set(transactions.map((transaction) => transaction.bookingDate.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(3);
    expect(months.has('2026-06')).toBe(true);
  });

  it('references several distinct categories', () => {
    const categoryIds = new Set(
      transactions
        .map((transaction) => transaction.categoryId)
        .filter((id): id is number => id != null),
    );
    expect(categoryIds.size).toBeGreaterThanOrEqual(5);
  });

  it('gives every transaction the required fields and a deterministic base fingerprint', () => {
    for (const transaction of transactions) {
      expect(transaction.accountId).toBeGreaterThan(0);
      expect(transaction.bookingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(transaction.amount)).toBe(true);
      expect(transaction.rawDescription.length).toBeGreaterThan(0);
      expect(transaction.currency).toBe('EUR');
      expect(transaction.createdAt).toBe(NOW.toISOString());
      expect(transaction.fingerprint).toBe(
        computeFingerprint({
          accountId: transaction.accountId,
          bookingDate: transaction.bookingDate,
          amount: transaction.amount,
          description: transaction.rawDescription,
          counterpartyIban: transaction.counterpartyIban,
        }),
      );
    }
  });

  it('is deterministic for a given `now`', () => {
    const again = buildSeedTransactions([1, 2], CATEGORY_IDS, NOW);
    expect(again.transactions.map((t) => t.fingerprint)).toEqual(
      transactions.map((t) => t.fingerprint),
    );
  });

  it('includes at least one own-account transfer pair (opposite amounts, same date, cross-account)', () => {
    expect(transferPairIndices.length).toBeGreaterThanOrEqual(1);
    for (const [fromIndex, toIndex] of transferPairIndices) {
      const from = transactions[fromIndex];
      const to = transactions[toIndex];
      expect(from.accountId).toBe(1);
      expect(to.accountId).toBe(2);
      expect(from.amount).toBe(-to.amount);
      expect(from.bookingDate).toBe(to.bookingDate);
    }
  });
});
