import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerArchive, tablerArchiveOff, tablerTrash } from '@ng-icons/tabler-icons';
import {
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  PageHeaderComponent,
  TypographyComponent,
} from '@/shared/ui';
import { TransactionsStore } from '@/core/state';
import { computeAmortizationSchedule, computeScheduleComparison } from '@/core/loans';
import { LoanAmortizationTableComponent } from '../loan-amortization-table/loan-amortization-table.component';
import { LoanBalanceChartComponent } from '../loan-balance-chart/loan-balance-chart.component';
import { LoanPaymentsListComponent } from '../loan-payments-list/loan-payments-list.component';
import { loanScheduleStatusFor } from '../../loan-schedule-status';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans/:id` detail route (TICKET-LOAN-06). LOAN-07 (balance chart), LOAN-08 (amortization
 * table), LOAN-09 (linked payments), and LOAN-10 (ahead/behind indicator) fill in every panel. The
 * header's archive/delete actions (TICKET-LOAN-11) are real: the `AccountsDetailComponent` shape,
 * with every message reading "this loan," never "this mortgage," since a mortgage, a car loan, and
 * a personal loan are archived/deleted identically.
 */
@Component({
  selector: 'app-loan-detail',
  imports: [
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    LoanAmortizationTableComponent,
    LoanBalanceChartComponent,
    LoanPaymentsListComponent,
    NgIcon,
    PageHeaderComponent,
    TypographyComponent,
  ],
  templateUrl: './loan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerArchive, tablerArchiveOff, tablerTrash })],
})
export class LoanDetailComponent {
  readonly id = input.required<string>();

  private readonly router = inject(Router);
  private readonly loansStore = inject(LoansStore);
  private readonly transactionsStore = inject(TransactionsStore);

  protected readonly loan = computed(
    () => this.loansStore.loans().find((loan) => String(loan.id) === this.id()) ?? null,
  );

  /** This loan's linked-category transactions, the only filtering `core/loans`' pure functions expect done for them (TICKET-LOAN-05's Notes). */
  protected readonly payments = computed(() => {
    const loan = this.loan();
    if (!loan) return [];
    return this.transactionsStore
      .transactions()
      .filter((transaction) => transaction.categoryId === loan.categoryId);
  });

  /** The same ahead/behind-schedule + interest-saved badge the overview cards show (TICKET-LOAN-10) — one shared builder, so the two can't phrase the same figure two different ways. */
  protected readonly scheduleStatus = computed(() => {
    const loan = this.loan();
    if (loan?.id == null) return null;
    const progress = this.loansStore.progressById().get(loan.id);
    if (!progress) return null;

    const schedule = computeAmortizationSchedule(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.startDate,
    );
    return loanScheduleStatusFor(computeScheduleComparison(loan, schedule, progress));
  });

  protected readonly archiveToggle = computed(() =>
    this.loan()?.archived
      ? { label: 'Unarchive', icon: 'tablerArchiveOff' }
      : { label: 'Archive', icon: 'tablerArchive' },
  );

  protected readonly deleteConfirmOpen = signal(false);

  protected toggleArchive(): void {
    const loan = this.loan();
    if (loan?.id == null) {
      return;
    }
    void (loan.archived
      ? this.loansStore.unarchiveLoan(loan.id)
      : this.loansStore.archiveLoan(loan.id));
  }

  protected async deleteConfirmed(): Promise<void> {
    const loan = this.loan();
    if (loan?.id == null) {
      return;
    }
    await this.loansStore.removeLoan(loan.id);
    await this.router.navigate(['/loans']);
  }
}
