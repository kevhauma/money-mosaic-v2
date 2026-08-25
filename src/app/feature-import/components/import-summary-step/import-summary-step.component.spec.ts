import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountsRepository, type Account, type ImportBatch } from '@/core/data-access';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { ImportSummaryStepComponent } from './import-summary-step.component';

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

const batch: ImportBatch = {
  id: 4,
  accountId: 1,
  fileName: 'august.csv',
  importedAt: '2026-08-14T09:30:00.000Z',
  rowsRead: 12,
  rowsAdded: 10,
  rowsDuplicate: 2,
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
};

describe('ImportSummaryStepComponent: undo states its real cost (TICKET-IMP-13)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<ImportSummaryStepComponent>;
  let host: HTMLElement;

  const previewUndo = vi.fn();

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    previewUndo.mockResolvedValue({
      rowCount: 10,
      manuallyCategorisedCount: 2,
      transferLinkedCount: 1,
    });

    await TestBed.configureTestingModule({
      imports: [ImportSummaryStepComponent],
      providers: [
        provideRouter([]),
        { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue([account]) } },
        { provide: ImportBatchesStore, useValue: { previewUndo } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportSummaryStepComponent);
    fixture.componentRef.setInput('batch', batch);
    await TestBed.inject(AccountsStore).hydrate();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  const undoTrigger = (): HTMLButtonElement =>
    [...host.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Undo this import',
    ) as HTMLButtonElement;

  it('states the same cost the import history does, not a weaker sentence of its own', async () => {
    await setup();

    undoTrigger().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(previewUndo).toHaveBeenCalledWith(4);
    const dialog = host.querySelector('mm-confirm-dialog')?.textContent ?? '';
    expect(dialog).toContain('deletes the 10 transactions imported from august.csv');
    expect(dialog).toContain('2 of them have categories you set by hand');
    expect(dialog).toContain('1 is linked as a transfer');
    // The sentence it used to hardcode said none of that.
    expect(dialog).not.toContain('This removes every transaction this import added');
  });

  it('still emits undo once confirmed', async () => {
    await setup();
    let undone = 0;
    fixture.componentInstance.undo.subscribe(() => (undone += 1));

    undoTrigger().click();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      [...host.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Undo import',
      ) as HTMLButtonElement
    ).click();

    expect(undone).toBe(1);
  });
});
