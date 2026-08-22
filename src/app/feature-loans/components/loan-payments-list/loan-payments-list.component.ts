import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Loan } from '@/core/data-access';
import { AppSettingsStore, TransactionsStore } from '@/core/state';
import { CollapseComponent, PrivacyBlurComponent, TypographyComponent } from '@/shared/ui';
import { buildTransactionDrilldownParams, formatCurrency } from '@/shared/utils';

/** One row of the list — every display fact already resolved, the `TopTransactionsPanelComponent` shape. */
type LoanPaymentRowVm = {
  id: number;
  bookingDate: string;
  description: string;
  formattedAmount: string;
  queryParams: Record<string, string>;
};

/**
 * The Loan detail page's "show your work" panel (TICKET-LOAN-09) — every transaction actually
 * counted toward this loan's payoff, most recent first, each linking into `/transactions` narrowed
 * to that transaction's own booking date + account + category (`buildTransactionDrilldownParams` —
 * the tightest scope the transactions list's filters offer, there being no per-transaction-id
 * filter, same as `TopTransactionsPanelComponent`). Filters `TransactionsStore.transactions()` by
 * `loan().categoryId` itself, so it stays reactive to newly-categorized transactions with no query
 * of its own to keep in sync, and works identically for any `loanType`.
 *
 * `<mm-collapse>`-wrapped and **closed by default** (loan feedback, 2026-08-22): it's the audit
 * trail you open when a figure above looks wrong, and on a loan with years of payments it otherwise
 * pushed the schedule off the page. The amortization table above took the expanded slot instead.
 */
@Component({
  selector: 'app-loan-payments-list',
  imports: [RouterLink, CollapseComponent, PrivacyBlurComponent, TypographyComponent],
  templateUrl: './loan-payments-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanPaymentsListComponent {
  readonly loan = input.required<Loan>();

  protected readonly open = signal(false);

  private readonly transactionsStore = inject(TransactionsStore);

  /** Blurs each row's amount while privacy mode is on (TICKET-PRIV-01); the date and description stay legible. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  protected readonly rows = computed<LoanPaymentRowVm[]>(() => {
    const loan = this.loan();

    return this.transactionsStore
      .transactions()
      .filter((transaction) => transaction.categoryId === loan.categoryId)
      .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
      .map((transaction) => ({
        id: transaction.id!,
        bookingDate: transaction.bookingDate,
        description: transaction.counterpartyName ?? transaction.rawDescription,
        formattedAmount: formatCurrency(transaction.amount),
        queryParams: buildTransactionDrilldownParams({
          from: transaction.bookingDate,
          to: transaction.bookingDate,
          accountId: transaction.accountId,
          categoryId: loan.categoryId,
        }),
      }));
  });
}
