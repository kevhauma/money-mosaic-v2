import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountsRepository, type Account, type ImportBatch } from '@/core/data-access';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { ImportHistoryComponent } from './import-history.component';

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

describe('ImportHistoryComponent (TICKET-IMP-13)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<ImportHistoryComponent>;
  let host: HTMLElement;

  const previewUndo = vi.fn();
  const undoImport = vi.fn().mockResolvedValue(undefined);

  const setup = async (batches: ImportBatch[], hydrated = true): Promise<void> => {
    vi.clearAllMocks();
    previewUndo.mockResolvedValue({
      rowCount: 10,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 0,
    });

    await TestBed.configureTestingModule({
      imports: [ImportHistoryComponent],
      providers: [
        { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue([account]) } },
        {
          provide: ImportBatchesStore,
          useValue: {
            batches: () => batches,
            hydrated: () => hydrated,
            previewUndo,
            undoImport,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportHistoryComponent);
    await TestBed.inject(AccountsStore).hydrate();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  const undoButton = (index = 0): HTMLButtonElement =>
    [...host.querySelectorAll('button')].filter((button) =>
      button.getAttribute('aria-label')?.startsWith('Undo the import'),
    )[index] as HTMLButtonElement;

  it('lists each batch with its date, file, account and row count', async () => {
    await setup([batch()]);

    const cells = [...host.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim()),
    );

    expect(cells).toEqual([['14/08/2026', 'august.csv', 'Everyday Checking', '10 rows', 'Undo']]);
  });

  it('says nothing has been imported yet, rather than showing an empty table', async () => {
    await setup([]);

    expect(host.querySelector('table')).toBeNull();
    expect(host.textContent).toContain('Nothing imported yet');
  });

  it('does not claim an empty history while the batches are still loading', async () => {
    // The same trap TICKET-TRF-06 removed elsewhere: an un-hydrated store looks exactly like an
    // empty one, and only one of those is a fact.
    await setup([], false);

    expect(host.textContent).toContain('Checking what you have imported before');
    expect(host.textContent).not.toContain('Nothing imported yet');
  });

  it('reads the cost of the undo before opening the dialog, so the text never changes under the reader', async () => {
    await setup([batch()]);

    undoButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(previewUndo).toHaveBeenCalledWith(1);
    expect(undoImport).not.toHaveBeenCalled();
    expect(host.querySelector('mm-confirm-dialog')?.textContent).toContain(
      'deletes the 10 transactions imported from august.csv',
    );
  });

  it('surfaces since-edited rows in the dialog before the undo proceeds', async () => {
    await setup([batch()]);
    previewUndo.mockResolvedValue({
      rowCount: 10,
      manuallyCategorisedCount: 2,
      transferLinkedCount: 1,
    });

    undoButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = host.querySelector('mm-confirm-dialog')?.textContent ?? '';
    expect(dialog).toContain('2 of them have categories you set by hand');
    expect(dialog).toContain('1 is linked as a transfer');
  });

  it('undoes the batch the button named, once confirmed', async () => {
    await setup([
      batch({ id: 7, fileName: 'july.csv', importedAt: '2026-07-02T00:00:00.000Z' }),
      batch({ id: 8, fileName: 'august.csv', importedAt: '2026-08-14T00:00:00.000Z' }),
    ]);

    // Newest first, so index 1 is the older July batch — the button's own aria-label says which.
    expect(undoButton(1).getAttribute('aria-label')).toContain('july.csv');
    undoButton(1).click();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      [...host.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Undo import',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(undoImport).toHaveBeenCalledTimes(1);
    expect(undoImport.mock.calls[0][0].id).toBe(7);
  });

  it('states that an already-undone batch has nothing left to remove', async () => {
    await setup([batch()]);
    previewUndo.mockResolvedValue({
      rowCount: 0,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 0,
    });

    undoButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('mm-confirm-dialog')?.textContent).toContain(
      'Nothing left to remove',
    );
  });
});
