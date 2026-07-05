import { computeFingerprint } from '@/shared/utils';
import type { Account, Transaction } from '@/core/data-access';

/**
 * Pure, framework-free building blocks for the dev-only sample-data seed (TICKET-DEV-01).
 * Kept separate from the Angular service so the seed decision and dataset shape are unit-testable
 * without a real IndexedDB — and so the whole module tree-shakes out of the production path, since
 * it's only ever reached through a dynamic import behind an `isDevMode()` guard in app.config.ts.
 */

/** Account row awaiting an auto-incremented id from Dexie. */
export type SeedAccount = Omit<Account, 'id'>;

/** Transaction row awaiting an auto-incremented id; `fingerprint` here is the *base* hash (no `|occurrence` suffix yet). */
export type SeedTransaction = Omit<Transaction, 'id'>;

export type SeedTransactions = {
  transactions: SeedTransaction[];
  /** Index pairs into `transactions` (`[fromIndex, toIndex]`) that form an own-account transfer. */
  transferPairIndices: [number, number][];
};

/**
 * The single source of the seed decision: seed only in dev mode and only when the database is
 * genuinely empty of user data (zero accounts AND zero transactions). Non-destructive by
 * construction — an existing local dataset is never touched, duplicated, or overwritten.
 */
export const shouldSeed = (input: {
  isDevMode: boolean;
  accountCount: number;
  transactionCount: number;
}): boolean => input.isDevMode && input.accountCount === 0 && input.transactionCount === 0;

const CHECKING_IBAN = 'BE68539007547034';
const SAVINGS_IBAN = 'BE71096123456769';

const pad = (value: number): string => String(value).padStart(2, '0');

/** Local-time YYYY-MM-DD (avoids the UTC day-shift `toISOString()` would introduce). */
const isoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A date `monthsAgo` months before `now`, on the given day-of-month. */
const dayInMonth = (now: Date, monthsAgo: number, day: number): Date =>
  new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);

/**
 * Two sample accounts, dated relative to `now` so the opening balance always predates the seeded
 * transaction spread rather than aging out against hard-coded calendar dates.
 */
export const buildSeedAccounts = (now: Date): SeedAccount[] => {
  const openingDate = isoDate(dayInMonth(now, 4, 1));
  return [
    {
      name: 'Everyday Checking',
      type: 'checking',
      iban: CHECKING_IBAN,
      currency: 'EUR',
      openingBalance: 2500,
      openingBalanceDate: openingDate,
      color: '#2563EB',
      icon: 'wallet',
      archived: false,
    },
    {
      name: 'Rainy Day Savings',
      type: 'savings',
      iban: SAVINGS_IBAN,
      currency: 'EUR',
      openingBalance: 8000,
      openingBalanceDate: openingDate,
      color: '#16A34A',
      icon: 'piggy-bank',
      archived: false,
    },
  ];
};

/**
 * A realistic-enough dataset to exercise the dashboard, transactions table, categorisation and
 * transfers: monthly salary/rent/subscriptions plus a spread of everyday spending across the last
 * four months (including the current one, so the default current-month stats range is never empty),
 * and one checking→savings transfer per month.
 *
 * `fingerprint` is the deterministic *base* hash from `computeFingerprint` — the caller finalises it
 * to the stored `<base>|<occurrence>` form via the same `partitionByFingerprint` an import uses, so
 * seeded rows carry valid fingerprints and never collide with a later real import.
 */
