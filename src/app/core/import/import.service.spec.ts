import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  appDb,
  ImportBatchesRepository,
  TransactionsRepository,
  type Transaction,
} from '@/core/data-access';
import { TransferCleanupService } from '@/core/transfers';
import { ImportService, partitionByFingerprint } from './import.service';

describe('ImportService: undoImport', () => {
  // The undo runs inside `appDb.transaction('rw', ...)`; stub it to synchronously invoke the scope
  // so we exercise the repository calls without a real IndexedDB.
  beforeEach(() => {
    vi.spyOn(appDb, 'transaction').mockImplementation(((...args: unknown[]) =>
      (args[args.length - 1] as () => unknown)()) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (transactions: Partial<Transaction>[]) => {
    const transactionsRepository = {
      getByImportBatch: vi.fn().mockResolvedValue(transactions),
      bulkRemove: vi.fn().mockResolvedValue(undefined),
    };
    const importBatchesRepository = {
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const transferCleanupService = {
      cleanupTransfersForRemovedTransactions: vi
        .fn()
        .mockResolvedValue({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] }),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: ImportBatchesRepository, useValue: importBatchesRepository },
        { provide: TransferCleanupService, useValue: transferCleanupService },
      ],
    });

    return {
      service: TestBed.inject(ImportService),
      transactionsRepository,
      importBatchesRepository,
      transferCleanupService,
    };
  };

  it('delegates the cross-import transfer cleanup to TransferCleanupService and removes the batch', async () => {
    // One of the removed transactions was auto-linked to a transaction from a *different* import
    // batch (FR-TRF-2 links across the whole dataset) — the shared cleanup handles that surviving side.
    const transactions = [{ id: 10, transferId: 5 }, { id: 11 }];
    const ctx = setup(transactions);

    const result = await ctx.service.undoImport(99);

    expect(ctx.transferCleanupService.cleanupTransfersForRemovedTransactions).toHaveBeenCalledWith(
      transactions,
    );
    expect(ctx.transactionsRepository.bulkRemove).toHaveBeenCalledWith([10, 11]);
    expect(ctx.importBatchesRepository.remove).toHaveBeenCalledWith(99);
    expect(result).toEqual({ unlinkedTransferIds: [5], clearedTransferTransactionIds: [20] });
  });
});

describe('partitionByFingerprint: dedupe partitioning', () => {
  it('skips a row whose (occurrence-keyed) fingerprint already exists in the account history', () => {
    const rows = [{ fingerprint: 'aaa' }, { fingerprint: 'bbb' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['aaa|1']));
    expect(accepted).toEqual([{ fingerprint: 'bbb|1' }]);
    expect(duplicateCount).toBe(1);
  });

  it('keeps two identical in-batch rows when neither is pre-existing, keyed by occurrence (FR-IMP-6)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set());
    expect(accepted).toEqual([{ fingerprint: 'same|1' }, { fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(0);
  });

  it('correctly partitions a mixed batch of pre-existing dupes, new rows, and in-batch repeats', () => {
    const rows = [
      { fingerprint: 'existing' },
      { fingerprint: 'new-1' },
      { fingerprint: 'repeat' },
      { fingerprint: 'repeat' },
    ];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['existing|1']));
    expect(accepted).toEqual([
      { fingerprint: 'new-1|1' },
      { fingerprint: 'repeat|1' },
      { fingerprint: 'repeat|2' },
    ]);
    expect(duplicateCount).toBe(1);
  });

  it('is idempotent: re-importing an identical file adds nothing (CR-1.2)', () => {
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(
      rows,
      new Set(['same|1', 'same|2']),
    );
    expect(accepted).toEqual([]);
    expect(duplicateCount).toBe(2);
  });

  it('keeps a genuinely new n-th occurrence when an overlapping file re-imports earlier ones (CR-1.2)', () => {
    // One occurrence already stored; a later file carries two identical rows — the first matches the
    // stored occurrence and is dropped, the second is a legitimate new same-day transaction.
    const rows = [{ fingerprint: 'same' }, { fingerprint: 'same' }];
    const { accepted, duplicateCount } = partitionByFingerprint(rows, new Set(['same|1']));
    expect(accepted).toEqual([{ fingerprint: 'same|2' }]);
    expect(duplicateCount).toBe(1);
  });
});
