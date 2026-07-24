import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { Account } from '@/core/data-access';
import { CsvImportService } from '@/core/import';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import {
  ImportSelectStepComponent,
  type PendingAccountDraft,
  type QueuedImportFile,
} from './import-select-step.component';

/** Protected surface we reach into for TICKET-IMP-08 assertions. */
type Internals = {
  queue: (() => QueuedImportFile[]) & { set: (rows: QueuedImportFile[]) => void };
  pendingDrafts: () => PendingAccountDraft[];
  startNewAccountDraft: (file: File) => void;
  cancelDraft: (draftId: string) => void;
  removeFile: (file: File) => void;
  onAccountChange: (file: File, value: string) => void;
  rowMode: (row: QueuedImportFile) => 'owner' | 'empty-nudge' | 'select';
};

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Everyday Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#7F77DD',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

describe('ImportSelectStepComponent: quick-create a new account (TICKET-IMP-08)', () => {
  let fixture: ComponentFixture<ImportSelectStepComponent>;

  const detectTemplateForFile = vi.fn().mockResolvedValue(undefined);
  const detectHeaders = vi.fn().mockResolvedValue([]);
  const previewRawRows = vi.fn().mockResolvedValue([]);

  const setup = async (accounts: Account[] = [account()]): Promise<void> => {
    vi.clearAllMocks();
    detectTemplateForFile.mockResolvedValue(undefined);
    detectHeaders.mockResolvedValue([]);
    previewRawRows.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [ImportSelectStepComponent],
      providers: [
        { provide: CsvImportService, useValue: { detectHeaders, previewRawRows } },
        { provide: MappingProfilesStore, useValue: { detectTemplateForFile } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportSelectStepComponent);
    fixture.componentRef.setInput('accounts', accounts);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  const csvFile = (name: string): File => new File(['a'], name, { type: 'text/csv' });

  const seedQueue = (rows: Partial<QueuedImportFile>[]): void => {
    internals().queue.set(
      rows.map((row) => ({
        file: csvFile('seed.csv'),
        accountId: null,
        autoDetected: false,
        pendingDraftId: null,
        detectedIban: null,
        ...row,
      })) as QueuedImportFile[],
    );
  };

  it('pre-fills a new draft from the filename when no IBAN was detected', async () => {
    await setup();
    const file = csvFile('rabobank-jan.csv');
    seedQueue([{ file, detectedIban: null }]);

    internals().startNewAccountDraft(file);

    const draft = internals().pendingDrafts()[0];
    expect(draft.name).toBe('rabobank-jan');
    expect(draft.iban).toBe('');
    expect(draft.type).toBe('checking');
    expect(internals().queue()[0].pendingDraftId).toBe(draft.id);
  });

  it('pre-fills the IBAN from a detected-but-unmatched own IBAN', async () => {
    await setup();
    const file = csvFile('rabobank-jan.csv');
    seedQueue([{ file, detectedIban: 'BE00123456789' }]);

    internals().startNewAccountDraft(file);

    const draft = internals().pendingDrafts()[0];
    expect(draft.iban).toBe('BE00123456789');
    // Name still comes from the filename — a raw IBAN isn't a useful account name default.
    expect(draft.name).toBe('rabobank-jan');
  });

  it('links a second file to the first file\'s pending draft via the "draft:" select option', async () => {
    await setup();
    const owner = csvFile('owner.csv');
    const other = csvFile('other.csv');
    seedQueue([{ file: owner }, { file: other }]);
    internals().startNewAccountDraft(owner);
    const draftId = internals().pendingDrafts()[0].id;

    internals().onAccountChange(other, `draft:${draftId}`);

    expect(internals().queue()[1].pendingDraftId).toBe(draftId);
    expect(internals().queue()[1].accountId).toBeNull();
    // Still only one draft — linking never creates a second one.
    expect(internals().pendingDrafts()).toHaveLength(1);
  });

  it('does not create a duplicate draft when a second file links to the same one', async () => {
    await setup();
    const owner = csvFile('a.csv');
    const other = csvFile('b.csv');
    seedQueue([{ file: owner }, { file: other }]);
    internals().startNewAccountDraft(owner);
    const draftId = internals().pendingDrafts()[0].id;
    internals().onAccountChange(other, `draft:${draftId}`);

    expect(internals().pendingDrafts()).toHaveLength(1);
    expect(
      internals()
        .queue()
        .filter((row) => row.pendingDraftId === draftId),
    ).toHaveLength(2);
  });

  it('supports every account type including joint, matching the main account creator', async () => {
    await setup();
    const file = csvFile('a.csv');
    seedQueue([{ file }]);
    internals().startNewAccountDraft(file);
    const draftId = internals().pendingDrafts()[0].id;

    (
      internals() as unknown as { updateDraftType: (id: string, type: Account['type']) => void }
    ).updateDraftType(draftId, 'joint');

    expect(internals().pendingDrafts()[0].type).toBe('joint');
  });

  describe('rowMode', () => {
    it('is "owner" for the file that created the draft', async () => {
      await setup();
      const file = csvFile('a.csv');
      seedQueue([{ file }]);
      internals().startNewAccountDraft(file);

      expect(internals().rowMode(internals().queue()[0])).toBe('owner');
    });

    it('is "select" for a file linked to someone else\'s draft', async () => {
      await setup();
      const owner = csvFile('a.csv');
      const other = csvFile('b.csv');
      seedQueue([{ file: owner }, { file: other }]);
      internals().startNewAccountDraft(owner);
      const draftId = internals().pendingDrafts()[0].id;
      internals().onAccountChange(other, `draft:${draftId}`);

      expect(internals().rowMode(internals().queue()[1])).toBe('select');
    });

    it('is "empty-nudge" when there are no accounts and no pending draft', async () => {
      await setup([]);
      seedQueue([{ file: csvFile('a.csv') }]);

      expect(internals().rowMode(internals().queue()[0])).toBe('empty-nudge');
    });

    it('is "select" once accounts exist', async () => {
      await setup([account()]);
      seedQueue([{ file: csvFile('a.csv') }]);

      expect(internals().rowMode(internals().queue()[0])).toBe('select');
    });
  });

  it('cancelDraft unlinks every file that had linked to it, not just the owner', async () => {
    await setup();
    const owner = csvFile('a.csv');
    const other = csvFile('b.csv');
    seedQueue([{ file: owner }, { file: other }]);
    internals().startNewAccountDraft(owner);
    const draftId = internals().pendingDrafts()[0].id;
    internals().onAccountChange(other, `draft:${draftId}`);

    internals().cancelDraft(draftId);

    expect(internals().pendingDrafts()).toEqual([]);
    expect(
      internals()
        .queue()
        .every((row) => row.pendingDraftId === null),
    ).toBe(true);
  });

  it('removing the owner file promotes the next linked file to owner instead of orphaning the draft', async () => {
    await setup();
    const owner = csvFile('owner.csv');
    const linked = csvFile('linked.csv');
    seedQueue([{ file: owner }, { file: linked }]);
    internals().startNewAccountDraft(owner);
    const draftId = internals().pendingDrafts()[0].id;
    internals().onAccountChange(linked, `draft:${draftId}`);

    internals().removeFile(owner);

    expect(internals().pendingDrafts()).toHaveLength(1);
    expect(internals().pendingDrafts()[0].ownerFile).toBe(linked);
    expect(internals().rowMode(internals().queue()[0])).toBe('owner');
  });

  it('removing the only file owning a draft drops the draft entirely', async () => {
    await setup();
    const owner = csvFile('owner.csv');
    seedQueue([{ file: owner }]);
    internals().startNewAccountDraft(owner);

    internals().removeFile(owner);

    expect(internals().pendingDrafts()).toEqual([]);
  });
});
