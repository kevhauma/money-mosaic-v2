import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerReceipt2 } from '@ng-icons/tabler-icons';
import { EmptyStateComponent, PageHeaderComponent } from '@/shared/ui';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans/:id` detail route (TICKET-LOAN-06) — a placeholder shell, the same "route exists
 * before its content does" shape `AccountsDetailComponent` had before its chart/panels shipped.
 * LOAN-07 (balance chart) through LOAN-10 (ahead/behind indicator) each add a section here.
 */
@Component({
  selector: 'app-loan-detail',
  imports: [EmptyStateComponent, NgIcon, PageHeaderComponent],
  templateUrl: './loan-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerReceipt2 })],
})
export class LoanDetailComponent {
  readonly id = input.required<string>();

  private readonly loansStore = inject(LoansStore);

  protected readonly loan = computed(
    () => this.loansStore.loans().find((loan) => String(loan.id) === this.id()) ?? null,
  );
}
