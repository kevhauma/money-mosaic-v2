import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import type { UndoImportImpact } from '@/core/import';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FieldsetComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  toImportHistoryRows,
  undoImportMessage,
  type ImportHistoryRow,
} from '../../import-history-rows';

/**
 * What has been imported, and a way to take one back (TICKET-IMP-13).
 *
 * Import batches have been recorded since v1.0 and shown nowhere, so the one mistake this app's
 * workflow actually risks — the same export imported twice — had no cure to go with TICKET-IMP-14's
 * prevention. It sits on step 1 of the wizard because that is where the user is *about* to import
 * again, which is the moment they need to know what they already have.
 *
 * **Undo is a hard delete, not an archive.** The scope decision the ticket asked for, and the
 * reasoning: the rows are reproducible — the user still has the CSV, and re-importing it puts them
 * back — so an archive would be a second copy of recoverable data with its own lifecycle, its own
 * undo path and its own way of going stale. What re-importing does *not* restore is work done after
 * the import, so the confirm dialog states that instead of hiding it: how many rows carry a
 * hand-set category, and how many are linked as transfers.
 */
@Component({
  selector: 'app-import-history',
  imports: [
    ButtonComponent,
    ConfirmDialogComponent,
    FieldsetComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './import-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportHistoryComponent {
  private readonly importBatchesStore = inject(ImportBatchesStore);
  private readonly accountsStore = inject(AccountsStore);

  protected readonly rows = computed<ImportHistoryRow[]>(() =>
    toImportHistoryRows(this.importBatchesStore.batches(), this.accountsStore.accountsById()),
  );

  /** Whether the batches have loaded — an empty list and a not-yet-loaded one look identical. */
  protected readonly loaded = this.importBatchesStore.hydrated;

  /** The row the confirm dialog is about, with the cost of undoing it already read. */
  protected readonly pendingUndo = signal<{
    row: ImportHistoryRow;
    impact: UndoImportImpact;
  } | null>(null);

  protected readonly confirmOpen = signal(false);

  protected readonly confirmMessage = computed(() => {
    const pending = this.pendingUndo();
    return pending ? undoImportMessage(pending.row, pending.impact) : '';
  });

  /**
   * Reads what the undo would cost *before* opening the dialog, so the dialog opens already stating
   * it rather than filling in a moment later — a confirm dialog whose text changes after it appears
   * is one the user has already started reading.
   */
  protected async requestUndo(row: ImportHistoryRow): Promise<void> {
    const impact = await this.importBatchesStore.previewUndo(row.batchId);
    this.pendingUndo.set({ row, impact });
    this.confirmOpen.set(true);
  }

  protected async confirmUndo(): Promise<void> {
    const pending = this.pendingUndo();
    if (!pending) return;

    const batch = this.importBatchesStore
      .batches()
      .find((entry) => entry.id === pending.row.batchId);
    if (batch) await this.importBatchesStore.undoImport(batch);

    this.pendingUndo.set(null);
  }
}
