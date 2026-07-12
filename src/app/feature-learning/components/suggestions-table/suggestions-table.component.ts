import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Transaction } from '@/core/data-access';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore, CategoryModelStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import {
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  PaginatorComponent,
} from '@/shared/ui';
import { createPagination, SignedAmountPipe } from '@/shared/utils';

/** Rows rendered per page — same size as the transactions table (CR-2.1). */
const PAGE_SIZE = 50;

/** Joined-once-per-data-change view of a suggestion row, mirroring `TransactionsOverviewComponent`'s `rows`. */
type SuggestionRow = {
  transaction: Transaction;
  accountName: string;
  suggestedCategoryId: number;
  suggestedCategoryName: string;
  confidence: number;
};

/** Dedicated suggestions table on the Learning page (FR-ML-13) — supersedes the transactions-table ghost chip. */
@Component({
  selector: 'app-suggestions-table',
  imports: [
    DecimalPipe,
    SignedAmountPipe,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    PaginatorComponent,
  ],
  templateUrl: './suggestions-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestionsTableComponent {
  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly categoryModelStore = inject(CategoryModelStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);

  /**
   * One row per still-uncategorised transaction with a live suggestion — a strict subset of
   * `uncategorisedTransactions()`, mirroring the invariant `resolveSuggestion` used to enforce in
   * the transactions table before this ticket moved suggestion review here.
   */
  protected readonly rows = computed<SuggestionRow[]>(() => {
    const suggestions = this.categoryModelStore.suggestions();
    const categoriesById = this.categoriesStore.categoriesById();
    const accountsById = this.accountsStore.accountsById();

    return this.transactionsStore
      .uncategorisedTransactions()
      .map((transaction): SuggestionRow | undefined => {
        const suggestion = suggestions.get(transaction.id!);
        if (!suggestion) return undefined;

        const suggestedCategoryName = categoriesById.get(suggestion.categoryId)?.name;
        if (!suggestedCategoryName) return undefined;

        return {
          transaction,
          accountName: accountsById.get(transaction.accountId)?.name ?? '—',
          suggestedCategoryId: suggestion.categoryId,
          suggestedCategoryName,
          confidence: suggestion.confidence,
        };
      })
      .filter((row): row is SuggestionRow => row !== undefined);
  });

  /** Paged over `rows` — clamps automatically as accept/dismiss/override shrink the list (CR-2.1). */
  protected readonly pagination = createPagination({ items: this.rows, pageSize: PAGE_SIZE });

  /** Accepts the suggestion as-is (FR-ML-13) — delegates to the store, never sets a category itself. */
  protected acceptSuggestion(transactionId: number): void {
    void this.categoryModelStore.acceptSuggestion(transactionId);
  }

  /** Dismisses the suggestion without categorising the transaction — the first UI caller of this ML-07 method. */
  protected dismissSuggestion(transactionId: number): void {
    this.categoryModelStore.dismissSuggestion(transactionId);
  }

  /**
   * The select always starts at "Uncategorised" (FR-ML-13 feedback) — pre-filling it with the
   * suggestion made a still-uncategorised row visually read as already categorised. Picking a real
   * category here writes immediately, same as the transactions table's inline select.
   */
  protected async onCategoryChange(transaction: Transaction, rawCategoryId: string): Promise<void> {
    if (transaction.id == null) return;
    const categoryId = rawCategoryId === '' ? undefined : Number(rawCategoryId);
    if (categoryId === transaction.categoryId) return;
    await this.transactionsStore.updateTransaction(transaction.id, {
      categoryId,
      categoryManual: true,
    });
  }
}
