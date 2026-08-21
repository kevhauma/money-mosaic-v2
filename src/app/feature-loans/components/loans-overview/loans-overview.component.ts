import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerPlus, tablerReceipt2 } from '@ng-icons/tabler-icons';
import type { Loan } from '@/core/data-access';
import { ButtonComponent, EmptyStateComponent, PageHeaderComponent } from '@/shared/ui';
import { LoanFormComponent, type LoanFormValue } from '../loan-form/loan-form.component';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans` page container (TICKET-LOAN-02/03). Still page-shell-ish — LOAN-06 replaces the
 * placeholder empty state with real overview cards, which will also open `LoanFormComponent` in
 * edit mode (passing an existing `Loan` as `[loan]`); nothing here calls that path yet.
 */
@Component({
  selector: 'app-loans-overview',
  imports: [ButtonComponent, EmptyStateComponent, LoanFormComponent, NgIcon, PageHeaderComponent],
  templateUrl: './loans-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerPlus, tablerReceipt2 })],
})
export class LoansOverviewComponent {
  // Also unused otherwise beyond `activeLoans`/`addLoan` below — injecting it is what kicks off
  // hydration on first visit (`withHooks({ onInit })`, TICKET-PERF-07).
  protected readonly loansStore = inject(LoansStore);

  protected readonly formOpen = signal(false);
  protected readonly editingLoan = signal<Loan | null>(null);

  protected openAddForm(): void {
    this.editingLoan.set(null);
    this.formOpen.set(true);
  }

  // `openEditForm(loan)` (the `editingLoan.set(loan)` counterpart above) lands with LOAN-06's
  // cards — the only thing that would call it. Nothing on this page needs edit mode yet.

  protected async saveLoan(value: LoanFormValue): Promise<void> {
    const editing = this.editingLoan();
    if (editing?.id != null) {
      await this.loansStore.updateLoan(editing.id, value);
      return;
    }
    await this.loansStore.addLoan({ ...value, archived: false });
  }
}
