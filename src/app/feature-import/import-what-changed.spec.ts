import type { Account, ImportBatch, Transaction } from '@/core/data-access';
import type { CommitImportResult } from '@/core/import';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  formatImportPeriod,
  summariseImport,
  toImportFileLines,
  type ImportWhatChangedContext,
} from './import-what-changed';

const SAVINGS_IBAN = 'BE71096123456769';

const transaction = (id: number, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  accountId: 1,
  bookingDate: '2026-09-10',
  amount: -10,
  currency: 'EUR',
  rawDescription: `row ${id}`,
  fingerprint: `fp-${id}`,
  createdAt: '2026-10-18T10:00:00.000Z',
  ...overrides,
});

/** The backlog's own rule (FR-CAT-5), as `TransactionsStore.uncategorisedTransactions` applies it. */
const contextFor = (transactions: Transaction[]): ImportWhatChangedContext => ({
  transactionsById: new Map(transactions.map((t) => [t.id!, t])),
  uncategorisedIds: new Set(
    transactions
      .filter(
        (t) => t.categoryId == null && t.transferId == null && t.counterpartyIban !== SAVINGS_IBAN,
      )
      .map((t) => t.id!),
  ),
  ownSavingsIbans: new Set([SAVINGS_IBAN]),
});

// A month's import: salary in, two rule-sorted spends, one uncategorised spend, one leg of a linked
// transfer and one unlinked move into savings.
const RUN: Transaction[] = [
  transaction(1, { amount: 3000, bookingDate: '2026-09-25', categoryId: 7 }),
  transaction(2, { amount: -80, bookingDate: '2026-09-01', categoryId: 3 }),
  transaction(3, { amount: -20, bookingDate: '2026-09-30', categoryId: 3 }),
  transaction(4, { amount: -45.5, bookingDate: '2026-09-12' }),
  transaction(5, { amount: -250, bookingDate: '2026-09-15', transferId: 9 }),
  transaction(6, { amount: -600, bookingDate: '2026-09-20', counterpartyIban: SAVINGS_IBAN }),
];
const RUN_IDS = RUN.map((t) => t.id!);

describe('summariseImport: what one import run changed (TICKET-IMP-18)', () => {
  it('counts the added transactions and the period they cover', () => {
    const summary = summariseImport(RUN_IDS, contextFor(RUN));

    expect(summary.addedCount).toBe(6);
    expect(summary.period).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('totals money in and out without the linked transfer or the savings movement', () => {
    const summary = summariseImport(RUN_IDS, contextFor(RUN));

    expect(summary.moneyIn).toBe(3000);
    // -80 - 20 - 45.5; the -250 transfer leg and the -600 move to savings are neither.
    expect(summary.moneyOut).toBe(-145.5);
  });

  it('splits the run into categorised, needs a category and transfers linked', () => {
    const summary = summariseImport(RUN_IDS, contextFor(RUN));

    expect(summary.categorisedCount).toBe(3);
    // Only row 4: the transfer leg and the savings movement never need a category.
    expect(summary.needsCategoryCount).toBe(1);
    expect(summary.transfersLinkedCount).toBe(1);
  });

  it('follows the user as they sort: a category set by hand leaves the backlog, not into "automatically"', () => {
    const sorted = RUN.map((t) => (t.id === 4 ? { ...t, categoryId: 5, categoryManual: true } : t));

    const summary = summariseImport(RUN_IDS, contextFor(sorted));

    expect(summary.needsCategoryCount).toBe(0);
    expect(summary.categorisedCount).toBe(3);
  });

  it('drops a transaction that is no longer in the store from every figure', () => {
    const summary = summariseImport(RUN_IDS, contextFor(RUN.filter((t) => t.id !== 1)));

    expect(summary.addedCount).toBe(5);
    expect(summary.moneyIn).toBe(0);
    expect(summary.categorisedCount).toBe(2);
    expect(summary.period).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('reports no period and zero totals when nothing is left', () => {
    const summary = summariseImport([], contextFor(RUN));

    expect(summary).toEqual({
      addedCount: 0,
      period: null,
      moneyIn: 0,
      moneyOut: 0,
      categorisedCount: 0,
      needsCategoryCount: 0,
      transfersLinkedCount: 0,
    });
  });
});

describe('formatImportPeriod: the headline period', () => {
  withCleanFormatSettings();

  it('names a whole calendar month', () => {
    expect(formatImportPeriod({ from: '2026-09-01', to: '2026-09-30' })).toBe('September 2026');
  });

  it('states both dates for an arbitrary span, and one for a single day', () => {
    const span = formatImportPeriod({ from: '2026-09-03', to: '2026-09-28' });
    expect(span).toContain(' – ');
    expect(formatImportPeriod({ from: '2026-09-03', to: '2026-09-03' })).not.toContain(' – ');
  });
});

describe('toImportFileLines: one line per file', () => {
  const account: Account = {
    id: 1,
    name: 'Everyday Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2026-01-01',
    color: '#7F77DD',
    icon: 'wallet',
    archived: false,
  };
  const batch = (overrides: Partial<ImportBatch>): ImportBatch => ({
    id: 4,
    accountId: 1,
    fileName: 'september.csv',
    importedAt: '2026-10-18T09:30:00.000Z',
    rowsRead: 12,
    rowsAdded: 10,
    rowsDuplicate: 2,
    dateFrom: '2026-09-01',
    dateTo: '2026-09-30',
    ...overrides,
  });
  const result = (overrides: Partial<ImportBatch>): CommitImportResult => ({
    batch: batch(overrides),
    addedTransactions: [],
    duplicateCount: 0,
    backfilledTransactions: [],
  });

  it('names the account and states what was added and skipped', () => {
    const [line] = toImportFileLines([result({})], new Map([[1, account]]));

    expect(line.accountName).toBe('Everyday Checking');
    expect(line.caption).toBe('september.csv · 10 added · 2 already here, skipped');
    expect(line.undoAriaLabel).toBe('Undo the import of september.csv into Everyday Checking');
  });

  it('leaves the skipped half out when nothing was skipped', () => {
    const [line] = toImportFileLines([result({ rowsDuplicate: 0 })], new Map([[1, account]]));

    expect(line.caption).toBe('september.csv · 10 added');
  });
});
