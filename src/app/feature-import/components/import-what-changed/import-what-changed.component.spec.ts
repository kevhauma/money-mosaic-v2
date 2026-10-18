import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  type Account,
  type ImportBatch,
  type Transaction,
} from '@/core/data-access';
import type { CommitImportResult } from '@/core/import';
import { AccountsStore, ImportBatchesStore, TransactionsStore } from '@/core/state';
import { formatCurrency } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';
import { ImportWhatChangedComponent } from './import-what-changed.component';

const SAVINGS_IBAN = 'BE71096123456769';

const checking: Account = {
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
const savings: Account = {
  ...checking,
  id: 2,
  name: 'Savings',
  type: 'savings',
  iban: SAVINGS_IBAN,
};

const transaction = (id: number, overrides: Partial<Transaction>): Transaction => ({
  id,
  accountId: 1,
  bookingDate: '2026-09-10',
  amount: -10,
  currency: 'EUR',
  rawDescription: `row ${id}`,
  fingerprint: `fp-${id}`,
  createdAt: '2026-10-18T10:00:00.000Z',
  importBatchId: 4,
  ...overrides,
});

const ADDED: Transaction[] = [
  transaction(1, { amount: 3000, bookingDate: '2026-09-01', categoryId: 7 }),
  transaction(2, { amount: -45.5, bookingDate: '2026-09-30' }),
  transaction(3, { amount: -250, transferId: 9 }),
  transaction(4, { amount: -600, counterpartyIban: SAVINGS_IBAN }),
];

const batch = (id: number, fileName: string): ImportBatch => ({
  id,
  accountId: 1,
  fileName,
  importedAt: '2026-10-18T09:30:00.000Z',
  rowsRead: 6,
  rowsAdded: 4,
  rowsDuplicate: 2,
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
});

const RESULTS: CommitImportResult[] = [
  {
    batch: batch(4, 'september.csv'),
    addedTransactions: ADDED,
    duplicateCount: 2,
    backfilledTransactions: [],
  },
  {
    batch: batch(5, 'october.csv'),
    addedTransactions: [],
    duplicateCount: 0,
    backfilledTransactions: [],
  },
];

describe('ImportWhatChangedComponent: where an import ends (TICKET-IMP-18)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<ImportWhatChangedComponent>;
  let host: HTMLElement;
  const previewUndo = vi.fn();

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    previewUndo.mockResolvedValue({
      rowCount: 4,
      manuallyCategorisedCount: 0,
      transferLinkedCount: 1,
    });

    await TestBed.configureTestingModule({
      imports: [ImportWhatChangedComponent],
      providers: [
        ...provideFakeApi(),
        provideRouter([]),
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checking, savings]) },
        },
        { provide: ImportBatchesStore, useValue: { previewUndo } },
      ],
    }).compileComponents();

    await TestBed.inject(AccountsStore).hydrate();
    const transactionsStore = TestBed.inject(TransactionsStore);
    await transactionsStore.hydrate();
    transactionsStore.addMany(ADDED);

    fixture = TestBed.createComponent(ImportWhatChangedComponent);
    fixture.componentRef.setInput('results', RESULTS);
    fixture.detectChanges();
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
  };

  const text = (): string => (host.textContent ?? '').replace(/\s+/g, ' ');
  const link = (label: string): HTMLAnchorElement =>
    [...host.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === label,
    ) as HTMLAnchorElement;
  const button = (label: string): HTMLButtonElement =>
    [...host.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement;

  it('heads with what was added, the period, money in and out, and the three counts', async () => {
    await setup();

    expect(text()).toContain('4 transactions added');
    expect(text()).toContain('September 2026');
    // Neither the transfer leg nor the move to savings is income or spending.
    expect(text()).toContain(`Money in${formatCurrency(3000, { signed: true })}`);
    expect(text()).toContain(`Money out${formatCurrency(-45.5, { signed: true })}`);
    expect(text()).toContain('1 categorised automatically');
    expect(text()).toContain('1 needs a category');
    expect(text()).toContain('1 transfer linked');
  });

  it('sends "Sort the N" to the uncategorised list', async () => {
    await setup();

    expect(link('Sort the 1').getAttribute('href')).toBe('/transactions?categoryId=uncategorised');
    expect(link('Sort them').getAttribute('href')).toBe('/transactions?categoryId=uncategorised');
  });

  it('turns into "Go to the dashboard" once nothing needs a category', async () => {
    await setup();

    TestBed.inject(TransactionsStore).patchMany([
      { id: 2, changes: { categoryId: 3, categoryManual: true } },
    ]);
    fixture.detectChanges();

    expect(link('Sort the 1')).toBeUndefined();
    expect(link('Go to the dashboard').getAttribute('href')).toBe('/dashboard');
    expect(text()).toContain('0 need a category');
  });

  it('lists each file with its account and counts', async () => {
    await setup();

    expect(text()).toContain('Everyday Checking');
    expect(text()).toContain('september.csv · 4 added · 2 already here, skipped');
    expect(text()).toContain('october.csv');
  });

  it("states the import history's undo cost for that file and emits that file once confirmed", async () => {
    await setup();
    const undone: CommitImportResult[] = [];
    fixture.componentInstance.undo.subscribe((result) => undone.push(result));

    (
      host.querySelector(
        'button[aria-label="Undo the import of september.csv into Everyday Checking"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(previewUndo).toHaveBeenCalledWith(4);
    const dialog = host.querySelector('mm-confirm-dialog')?.textContent ?? '';
    expect(dialog).toContain('deletes the 4 transactions imported from september.csv');
    expect(dialog).toContain('1 is linked as a transfer');

    button('Undo import').click();
    expect(undone).toEqual([RESULTS[0]]);

    // The wizard drops the undone result (`ImportWizardSession.onUndo`), and its line goes with it.
    fixture.componentRef.setInput('results', [RESULTS[1]]);
    fixture.detectChanges();
    expect(text()).not.toContain('september.csv');
    expect(text()).toContain('october.csv');
  });

  it('emits importMore from "Import more files"', async () => {
    await setup();
    let importMore = 0;
    fixture.componentInstance.importMore.subscribe(() => (importMore += 1));

    button('Import more files').click();

    expect(importMore).toBe(1);
  });
});
