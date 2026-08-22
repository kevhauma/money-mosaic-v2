import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule } from '@/core/loans';
import { CollapseComponent, PaginatorComponent, TableComponent } from '@/shared/ui';
import { createPagination, formatCurrency, formatDate } from '@/shared/utils';
import { LoanCompositionChartComponent } from '../loan-composition-chart/loan-composition-chart.component';

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
 * The Loan detail page's amortization schedule (TICKET-LOAN-08) — the balance chart above says
 * *where* the loan stands, this panel says *why*, so it opens **expanded** (loan feedback,
 * 2026-08-22, reversing LOAN-08's collapsed default); the linked-payments list below it took the
 * collapsed slot instead. Recomputes from `loan()` alone (no `loanType` branch, no transaction
 * data), so editing a loan's terms updates both the composition chart and the table the same render
 * cycle, never a stale cached schedule.
 */
@Component({
  selector: 'app-loan-amortization-table',
  imports: [CollapseComponent, LoanCompositionChartComponent, PaginatorComponent, TableComponent],
  templateUrl: './loan-amortization-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanAmortizationTableComponent {
  readonly loan = input.required<Loan>();

  protected readonly open = signal(true);

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
