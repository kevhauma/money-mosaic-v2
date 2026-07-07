import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerFilterOff,
  tablerLink,
  tablerPencil,
  tablerTag,
  tablerUnlink,
  tablerX,
} from '@ng-icons/tabler-icons';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import type { Category, Transaction, Transfer } from '@/core/data-access';
import { isLikelyTransfer, isSavingsMovement, savingsAccountIbans } from '@/core/transfers';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  InputComponent,
  PageHeaderComponent,
  PaginatorComponent,
  SelectComponent,
} from '@/shared/ui';
import { createPagination, debouncedTextSignal, SignedAmountPipe } from '@/shared/utils';
import { TransactionsStore } from '../../transactions.store';
import { TransfersStore } from '../../transfers.store';
import {
  TransactionEditFormComponent,
  type TransactionEditResult,
} from '../transaction-edit-form/transaction-edit-form.component';
import { TransferReviewComponent } from '../transfer-review/transfer-review.component';

/** Rows rendered per page — keeps the table from materialising thousands of `<tr>` at once (CR-2.1). */
const PAGE_SIZE = 50;

/** The filter fields that apply immediately, i.e. everything except the debounced free-text needle (CR-2.4). */
type StructuralFilters = {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  amountMin?: string;
  amountMax?: string;
};

