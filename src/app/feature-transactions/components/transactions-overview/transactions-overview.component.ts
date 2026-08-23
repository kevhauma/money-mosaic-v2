import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AccountsStore, CategoriesStore, TransactionsStore, TransfersStore } from '@/core/state';
import type { Rule, Transaction } from '@/core/data-access';
import { categoryOverlapsRange, withEndedSuffix } from '@/core/categorisation';
import { isLikelyTransfer, savingsAccountIbans } from '@/core/transfers';
import { RuleFormComponent, RulesStore, type RuleFormValue } from '@/feature-categories';
import {
  AlertComponent,
  ButtonComponent,
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  PaginatorComponent,
  TableComponent,
} from '@/shared/ui';
import {
  createPagination,
  createSelectionModel,
  formatDate,
  negativeMoneyColor,
  normalizeIban,
} from '@/shared/utils';
import {
  DEFAULT_AMOUNT_DIRECTION,
  describeExcludedFilterAxes,
  excludedFilterAxisLabels,
  filtersToRuleConditions,
  matchesTransactionFilters,
  type TransactionFilters,
} from '../../transaction-filters';
import type { TransactionRowVm } from '../../transaction-row-vm';
import { bookingDateSpan, type CategorySelectOption } from '../../category-picker';
import { TransactionBulkBarComponent } from '../transaction-bulk-bar/transaction-bulk-bar.component';
import {
  TransactionEditFormComponent,
  type TransactionEditResult,
} from '../transaction-edit-form/transaction-edit-form.component';
import { TransactionFiltersComponent } from '../transaction-filters/transaction-filters.component';
import { TransactionRowComponent } from '../transaction-row/transaction-row.component';
import { TransferReviewComponent } from '../transfer-review/transfer-review.component';

/** Rows rendered per page — keeps the table from materialising thousands of `<tr>` at once (CR-2.1). */
const PAGE_SIZE = 50;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const EMPTY_FILTERS: TransactionFilters = {
  accountId: '',
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  text: '',
  amountMin: '',
  amountMax: '',
  amountDirection: DEFAULT_AMOUNT_DIRECTION,
};

