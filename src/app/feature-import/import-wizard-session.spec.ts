import { TestBed } from '@angular/core/testing';
import { vi, type Mock } from 'vitest';
import type { CommitImportResult, ParsedRowResult } from '@/core/import';
import { CsvImportService } from '@/core/import';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import { MappingProfilesStore } from './mapping-profiles.store';
import { ImportWizardSession } from './import-wizard-session';

const csvFile = (name: string): File => new File(['Date;Desc\n01/01/2026;x'], name);
const validRow = (): ParsedRowResult =>
  ({
    valid: true,
    transaction: { bookingDate: '2026-01-01', amount: 10 },
  }) as unknown as ParsedRowResult;

const MAPPING_PROFILE = {
  name: 'Custom mapping',
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY' as const,
  encoding: 'utf-8' as const,
  headerRows: 1,
  signConvention: 'as-is' as const,
  columns: { date: 'Date', description: 'Desc' },
};
const VALID_RESULT = { mappingProfile: MAPPING_PROFILE };

let session: ImportWizardSession;
let parse: Mock;
let commitImport: Mock;
let previewImport: Mock;

const wait = (ms: number): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));
const settleParse = (): Promise<void> => wait(350);

const queueRow = (accountId: number) => ({
  file: csvFile('a.csv'),
  accountId,
  autoDetected: false,
  pendingDraftId: null,
  detectedIban: null,
});

const enterStep2WithFile = (accountId: number): void => {
  session.queue.set([queueRow(accountId)]);
  session.currentFileIndex.set(0);
  session.step.set(2);
};

beforeEach(() => {
  parse = vi
    .fn()
    .mockResolvedValue({ headers: ['Date', 'Desc'], rows: [validRow()], warnings: [] });
  previewImport = vi.fn().mockImplementation(async (_accountId: number, rows: unknown[]) => ({
    newRows: rows,
    duplicateRows: [],
  }));
  commitImport = vi.fn().mockImplementation(
    async (input: { accountId: number }): Promise<CommitImportResult> =>
      ({
        batch: { id: input.accountId, accountId: input.accountId },
        addedTransactions: [],
        duplicateCount: 0,
      }) as unknown as CommitImportResult,
  );

  TestBed.configureTestingModule({
    providers: [
      ImportWizardSession,
      { provide: CsvImportService, useValue: { parse } },
      {
        provide: ImportBatchesStore,
        useValue: { commitImport, undoImport: vi.fn(), previewImport },
      },
      { provide: MappingProfilesStore, useValue: { upsertForBankAndAccount: vi.fn() } },
      { provide: AccountsStore, useValue: { addAccount: vi.fn() } },
    ],
  });

  session = TestBed.inject(ImportWizardSession);
});

describe('ImportWizardSession: double-advance cannot double-commit (TICKET-IMP-11)', () => {
  it('two concurrent goNext() calls on the same file commit exactly once', async () => {
    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();

    await Promise.all([session.goNext(), session.goNext()]);

    expect(commitImport).toHaveBeenCalledTimes(1);
    expect(session.commitResults()).toHaveLength(1);
  });

  it('a goNext() fired while already committing is a no-op', async () => {
    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();

    const first = session.goNext();
    expect(session.committing()).toBe(true); // set synchronously, before the first await resolves
    const second = session.goNext(); // must observe committing() already true and bail immediately

    await Promise.all([first, second]);

    expect(commitImport).toHaveBeenCalledTimes(1);
  });
});

describe('ImportWizardSession: startNewImport() clears all session state (TICKET-IMP-11)', () => {
  it('resets every field back to its initial value, including after a commit and mid-batch state', async () => {
    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();
    await session.goNext(); // commits the only queued file, advances to step 3

    session.pendingDrafts.set([
      { id: 'draft-1', ownerFile: csvFile('a.csv'), name: 'Fresh', iban: '', type: 'checking' },
    ]);
    session.batchMapping.set(MAPPING_PROFILE);
    session.manualOverrideActive.set(true);
    session.applyToRemaining.set(true);
    session.accountCreationError.set('boom');

    session.startNewImport();

    expect(session.step()).toBe(1);
    expect(session.queue()).toEqual([]);
    expect(session.pendingDrafts()).toEqual([]);
    expect(session.currentFileIndex()).toBe(0);
    expect(session.mapResult()).toBeNull();
    expect(session.commitResults()).toEqual([]);
    expect(session.batchMapping()).toBeNull();
    expect(session.manualOverrideActive()).toBe(false);
    expect(session.applyToRemaining()).toBe(false);
    expect(session.accountCreationError()).toBeNull();
  });
});

