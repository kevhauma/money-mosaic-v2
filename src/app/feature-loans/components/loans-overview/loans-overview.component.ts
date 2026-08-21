import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerReceipt2 } from '@ng-icons/tabler-icons';
import { EmptyStateComponent, PageHeaderComponent } from '@/shared/ui';
import { LoansStore } from '../../loans.store';

/**
 * The `/loans` page container (TICKET-LOAN-02). Page-shell only for now — LOAN-03 through LOAN-11
 * each add their own panel onto this component; until then it's a placeholder so the route, nav
 * item, and store hydration wiring all have somewhere real to land.
 */
@Component({
  selector: 'app-loans-overview',
  imports: [EmptyStateComponent, NgIcon, PageHeaderComponent],
  templateUrl: './loans-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerReceipt2 })],
})
export class LoansOverviewComponent {
  // Unused otherwise — injecting it is the point: `LoansStore` hydrates itself on first injection
  // (`withHooks({ onInit })`, TICKET-PERF-07), and visiting this page is what should kick that off.
  protected readonly loansStore = inject(LoansStore);
}
