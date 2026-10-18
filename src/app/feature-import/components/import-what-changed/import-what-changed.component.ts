import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerArrowsExchange, tablerCircleCheck, tablerHelpCircle } from '@ng-icons/tabler-icons';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FlexComponent,
  StatCardComponent,
  TypographyComponent,
  type TextColor,
} from '@/shared/ui';
import type { CommitImportResult, UndoImportImpact } from '@/core/import';
import { AccountsStore, ImportBatchesStore, TransactionsStore } from '@/core/state';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  UNCATEGORISED_SENTINEL,
} from '@/shared/utils';
import { toImportHistoryRows, undoImportMessage } from '../../import-history-rows';
import {
  formatImportPeriod,
  summariseImport,
  toImportFileLines,
  type ImportFileLine,
} from '../../import-what-changed';

type OutcomeLine = {
  icon: string;
  color: TextColor;
  title: string;
  caption: string;
  /** Only the "need a category" line links on — to the backlog it counts. */
  sortsBacklog: boolean;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * Where an import ends (TICKET-IMP-18): what the run did, not how many rows it read. It reads the
 * live `TransactionsStore` by the ids the run added, so its numbers follow the user as they sort —
 * replacing `import-summary-step`, which showed per-file row counts and stopped there.
 */
@Component({
  selector: 'app-import-what-changed',
  imports: [
    ButtonComponent,
    ConfirmDialogComponent,
    FlexComponent,
    NgIcon,
    StatCardComponent,
    TypographyComponent,
  ],
  templateUrl: './import-what-changed.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerArrowsExchange, tablerCircleCheck, tablerHelpCircle })],
})
export class ImportWhatChangedComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly importBatchesStore = inject(ImportBatchesStore);

  readonly results = input.required<readonly CommitImportResult[]>();
  readonly undo = output<CommitImportResult>();
  readonly importMore = output<void>();

  protected readonly uncategorisedQuery = buildTransactionDrilldownParams({
    categoryId: UNCATEGORISED_SENTINEL,
  });

  private readonly summary = computed(() =>
    summariseImport(
      this.results().flatMap((result) => result.addedTransactions.map((added) => added.id!)),
      {
        transactionsById: this.transactionsStore.transactionsById(),
        uncategorisedIds: new Set(
          this.transactionsStore.uncategorisedTransactions().map((transaction) => transaction.id!),
        ),
        ownSavingsIbans: this.transactionsStore.ownSavingsIbans(),
      },
    ),
  );

  protected readonly vm = computed(() => {
    const summary = this.summary();
    const needsCategory = summary.needsCategoryCount;
    const lines: OutcomeLine[] = [
      {
        icon: 'tablerCircleCheck',
        color: 'success',
        title: `${summary.categorisedCount} categorised automatically`,
        caption: 'Sorted by your rules as they came in',
        sortsBacklog: false,
      },
      {
        icon: 'tablerHelpCircle',
        color: 'warning',
        title: `${needsCategory} ${needsCategory === 1 ? 'needs' : 'need'} a category`,
        caption: 'Waiting in your uncategorised list',
        sortsBacklog: needsCategory > 0,
      },
      {
        icon: 'tablerArrowsExchange',
        color: 'info',
        title: `${plural(summary.transfersLinkedCount, 'transfer', 'transfers')} linked`,
        caption: 'Kept out of income and spending',
        sortsBacklog: false,
      },
    ];

    return {
      hasAdded: summary.addedCount > 0,
      headline:
        summary.addedCount > 0
          ? `${plural(summary.addedCount, 'transaction', 'transactions')} added`
          : 'No new transactions',
      period: summary.period ? formatImportPeriod(summary.period) : null,
      moneyIn: formatCurrency(summary.moneyIn, { signed: true }),
      moneyOut: formatCurrency(summary.moneyOut, { signed: true }),
      lines,
      sortsFirst: needsCategory > 0,
      sortLabel: `Sort the ${needsCategory}`,
    };
  });

  protected readonly files = computed(() =>
    toImportFileLines(this.results(), this.accountsStore.accountsById()),
  );

  protected readonly undoConfirmOpen = signal(false);
  private readonly pendingUndo = signal<ImportFileLine | null>(null);
  private readonly impact = signal<UndoImportImpact | null>(null);

  /** The same sentence the import history's undo states (TICKET-IMP-13), from the same helper. */
  protected readonly undoMessage = computed(() => {
    const line = this.pendingUndo();
    const impact = this.impact();
    if (!line || !impact) return '';
    const [row] = toImportHistoryRows([line.result.batch], this.accountsStore.accountsById());
    return row ? undoImportMessage(row, impact) : '';
  });

  /** Reads the cost before opening, so the dialog never changes text under the reader. */
  protected async openUndoConfirm(line: ImportFileLine): Promise<void> {
    const batchId = line.result.batch.id;
    if (batchId == null) return;

    this.impact.set(await this.importBatchesStore.previewUndo(batchId));
    this.pendingUndo.set(line);
    this.undoConfirmOpen.set(true);
  }

  protected confirmUndo(): void {
    const line = this.pendingUndo();
    if (line) this.undo.emit(line.result);
    this.pendingUndo.set(null);
  }
}