describe('ImportWizardSession: manual override pauses batch mode (TICKET-IMP-11)', () => {
  it('mapFileIndividually() switches showManualMapStep to true even while a batch mapping is active', () => {
    enterStep2WithFile(22);
    session.batchMapping.set(MAPPING_PROFILE);
    expect(session.showManualMapStep()).toBe(false); // batch mapping active, no override yet
    expect(session.step2View()).toBe('batch-waiting');

    session.mapFileIndividually();

    expect(session.showManualMapStep()).toBe(true);
    expect(session.step2View()).toBe('manual-map');
    expect(session.mapResult()).toBeNull(); // dropped back to the manual form with a clean slate
  });

  it('an overridden file does not auto-commit under the batch mapping, even once it parses cleanly', async () => {
    enterStep2WithFile(22);
    session.batchMapping.set(MAPPING_PROFILE);
    session.mapFileIndividually();

    session.mapResult.set(VALID_RESULT);
    await settleParse();

    expect(commitImport).not.toHaveBeenCalled();
  });
});

/**
 * TICKET-IMP-14 — the wizard scans the parsed rows against the account before the user commits,
 * and relays their choice about the duplicates to the commit. The partition itself is tested in
 * `import.service.spec.ts`; what matters here is that the session asks, reports, and passes on.
 */
describe('ImportWizardSession: duplicate scan and handling (TICKET-IMP-14)', () => {
  it('says nothing about duplicates until the scan has actually run', () => {
    enterStep2WithFile(11);

    expect(session.duplicateScan().known).toBe(false);
    expect(session.duplicateScan().duplicateCount).toBe(0);
    expect(session.duplicateScan().newCount).toBe(0);
  });

  it('reports the counts and the rows themselves once the scan settles', async () => {
    const rows = [validRow(), validRow()];
    parse.mockResolvedValue({ headers: ['Date', 'Desc'], rows, warnings: [] });
    previewImport.mockResolvedValue({ newRows: [rows[1]], duplicateRows: [rows[0]] });

    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();
    await wait(0);

    expect(previewImport).toHaveBeenCalledWith(11, rows);
    expect(session.duplicateScan().known).toBe(true);
    expect(session.duplicateScan().newCount).toBe(1);
    expect(session.duplicateScan().duplicateCount).toBe(1);
    // The sentence follows the choice, so it says what will happen (TICKET-IMP-14).
    expect(session.duplicateScan().summary).toBe(
      '1 row new, 1 already in this account — those will be skipped.',
    );
    // By identity, so the preview table can mark the very rows it is already rendering.
    expect(session.duplicateScan().rows.has(rows[0])).toBe(true);
    expect(session.duplicateScan().rows.has(rows[1])).toBe(false);
  });

  it('commits with skip unless the user says otherwise', async () => {
    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();

    await session.goNext();

    expect(commitImport).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateHandling: 'skip' }),
    );
  });

  it('passes import-anyway through to the commit when the user picks it', async () => {
    enterStep2WithFile(11);
    session.mapResult.set(VALID_RESULT);
    await settleParse();
    session.duplicateHandling.set('import');

    await session.goNext();

    expect(commitImport).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateHandling: 'import' }),
    );
  });

  it('resets the choice for the next file, so one override is not inherited', async () => {
    session.queue.set([queueRow(11), queueRow(12)]);
    session.currentFileIndex.set(0);
    session.step.set(2);
    session.mapResult.set(VALID_RESULT);
    await settleParse();
    session.duplicateHandling.set('import');

    await session.goNext();

    expect(session.currentFileIndex()).toBe(1);
    expect(session.duplicateHandling()).toBe('skip');
  });
});
