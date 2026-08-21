import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule } from '@/core/loans';
import { CollapseComponent, PaginatorComponent, TableComponent } from '@/shared/ui';
import { createPagination, formatCurrency, formatDate } from '@/shared/utils';

/** One row of the rendered table — every figure already `formatCurrency()`d/`formatDate()`d, purely presentational. */
type AmortizationRow = {
  month: number;
  dateLabel: string;
  paymentLabel: string;
  principalLabel: string;
  interestLabel: string;
  remainingBalanceLabel: string;
};

/** One page = one year of a monthly schedule — a more legible grouping than the app's general 50-row table convention for a figure this repetitive. */
const PAGE_SIZE = 12;

/**
 * The Loan detail page's amortization schedule (TICKET-LOAN-08) — reference detail, not the
 * at-a-glance view, so it opens collapsed below the balance chart (LOAN-07). Recomputes from
 * `loan()` alone (no `loanType` branch, no transaction data), so editing a loan's terms (LOAN-03)
 * updates this table the same render cycle, never a stale cached schedule.
 */
@Component({
  selector: 'app-loan-amortization-table',
  imports: [CollapseComponent, PaginatorComponent, TableComponent],
  templateUrl: './loan-amortization-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanAmortizationTableComponent {
  readonly loan = input.required<Loan>();

  protected readonly open = signal(false);

  protected readonly rows = computed<AmortizationRow[]>(() => {
    const loan = this.loan();
    return computeAmortizationSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.startDate,
    ).map((entry) => ({
      month: entry.month,
      dateLabel: formatDate(entry.date),
      paymentLabel: formatCurrency(entry.payment),
      principalLabel: formatCurrency(entry.principalPortion),
      interestLabel: formatCurrency(entry.interestPortion),
      remainingBalanceLabel: formatCurrency(entry.remainingBalance),
    }));
  });

  protected readonly pagination = createPagination({ items: this.rows, pageSize: PAGE_SIZE });
}