@Component({
  selector: 'app-transactions-overview',
  imports: [
    AlertComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    PaginatorComponent,
    RuleFormComponent,
    TableComponent,
    TransactionBulkBarComponent,
    TransactionEditFormComponent,
    TransactionFiltersComponent,
    TransactionRowComponent,
    TransferReviewComponent,
  ],
  templateUrl: './transactions-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsOverviewComponent {
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly transfersStore = inject(TransfersStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly rulesStore = inject(RulesStore);

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
        .map((account) => normalizeIban(account.iban))
        .filter((iban) => iban.length > 0),
    );
    return new Set(
      this.transactionsStore
        .transactions()
        .filter((transaction) => isLikelyTransfer(transaction, ownIbans))
        .map((transaction) => transaction.id!),
    );
  });

  /** The booking dates the current page actually covers — the span its quick-set picker serves (TICKET-CAT-11). */
  private readonly visibleDateSpan = computed(() => bookingDateSpan(this.pagination.pagedItems()));

  /** The same, over the selection, handed down to the bulk bar's picker (TICKET-CAT-11). */
  protected readonly selectedDateSpan = computed(() =>
    bookingDateSpan(this.selectedTransactions()),
  );

  /**
   * The inline category quick-set's `<option>` list, stringified once per category change rather
   * than once per option per row (TICKET-TXN-09).
   *
   * Applicability-filtered against the **visible rows' span** rather than per row (TICKET-CAT-11):
   * one list shared by every row on the page is the whole point of TICKET-TXN-09's memoisation, so
   * the span is the union of the dates it has to serve, recomputed per page/data change and never
   * per row. Any category a visible row is already assigned to is kept regardless — the same
   * broken-`<select>` rule the edit form follows, applied to fifty selects at once.
   */
  protected readonly categoryOptions = computed<CategorySelectOption[]>(() => {
    const categories = this.categoriesStore.activeCategories();
    const span = this.visibleDateSpan();
    if (!span) return [];

    const today = todayIso();
    const assignedIds = new Set(
      this.pagination.pagedItems().map((transaction) => transaction.categoryId),
    );

    return categories
      .filter(
        (category) =>
          categoryOverlapsRange(category, span.from, span.to) || assignedIds.has(category.id),
      )
      .map((category) => ({
        value: String(category.id),
        label: categoryOverlapsRange(category, span.from, span.to)
          ? category.name
          : withEndedSuffix(category.name, category, today),
      }));
  });

  /**
   * Joins each visible row's account name, category, transfer, likely-transfer, selected flag, and
   * accessible name once per data change, so the template renders plain fields instead of running
   * `.find()` methods and string concatenation per change detection pass (CR-2.3, TICKET-TXN-09).
   * Only the paged slice is joined, keeping the work bounded to `PAGE_SIZE`.
   */
  protected readonly rows = computed<TransactionRowVm[]>(() => {
    const accountsById = this.accountsStore.accountsById();
    const categoriesById = this.categoriesStore.categoriesById();
    const transferByTransactionId = this.transfersStore.transferByTransactionId();
    const likelyTransferIds = this.likelyTransferIds();
    const selectedIds = this.selection.selectedIds();

    return this.pagination.pagedItems().map((transaction) => ({
      id: transaction.id!,
      transaction,
      accountName: accountsById.get(transaction.accountId)?.name ?? '—',
      transferId: transferByTransactionId.get(transaction.id!)?.id,
      likelyTransfer: likelyTransferIds.has(transaction.id!),
      selected: selectedIds.has(transaction.id!),
      ariaLabel: `Select transaction ${formatDate(transaction.bookingDate)} ${
        transaction.counterpartyName ?? transaction.rawDescription
      }`,
      categoryId:
        transaction.categoryId != null && categoriesById.has(transaction.categoryId)
          ? String(transaction.categoryId)
          : '',
      amountColor: negativeMoneyColor(transaction.amount),
    }));
  });

  protected readonly formOpen = signal(false);
  protected readonly editingTransaction = signal<Transaction | null>(null);

  /** "Make rule from filter" (TICKET-CAT-07) — reuses `feature-categories`' rule-form modal as-is. */
  protected readonly ruleFormOpen = signal(false);
  protected readonly ruleFormDraft = signal<Rule | null>(null);
  protected readonly ruleFormExcludedNote = signal<string | null>(null);

  private readonly nextRulePriority = computed(
    () => Math.max(0, ...this.rulesStore.rules().map((rule) => rule.priority)) + 10,
  );

  protected showUncategorisedOnly(): void {
    this.filterBar().showUncategorisedOnly();
  }

  /**
   * Converts the active filter into a starting `RuleCondition[]` and opens the shared rule-form
   * modal pre-filled with it — the target category is left for the user to pick (0 sentinel,
   * never a real Dexie id) and any inconvertible axes (date range/category) are called out via
   * `ruleFormExcludedNote` (TICKET-CAT-07).
   */
  protected openRuleFromFilter(): void {
    const filters = this.filters();
    const conditions = filtersToRuleConditions(filters);
    if (conditions.length === 0) return;

    this.ruleFormExcludedNote.set(describeExcludedFilterAxes(excludedFilterAxisLabels(filters)));
    this.ruleFormDraft.set({
      name: `Rule from filter (${new Date().toISOString().slice(0, 10)})`,
      priority: this.nextRulePriority(),
      enabled: true,
      continueOnMatch: false,
      conditionMatch: 'all',
      conditions,
      action: { setCategoryId: 0 },
    });
    this.ruleFormOpen.set(true);
  }

  protected async saveRuleFromFilter(value: RuleFormValue): Promise<void> {
    await this.rulesStore.createRuleFromConditions(value);
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

  /** Deletes the transaction currently open in the edit popup (confirmed there before this fires). */
  protected async deleteEditingTransaction(): Promise<void> {
    const transaction = this.editingTransaction();
    if (transaction?.id == null) return;
    const { unlinkedTransferIds } = await this.transactionsStore.deleteTransactions([transaction]);
    this.transfersStore.removeLocal(unlinkedTransferIds);
  }

  /** Deletes every selected transaction (confirmed in the bulk bar before this fires), then clears the selection. */
  protected async deleteSelection(): Promise<void> {
    const transactions = this.selectedTransactions();
    if (transactions.length === 0) return;
    const { unlinkedTransferIds } = await this.transactionsStore.deleteTransactions(transactions);
    this.transfersStore.removeLocal(unlinkedTransferIds);
    this.selection.clear();
  }

  /**
   * Inline category quick-set (TICKET-TXN-05) — writes immediately, no modal/save step. The picked
   * id arrives already typed from `app-category-select-cell` (`undefined` = uncategorised).
   */
  protected async onCategoryChange(
    transaction: Transaction,
    categoryId: number | undefined,
  ): Promise<void> {
    if (transaction.id == null) return;
    if (categoryId === transaction.categoryId) return;
    await this.transactionsStore.updateTransaction(transaction.id, {
      categoryId,
      categoryManual: true,
    });
  }
}
