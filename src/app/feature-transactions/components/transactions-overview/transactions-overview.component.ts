import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
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
import type { Category, Transaction } from '@/core/data-access';
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
import { createPagination, SignedAmountPipe, STAT_QUERY_PARAMS } from '@/shared/utils';
import { TransactionsStore } from '../../transactions.store';
import { TransfersStore } from '../../transfers.store';
import {
  TransactionEditFormComponent,
  type TransactionEditResult,
} from '../transaction-edit-form/transaction-edit-form.component';
import { TransferReviewComponent } from '../transfer-review/transfer-review.component';

/** Rows rendered per page — keeps the table from materialising thousands of `<tr>` at once (CR-2.1). */
const PAGE_SIZE = 50;

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

  private readonly filters = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.getRawValue(),
  });

  protected readonly filteredTransactions = computed(() => {
    const filters = this.filters();
    const accountId = filters.accountId ? Number(filters.accountId) : null;
    const text = (filters.text ?? '').trim().toLowerCase();
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

  protected readonly hasActiveFilters = computed(() =>
    Object.values(this.filters()).some((value) => value !== ''),
  );

  /** Paging over the filtered rows; resets to page 1 whenever the filters change (FR-TXN, CR-2.1). */
  protected readonly pagination = createPagination({
    items: this.filteredTransactions,
    pageSize: PAGE_SIZE,
    resetOn: this.filters,
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

  protected isSelected(id: number): boolean {
    return this.selectedIds().has(id);
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

  protected accountName(accountId: number): string {
    return this.accountsStore.accounts().find((account) => account.id === accountId)?.name ?? '—';
  }

  protected categoryFor(transaction: Transaction): Category | undefined {
    return transaction.categoryId != null
      ? this.categoriesStore.categoriesById().get(transaction.categoryId)
      : undefined;
  }
}
