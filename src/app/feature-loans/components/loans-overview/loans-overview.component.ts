import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerPlus, tablerReceipt2 } from '@ng-icons/tabler-icons';
import type { Loan } from '@/core/data-access';
import { ButtonComponent, EmptyStateComponent, PageHeaderComponent } from '@/shared/ui';
import { loanCardVmFor, type LoanCardVm } from '../../loan-card-vm';
import { LoanCardComponent } from '../loan-card/loan-card.component';
import { LoanFormComponent, type LoanFormValue } from '../loan-form/loan-form.component';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans` page container (TICKET-LOAN-02/03/06) — a card per active loan (type badge, payoff
 * progress, remaining balance, projected payoff date), each linking to `/loans/:id`.
 */
@Component({
  selector: 'app-loans-overview',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    LoanCardComponent,
    LoanFormComponent,
    NgIcon,
    PageHeaderComponent,
  ],
  templateUrl: './loans-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerPlus, tablerReceipt2 })],
})
export class LoansOverviewComponent {
  // Also unused otherwise beyond `activeLoans`/`progressById`/`addLoan` below — injecting it is
  // what kicks off hydration on first visit (`withHooks({ onInit })`, TICKET-PERF-07).
  protected readonly loansStore = inject(LoansStore);

  /**
   * One row per active loan, joining each loan with its `progressById()` entry — a loan whose
   * progress hasn't computed yet (never happens in practice, `progressById` covers every loan in
   * the store) is skipped rather than rendered with a placeholder progress.
   */
  protected readonly loanCards = computed<LoanCardVm[]>(() => {
    const progressById = this.loansStore.progressById();
    return this.loansStore
      .activeLoans()
      .map((loan) => {
        const progress = loan.id != null ? progressById.get(loan.id) : undefined;
        return progress ? loanCardVmFor(loan, progress) : null;
      })
      .filter((vm): vm is LoanCardVm => vm !== null);
  });

  protected readonly formOpen = signal(false);
  protected readonly editingLoan = signal<Loan | null>(null);

  protected openAddForm(): void {
    this.editingLoan.set(null);
    this.formOpen.set(true);
  }

  // `openEditForm(loan)` (the `editingLoan.set(loan)` counterpart above) still has no caller: a
  // card links to `/loans/:id` (this ticket), not an inline edit trigger, and no later FR-LOAN
  // ticket adds one to the overview either — editing an existing loan stays out of scope here.

  protected async saveLoan(value: LoanFormValue): Promise<void> {
    const editing = this.editingLoan();
    if (editing?.id != null) {
      await this.loansStore.updateLoan(editing.id, value);
      return;
    }
    await this.loansStore.addLoan({ ...value, archived: false });
  }
}
