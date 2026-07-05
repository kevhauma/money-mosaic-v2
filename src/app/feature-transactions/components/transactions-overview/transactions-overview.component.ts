import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArrowsExchange,
  tablerFilterOff,
  tablerLink,
  tablerPencil,
  tablerUnlink,
} from '@ng-icons/tabler-icons';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '@/feature-categories';
import type { Category, Transaction, Transfer } from '@/core/data-access';
import { isLikelyTransfer } from '@/core/transfers';
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
import {
  createPagination,
  debouncedTextSignal,
  SignedAmountPipe,
  STAT_QUERY_PARAMS,
} from '@/shared/utils';
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
    }),
  ],
})
export class TransactionsOverviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);

  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  /** Drill-down inheritance (FR-STAT-6): a Dashboard/Categories link lands here pre-filtered via query params. */
  private readonly initialQueryParams = this.route.snapshot.queryParamMap;

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    accountId: [this.initialQueryParams.get(STAT_QUERY_PARAMS.accountId) ?? ''],
    dateFrom: [this.initialQueryParams.get(STAT_QUERY_PARAMS.from) ?? ''],
    dateTo: [this.initialQueryParams.get(STAT_QUERY_PARAMS.to) ?? ''],
    categoryId: [this.initialQueryParams.get(STAT_QUERY_PARAMS.categoryId) ?? ''],
    text: [''],
    amountMin: [''],
    amountMax: [''],
  });

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

  protected readonly filteredTransactions = computed(() => {
    const filters = this.structuralFilters();
    const text = this.debouncedText();
    const accountId = filters.accountId ? Number(filters.accountId) : null;
    const amountMin = filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax = filters.amountMax !== '' ? Number(filters.amountMax) : null;

    return this.transactionsStore
      .transactions()
      .filter((transaction) => {
        if (accountId !== null && transaction.accountId !== accountId) return false;
        if (filters.dateFrom && transaction.bookingDate < filters.dateFrom) return false;
        if (filters.dateTo && transaction.bookingDate > filters.dateTo) return false;
        if (filters.categoryId === 'uncategorised' && transaction.categoryId != null) return false;
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
