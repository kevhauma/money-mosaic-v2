import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RangeStore } from '@/core/stats';
import { AccountsStore } from '@/feature-accounts';
import { buildTransactionDrilldownParams } from '@/shared/utils';
import { PageHeaderComponent, StatCardComponent } from '@/shared/ui';
import { StatsStore } from '../../stats.store';
import { AccountBalanceStripComponent } from '../account-balance-strip/account-balance-strip.component';
import { ActionQueuePanelComponent } from '../action-queue-panel/action-queue-panel.component';
import { CategoryBreakdownPanelComponent } from '../category-breakdown-panel/category-breakdown-panel.component';
import { NetWorthHeaderComponent } from '../net-worth-header/net-worth-header.component';
import { TrendChartPanelComponent } from '../trend-chart-panel/trend-chart-panel.component';

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

@Component({
  selector: 'app-dashboard-overview',
  imports: [
    PageHeaderComponent,
    StatCardComponent,
    NetWorthHeaderComponent,
    CategoryBreakdownPanelComponent,
    TrendChartPanelComponent,
    ActionQueuePanelComponent,
    AccountBalanceStripComponent,
  ],
  templateUrl: './dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  protected readonly statsStore = inject(StatsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly rangeStore = inject(RangeStore);

  protected readonly drilldownParams = computed(() =>
    buildTransactionDrilldownParams({ from: this.rangeStore.from(), to: this.rangeStore.to() }),
  );

  protected readonly incomeValue = computed(() =>
    EUR_FORMATTER.format(this.statsStore.periodStats().income),
  );

  protected readonly expenseValue = computed(() =>
    EUR_FORMATTER.format(this.statsStore.periodStats().expense),
  );

  protected readonly netValue = computed(() =>
    EUR_FORMATTER.format(this.statsStore.periodStats().net),
  );

  protected readonly netColor = computed<'success' | 'error'>(() =>
    this.statsStore.periodStats().net >= 0 ? 'success' : 'error',
  );

  protected readonly savingsRateValue = computed(() => {
    const rate = this.statsStore.periodStats().savingsRate;
    return rate == null ? '—' : PERCENT_FORMATTER.format(rate);
  });

  /** The absolute savings figure behind the rate — money moved into savings this period (TICKET-TRF-02). */
  protected readonly savingsSubLabel = computed(
    () => `${EUR_FORMATTER.format(this.statsStore.periodStats().savings)} to savings`,
  );
}
