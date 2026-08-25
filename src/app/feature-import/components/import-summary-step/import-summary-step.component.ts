import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FlexComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { ImportBatch } from '@/core/data-access';
import type { UndoImportImpact } from '@/core/import';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import { toImportHistoryRows, undoImportMessage } from '../../import-history-rows';

@Component({
  selector: 'app-import-summary-step',
  imports: [ButtonComponent, ConfirmDialogComponent, FlexComponent, TypographyComponent],
  templateUrl: './import-summary-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSummaryStepComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly importBatchesStore = inject(ImportBatchesStore);

  readonly batch = input.required<ImportBatch>();
  readonly showDoneLink = input(true);
  readonly undo = output<void>();

  protected readonly undoConfirmOpen = signal(false);

  /**
   * The same sentence the import history's undo states (TICKET-IMP-13), built from the same helper
   * and the same read. It used to be a hardcoded "This removes every transaction this import added"
   * — true, but the weaker of two claims about one operation, and silent about the work the user
   * cannot get back by re-importing.
   */
  private readonly impact = signal<UndoImportImpact | null>(null);

  protected readonly undoMessage = computed(() => {
    const impact = this.impact();
    const [row] = toImportHistoryRows([this.batch()], this.accountsStore.accountsById());
    return impact && row ? undoImportMessage(row, impact) : '';
  });

  /** Reads the cost before opening, so the dialog never changes text under the reader. */
  protected async openUndoConfirm(): Promise<void> {
    const batchId = this.batch().id;
    if (batchId == null) return;

    this.impact.set(await this.importBatchesStore.previewUndo(batchId));
    this.undoConfirmOpen.set(true);
  }

  protected confirmUndo(): void {
    this.undo.emit();
  }
}
