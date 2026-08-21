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
import { LoansStore } from '../../loans.store';

/**
 * The `/loans/:id` detail route (TICKET-LOAN-06). Placeholder body — LOAN-07 (balance chart)
 * through LOAN-10 (ahead/behind indicator) each add a section — but the header's archive/delete
 * actions (TICKET-LOAN-11) are real: the `AccountsDetailComponent` shape, with every message
 * reading "this loan," never "this mortgage," since a mortgage, a car loan, and a personal loan
 * are archived/deleted identically.
 */
@Component({
  selector: 'app-loan-detail',
  imports: [
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
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

  protected readonly loan = computed(
    () => this.loansStore.loans().find((loan) => String(loan.id) === this.id()) ?? null,
  );

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
