import type { Account, ImportBatch } from '@/core/data-access';
import type { UndoImportImpact } from '@/core/import';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { toImportHistoryRows, undoImportMessage } from './import-history-rows';

const account = (id: number, name: string): Account => ({
  id,
  name,
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#7F77DD',
  icon: 'wallet',
  archived: false,
});

const batch = (overrides: Partial<ImportBatch> = {}): ImportBatch => ({
  id: 1,
  accountId: 1,
  fileName: 'august.csv',
  importedAt: '2026-08-14T09:30:00.000Z',
  rowsRead: 12,
  rowsAdded: 10,
  rowsDuplicate: 2,
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
  ...overrides,
});

const ACCOUNTS = new Map([[1, account(1, 'Everyday Checking')]]);

const impact = (overrides: Partial<UndoImportImpact> = {}): UndoImportImpact => ({
  rowCount: 10,
  manuallyCategorisedCount: 0,
  transferLinkedCount: 0,
  ...overrides,
});

describe('toImportHistoryRows (TICKET-IMP-13)', () => {
  withCleanFormatSettings();

  it('lists a batch with its date, file, account and row count', () => {
    expect(toImportHistoryRows([batch()], ACCOUNTS)).toEqual([
      {
        batchId: 1,
        importedOn: '14/08/2026',
        fileName: 'august.csv',
        accountName: 'Everyday Checking',
        rowsAdded: 10,
        rowsLabel: '10 rows',
        undoAriaLabel: 'Undo the import of august.csv into Everyday Checking',
      },
    ]);
  });

  it('orders newest first, which is the order an undo is usually wanted in', () => {
    const rows = toImportHistoryRows(
      [
        batch({ id: 1, fileName: 'june.csv', importedAt: '2026-06-01T00:00:00.000Z' }),
        batch({ id: 2, fileName: 'august.csv', importedAt: '2026-08-14T00:00:00.000Z' }),
        batch({ id: 3, fileName: 'july.csv', importedAt: '2026-07-02T00:00:00.000Z' }),
      ],
      ACCOUNTS,
    );

    expect(rows.map((row) => row.fileName)).toEqual(['august.csv', 'july.csv', 'june.csv']);
  });

  it('pluralises the row count', () => {
    expect(toImportHistoryRows([batch({ rowsAdded: 1 })], ACCOUNTS)[0].rowsLabel).toBe('1 row');
  });

  it('still lists a batch whose account was deleted, named as such', () => {
    // Dropping it would make the history quietly incomplete, which is worse than an odd name.
    const rows = toImportHistoryRows([batch({ accountId: 99 })], ACCOUNTS);

    expect(rows[0].accountName).toBe('Deleted account');
  });
});

describe('undoImportMessage (TICKET-IMP-13)', () => {
  withCleanFormatSettings();

  const row = () => toImportHistoryRows([batch()], ACCOUNTS)[0];

  it('says what goes, and that other imports are untouched', () => {
    const message = undoImportMessage(row(), impact());

    expect(message).toContain('deletes the 10 transactions imported from august.csv');
    expect(message).toContain('Transactions from other imports are untouched');
    expect(message).toContain('This cannot itself be undone.');
  });

  it('surfaces hand-set categories, and says re-importing will not bring them back', () => {
    const message = undoImportMessage(row(), impact({ manuallyCategorisedCount: 3 }));

    expect(message).toContain('3 of them have categories you set by hand');
    expect(message).toContain('brings the rows back, not those categories');
  });

  it('surfaces transfer links, and states what happens to the other side', () => {
    const message = undoImportMessage(row(), impact({ transferLinkedCount: 2 }));

    expect(message).toContain('2 are linked as a transfer');
    expect(message).toContain('the other side of each link stays, as an ordinary transaction');
  });

  it('says nothing is left rather than "removes 0 rows" for an already-undone batch', () => {
    const message = undoImportMessage(row(), impact({ rowCount: 0 }));

    expect(message).toContain('Nothing left to remove');
    expect(message).not.toContain('0 transaction');
  });

  it('keeps the singular readable', () => {
    const message = undoImportMessage(
      row(),
      impact({ rowCount: 1, manuallyCategorisedCount: 1, transferLinkedCount: 1 }),
    );

    expect(message).toContain('deletes the 1 transaction imported');
    expect(message).toContain('1 of them has a category you set by hand');
    expect(message).toContain('1 is linked as a transfer');
  });
});
