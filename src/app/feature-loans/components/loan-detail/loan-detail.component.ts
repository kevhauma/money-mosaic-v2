import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
  tablerReceipt2,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  PageHeaderComponent,
} from '@/shared/ui';
import { TransactionsStore } from '@/core/state';
import { LoanBalanceChartComponent } from '../loan-balance-chart/loan-balance-chart.component';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans/:id` detail route (TICKET-LOAN-06). LOAN-07 fills in the first real panel — the
 * balance-over-time chart; LOAN-08 through LOAN-10 each add another below it. The header's
 * archive/delete actions (TICKET-LOAN-11) are real: the `AccountsDetailComponent` shape, with every
 * message reading "this loan," never "this mortgage," since a mortgage, a car loan, and a personal
 * loan are archived/deleted identically.
 */
@Component({
  selector: 'app-loan-detail',
  imports: [
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    LoanBalanceChartComponent,
    NgIcon,
    PageHeaderComponent,
  ],
  templateUrl: './loan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerArchive, tablerArchiveOff, tablerReceipt2, tablerTrash })],
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
