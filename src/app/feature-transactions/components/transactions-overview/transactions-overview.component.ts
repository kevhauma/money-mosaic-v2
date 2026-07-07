import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerLink,
  tablerPencil,
  tablerUnlink,
} from '@ng-icons/tabler-icons';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import type { Category, Transaction, Transfer } from '@/core/data-access';
import { isLikelyTransfer, savingsAccountIbans } from '@/core/transfers';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  PaginatorComponent,
} from '@/shared/ui';
import { createPagination, createSelectionModel, SignedAmountPipe } from '@/shared/utils';
import { TransactionsStore } from '../../transactions.store';
import { TransfersStore } from '../../transfers.store';
import { matchesTransactionFilters, type TransactionFilters } from '../../transaction-filters';
import { TransactionBulkBarComponent } from '../transaction-bulk-bar/transaction-bulk-bar.component';
import {
  TransactionEditFormComponent,
  type TransactionEditResult,
} from '../transaction-edit-form/transaction-edit-form.component';
import { TransactionFiltersComponent } from '../transaction-filters/transaction-filters.component';
import { TransferReviewComponent } from '../transfer-review/transfer-review.component';

/** Rows rendered per page — keeps the table from materialising thousands of `<tr>` at once (CR-2.1). */
const PAGE_SIZE = 50;

const EMPTY_FILTERS: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
};

/** Joined-once-per-data-change view of a table row, so the template stops calling `.find()` methods per row (CR-2.3). */
type TransactionRow = {
  transaction: Transaction;
  accountName: string;
  category: Category | undefined;
  transfer: Transfer | undefined;
  likelyTransfer: boolean;
  selected: boolean;
};

@Component({
  selector: 'app-transactions-overview',
  imports: [
    NgIcon,
    SignedAmountPipe,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    PaginatorComponent,
    TransactionBulkBarComponent,
    TransactionEditFormComponent,
    TransactionFiltersComponent,
    TransferReviewComponent,
  ],
  templateUrl: './transactions-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerPencil,
      tablerLink,
      tablerUnlink,
      tablerArrowsExchange,
    }),
  ],
})
export class TransactionsOverviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);

  /** Drill-down inheritance (FR-STAT-6): bound from the route's query params via `withComponentInputBinding()`. */
  readonly accountId = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly categoryId = input<string>();

  private readonly filterBar = viewChild.required(TransactionFiltersComponent);

  /** Current filter set, owned by `app-transaction-filters` and pushed up on any settled change. */
  protected readonly filters = signal<TransactionFilters>(EMPTY_FILTERS);

  /** IBANs of own savings accounts — a movement to one never counts as uncategorised (TICKET-TRF-02). */
  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  protected readonly filteredTransactions = computed(() => {
    const filters = this.filters();
    const ownSavingsIbans = this.ownSavingsIbans();

    return this.transactionsStore
      .transactions()
      .filter((transaction) => matchesTransactionFilters(transaction, filters, ownSavingsIbans))
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  });

  private readonly filteredIds = computed(() => this.filteredTransactions().map((t) => t.id!));

  /** Paging over the filtered rows; resets to page 1 whenever the filters change (FR-TXN, CR-2.1). */
  protected readonly pagination = createPagination({
    items: this.filteredTransactions,
    pageSize: PAGE_SIZE,
    resetOn: this.filters,
  });

  protected readonly selection = createSelectionModel<number>();

  protected readonly selectedTransactions = computed(() =>
    this.transactionsStore
      .transactions()
      .filter((transaction) => this.selection.selectedIds().has(transaction.id!)),
  );

  protected readonly canLinkSelection = computed(() => this.selection.count() === 2);

  /** True when every row in the current *filtered* set (not just the visible page) is selected. */
  protected readonly allFilteredSelected = computed(() =>
    this.selection.allSelected(this.filteredIds()),
  );

  /** Drives the header checkbox's indeterminate state: some, but not all, filtered rows selected. */
  protected readonly someFilteredSelected = computed(() =>
    this.selection.someSelected(this.filteredIds()),
  );

  /** One-sided movements to/from a known own-account IBAN, flagged before their pair arrives (FR-TRF-5). */
  protected readonly likelyTransferIds = computed(() => {
    const ownIbans = new Set(
      this.accountsStore
        .accounts()
        .map((account) => account.iban)
        .filter((iban): iban is string => !!iban),
    );
    return new Set(
      this.transactionsStore
        .transactions()
        .filter((transaction) => isLikelyTransfer(transaction, ownIbans))
        .map((transaction) => transaction.id!),
    );
  });

  /**
   * Joins each visible row's account name, category, transfer, likely-transfer, and selected flag once per
   * data change, so the template renders plain fields instead of running `.find()` methods per change
   * detection pass (CR-2.3). Only the paged slice is joined, keeping the work bounded to `PAGE_SIZE`.
   */
  protected readonly rows = computed<TransactionRow[]>(() => {
    const accountsById = this.accountsStore.accountsById();
    const categoriesById = this.categoriesStore.categoriesById();
    const transferByTransactionId = this.transfersStore.transferByTransactionId();
    const likelyTransferIds = this.likelyTransferIds();
    const selectedIds = this.selection.selectedIds();

    return this.pagination.pagedItems().map((transaction) => ({
      transaction,
      accountName: accountsById.get(transaction.accountId)?.name ?? '—',
      category:
        transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined,
      transfer: transferByTransactionId.get(transaction.id!),
      likelyTransfer: likelyTransferIds.has(transaction.id!),
      selected: selectedIds.has(transaction.id!),
    }));
  });

  protected readonly formOpen = signal(false);
  protected readonly editingTransaction = signal<Transaction | null>(null);

  protected showUncategorisedOnly(): void {
    this.filterBar().showUncategorisedOnly();
  }

  /** Selects every row in the current filtered set — the full result, not only `pagedItems()` (TICKET-TXN-01). */
  protected selectAllFiltered(): void {
    this.selection.selectAll(this.filteredIds());
  }

  /** Header checkbox: collapse to none if the whole filtered set is already selected, otherwise select it all. */
  protected toggleSelectAllFiltered(): void {
    if (this.allFilteredSelected()) {
      this.selection.clear();
    } else {
      this.selectAllFiltered();
    }
  }

  /** Assigns the picked category to every selected row in one batched write, then clears the selection. */
  protected async applyBulkCategory(categoryId: number): Promise<void> {
    const ids = [...this.selection.selectedIds()];
    if (ids.length === 0) return;

    await this.transactionsStore.bulkAssignCategory(ids, categoryId);
    this.selection.clear();
  }

  protected async linkSelection(): Promise<void> {
    const [first, second] = this.selectedTransactions();
    if (!first || !second) return;
    await this.transfersStore.link(first, second);
    this.selection.clear();
  }

  protected unlink(transferId: number): void {
    void this.transfersStore.unlink(transferId);
  }

  protected openEdit(transaction: Transaction): void {
    this.editingTransaction.set(transaction);
    this.formOpen.set(true);
  }

  protected async saveEdit(result: TransactionEditResult): Promise<void> {
    const transaction = this.editingTransaction();
    if (transaction?.id == null) return;
    await this.transactionsStore.updateTransaction(transaction.id, result);
  }
}
