import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RangeStore } from '@/core/stats';
import { CategoriesStore } from '@/core/state';
import { buildTransactionDrilldownParams, UNCATEGORISED_SENTINEL } from '@/shared/utils';
import { StatsStore } from '../../stats.store';

/** Transaction with its category name/colour joined in, formatted amount, and its own drill-down link — the template stays method-free (CR-2.5). */
type TopTransactionVm = {
  id: number;
  bookingDate: string;
  description: string;
  categoryName: string;
  categoryColor: string;
  formattedAmount: string;
  queryParams: Record<string, string>;
};

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const UNCATEGORISED_COLOR = '#9ca3af';

/**
 * The selected range's largest individual expense transactions (FR-STAT-12), independent of
 * category, so a one-off big expense doesn't hide inside a category total. Reuses
 * `StatsStore.topTransactions`. Each row links to `/transactions` narrowed to that transaction's
 * own booking date + account + category — the tightest scope the transactions list's existing
 * filter/query-param support offers, since there's no per-transaction-id filter (TICKET-STAT-08).
 */
@Component({
  selector: 'app-top-transactions-panel',
  imports: [RouterLink],
  templateUrl: './top-transactions-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopTransactionsPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  protected readonly rangeStore = inject(RangeStore);

  protected readonly entries = computed<TopTransactionVm[]>(() => {
    const categoriesById = this.categoriesStore.categoriesById();

    return this.statsStore.topTransactions().map((transaction) => {
      const category =
        transaction.categoryId != null ? categoriesById.get(transaction.categoryId) : undefined;

      return {
        id: transaction.id!,
        bookingDate: transaction.bookingDate,
        description: transaction.counterpartyName ?? transaction.rawDescription,
        categoryName: category?.name ?? 'Uncategorised',
        categoryColor: category?.color ?? UNCATEGORISED_COLOR,
        formattedAmount: EUR_FORMATTER.format(transaction.amount),
        queryParams: buildTransactionDrilldownParams({
          from: transaction.bookingDate,
          to: transaction.bookingDate,
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? UNCATEGORISED_SENTINEL,
        }),
      };
    });
  });
}
