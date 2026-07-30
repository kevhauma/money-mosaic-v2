import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTrendingUp } from '@ng-icons/tabler-icons';
import { EmptyStateComponent, PageHeaderComponent } from '@/shared/ui';

/**
 * The `/income` page container (FR-INC-1, TICKET-INC-01) — deliberately a shell for now.
 * TICKET-INC-02 onwards each hang their own panel off this component; the empty state below is
 * what stands in until the first of them lands. `IncomeStore` is injected by those panels rather
 * than here, so this container doesn't carry an unused dependency in the meantime.
 */
@Component({
  selector: 'app-income-overview',
  imports: [EmptyStateComponent, NgIcon, PageHeaderComponent],
  templateUrl: './income-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTrendingUp })],
})
export class IncomeOverviewComponent {}