export const buildSeedTransactions = (
  accountIds: [checkingId: number, savingsId: number],
  categoryIdByName: ReadonlyMap<string, number>,
  now: Date,
): SeedTransactions => {
  const [checkingId, savingsId] = accountIds;
  const createdAt = now.toISOString();
  const transactions: SeedTransaction[] = [];
  const transferPairIndices: [number, number][] = [];

  const push = (row: {
    accountId: number;
    bookingDate: string;
    amount: number;
    rawDescription: string;
    categoryName?: string;
    counterpartyName?: string;
    counterpartyIban?: string;
  }): number => {
    const categoryId = row.categoryName ? categoryIdByName.get(row.categoryName) : undefined;
    transactions.push({
      accountId: row.accountId,
      bookingDate: row.bookingDate,
      amount: row.amount,
      currency: 'EUR',
      rawDescription: row.rawDescription,
      counterpartyName: row.counterpartyName,
      counterpartyIban: row.counterpartyIban,
      categoryId,
      createdAt,
      fingerprint: computeFingerprint({
        accountId: row.accountId,
        bookingDate: row.bookingDate,
        amount: row.amount,
        description: row.rawDescription,
        counterpartyIban: row.counterpartyIban,
      }),
    });
    return transactions.length - 1;
  };

  // Four months of activity (oldest → newest); insert order only.
  for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
    const on = (day: number): string => isoDate(dayInMonth(now, monthsAgo, day));

    // Income
    push({
      accountId: checkingId,
      bookingDate: on(1),
      amount: 2800,
      rawDescription: 'Salary — ACME Corp',
      categoryName: 'Salary',
      counterpartyName: 'ACME Corp',
    });

    // Recurring housing / subscriptions / utilities
    push({
      accountId: checkingId,
      bookingDate: on(3),
      amount: -950,
      rawDescription: 'Monthly rent',
      categoryName: 'Housing',
      counterpartyName: 'Vesta Rentals',
    });
    push({
      accountId: checkingId,
      bookingDate: on(4),
      amount: -12.99,
      rawDescription: 'Streaming subscription',
      categoryName: 'Subscriptions',
      counterpartyName: 'Streamflix',
    });
    push({
      accountId: checkingId,
      bookingDate: on(6),
      amount: -64.2,
      rawDescription: 'Electricity & gas',
      categoryName: 'Utilities',
      counterpartyName: 'PowerCo',
    });

    // Everyday spending
    push({
      accountId: checkingId,
      bookingDate: on(8),
      amount: -58.4,
      rawDescription: 'Supermarket',
      categoryName: 'Groceries',
      counterpartyName: 'FreshMarket',
    });
    push({
      accountId: checkingId,
      bookingDate: on(15),
      amount: -73.15,
      rawDescription: 'Supermarket',
      categoryName: 'Groceries',
      counterpartyName: 'FreshMarket',
    });
    push({
      accountId: checkingId,
      bookingDate: on(12),
      amount: -27.5,
      rawDescription: 'Dinner out',
      categoryName: 'Eating Out',
      counterpartyName: 'Trattoria Bella',
    });
    push({
      accountId: checkingId,
      bookingDate: on(18),
      amount: -15.8,
      rawDescription: 'Train ticket',
      categoryName: 'Transport',
      counterpartyName: 'NS Rail',
    });

    // Monthly checking → savings transfer (own-account). Legs carry each other's IBAN so they read
    // as a genuine internal transfer; linked explicitly by the seed service afterwards.
    const fromIndex = push({
      accountId: checkingId,
      bookingDate: on(20),
      amount: -300,
      rawDescription: 'Transfer to savings',
      counterpartyName: 'Rainy Day Savings',
      counterpartyIban: SAVINGS_IBAN,
    });
    const toIndex = push({
      accountId: savingsId,
      bookingDate: on(20),
      amount: 300,
      rawDescription: 'Transfer from checking',
      counterpartyName: 'Everyday Checking',
      counterpartyIban: CHECKING_IBAN,
    });
    transferPairIndices.push([fromIndex, toIndex]);
  }

  // A little savings-side income so the savings account isn't transfer-only.
  push({
    accountId: savingsId,
    bookingDate: isoDate(dayInMonth(now, 2, 28)),
    amount: 6.42,
    rawDescription: 'Savings interest',
    categoryName: 'Other Income',
    counterpartyName: 'Your Bank',
  });

  return { transactions, transferPairIndices };
};