/** Drops the free-text field so structural filters can be compared/emitted independently of debounced text (CR-2.4). */
function structuralFiltersOf(value: StructuralFilters & { text?: string }): StructuralFilters {
  return {
    accountId: value.accountId,
    dateFrom: value.dateFrom,
    dateTo: value.dateTo,
    categoryId: value.categoryId,
    amountMin: value.amountMin,
    amountMax: value.amountMax,
  };
}

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
    ReactiveFormsModule,
    NgIcon,
    SignedAmountPipe,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    PageHeaderComponent,
    PaginatorComponent,
    SelectComponent,
    TransactionEditFormComponent,
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
      tablerFilterOff,
      tablerTag,
      tablerX,
    }),
  ],
})
export class TransactionsOverviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);

  private readonly formBuilder = inject(FormBuilder);

  /** Drill-down inheritance (FR-STAT-6): bound from the route's query params via `withComponentInputBinding()`. */
  readonly accountId = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly categoryId = input<string>();

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    accountId: [''],
    dateFrom: [''],
    dateTo: [''],
    categoryId: [''],
    text: [''],
    amountMin: [''],
    amountMax: [''],
  });

  constructor() {
    // Re-seeds the URL-backed filters whenever a drill-down navigates to this same-route
    // instance with new query params (FR-STAT-6) — free-text/amount stay untouched (CR-2.4).
    effect(() => {
      this.filterForm.patchValue({
        accountId: this.accountId() ?? '',
        dateFrom: this.from() ?? '',
        dateTo: this.to() ?? '',
        categoryId: this.categoryId() ?? '',
      });
    });
  }

  /** Structural filters apply immediately; `distinctUntilChanged` keeps text keystrokes from re-emitting them. */
  private readonly structuralFilters = toSignal(
    this.filterForm.valueChanges.pipe(
      map(structuralFiltersOf),
      distinctUntilChanged(
        (a, b) =>
          a.accountId === b.accountId &&
          a.dateFrom === b.dateFrom &&
          a.dateTo === b.dateTo &&
          a.categoryId === b.categoryId &&
          a.amountMin === b.amountMin &&
          a.amountMax === b.amountMax,
      ),
    ),
    { initialValue: structuralFiltersOf(this.filterForm.getRawValue()) },
  );

  /** Free-text needle, debounced so typing doesn't re-run the filter/render pipeline on every keystroke (CR-2.4). */
  private readonly debouncedText = debouncedTextSignal(this.filterForm.controls.text);

  /** Single key that changes on either a structural change or a settled text change — drives page reset. */
  private readonly filterKey = computed(() => ({
    ...this.structuralFilters(),
    text: this.debouncedText(),
  }));

  /** IBANs of own savings accounts — a movement to one never counts as uncategorised (TICKET-TRF-02). */
  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  protected readonly filteredTransactions = computed(() => {
    const filters = this.structuralFilters();
    const text = this.debouncedText();
    const ownSavingsIbans = this.ownSavingsIbans();
    const accountId = filters.accountId ? Number(filters.accountId) : null;
    const amountMin = filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax = filters.amountMax !== '' ? Number(filters.amountMax) : null;

    return this.transactionsStore
      .transactions()
      .filter((transaction) => {
        if (accountId !== null && transaction.accountId !== accountId) return false;
        if (filters.dateFrom && transaction.bookingDate < filters.dateFrom) return false;
        if (filters.dateTo && transaction.bookingDate > filters.dateTo) return false;
        if (
          filters.categoryId === 'uncategorised' &&
          (transaction.categoryId != null || isSavingsMovement(transaction, ownSavingsIbans))
        ) {
          return false;
        }
        if (
          filters.categoryId &&
          filters.categoryId !== 'uncategorised' &&
          transaction.categoryId !== Number(filters.categoryId)
        ) {
          return false;
        }
        if (text) {
          const haystack =
            `${transaction.rawDescription} ${transaction.counterpartyName ?? ''}`.toLowerCase();
          if (!haystack.includes(text)) return false;
        }
        if (amountMin !== null && transaction.amount < amountMin) return false;
        if (amountMax !== null && transaction.amount > amountMax) return false;
        return true;
      })
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.debouncedText() !== '' ||
      Object.values(this.structuralFilters()).some((value) => value !== ''),
  );

  /** Paging over the filtered rows; resets to page 1 whenever the filters change (FR-TXN, CR-2.1). */
  protected readonly pagination = createPagination({
    items: this.filteredTransactions,
    pageSize: PAGE_SIZE,
    resetOn: this.filterKey,
  });

  protected readonly selectedIds = signal<Set<number>>(new Set());

  protected readonly selectedTransactions = computed(() =>
    this.transactionsStore
      .transactions()
      .filter((transaction) => this.selectedIds().has(transaction.id!)),
  );

  protected readonly canLinkSelection = computed(() => this.selectedIds().size === 2);

  protected readonly selectionCount = computed(() => this.selectedIds().size);

  /** Category applied to every selected row when the bulk-action bar's Apply is pressed (TICKET-TXN-01). */
  protected readonly bulkCategoryControl = this.formBuilder.nonNullable.control('');

  /** True when every row in the current *filtered* set (not just the visible page) is selected. */
  protected readonly allFilteredSelected = computed(() => {
    const filtered = this.filteredTransactions();
    if (filtered.length === 0) return false;
    const selectedIds = this.selectedIds();
    return filtered.every((transaction) => selectedIds.has(transaction.id!));
  });

  /** Drives the header checkbox's indeterminate state: some, but not all, filtered rows selected. */
  protected readonly someFilteredSelected = computed(
    () => this.selectionCount() > 0 && !this.allFilteredSelected(),
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
    const selectedIds = this.selectedIds();

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
    this.filterForm.patchValue({ categoryId: 'uncategorised' });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      accountId: '',
      dateFrom: '',
      dateTo: '',
      categoryId: '',
      text: '',
      amountMin: '',
      amountMax: '',
    });
  }

  protected toggleSelected(id: number): void {
    this.selectedIds.update((existing) => {
      const next = new Set(existing);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Selects every row in the current filtered set — the full result, not only `pagedItems()` (TICKET-TXN-01). */
  protected selectAllFiltered(): void {
    this.selectedIds.set(
      new Set(this.filteredTransactions().map((transaction) => transaction.id!)),
    );
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** Header checkbox: collapse to none if the whole filtered set is already selected, otherwise select it all. */
  protected toggleSelectAllFiltered(): void {
    if (this.allFilteredSelected()) {
      this.clearSelection();
    } else {
      this.selectAllFiltered();
    }
  }

  /** Assigns the picked category to every selected row in one batched write, then clears the selection. */
  protected async applyBulkCategory(): Promise<void> {
    const rawCategoryId = this.bulkCategoryControl.value;
    if (rawCategoryId === '') return;
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    await this.transactionsStore.bulkAssignCategory(ids, Number(rawCategoryId));
    this.clearSelection();
    this.bulkCategoryControl.setValue('');
  }

  protected async linkSelection(): Promise<void> {
    const [first, second] = this.selectedTransactions();
    if (!first || !second) return;
    await this.transfersStore.link(first, second);
    this.selectedIds.set(new Set());
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
