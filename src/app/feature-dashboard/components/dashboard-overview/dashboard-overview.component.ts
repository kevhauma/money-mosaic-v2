import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerCheck, tablerPencil } from '@ng-icons/tabler-icons';
import { computeNetMargin, computePeriodizedRate, RangeStore } from '@/core/stats';
import { AccountsStore } from '@/core/state';
import { buildTransactionDrilldownParams, formatCurrency } from '@/shared/utils';
import {
  ButtonComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  PaperComponent,
  StatCardComponent,
} from '@/shared/ui';
import { DashboardLayoutSettingsStore } from '../../dashboard-layout-settings.store';
import { visibleDashboardRows } from '../../dashboard-row-order';
import { StatsStore } from '../../stats.store';
import { AccountBalanceStripComponent } from '../account-balance-strip/account-balance-strip.component';
import { ActionQueuePanelComponent } from '../action-queue-panel/action-queue-panel.component';
import { CategoryBreakdownPanelComponent } from '../category-breakdown-panel/category-breakdown-panel.component';
import { CategoryComparisonPanelComponent } from '../category-comparison-panel/category-comparison-panel.component';
import { DashboardCustomizePanelComponent } from '../dashboard-customize-panel/dashboard-customize-panel.component';
import { NetWorthHeaderComponent } from '../net-worth-header/net-worth-header.component';
import { TopTransactionsPanelComponent } from '../top-transactions-panel/top-transactions-panel.component';
import { TrendChartPanelComponent } from '../trend-chart-panel/trend-chart-panel.component';
import { WeekdayWeekendSplitPanelComponent } from '../weekday-weekend-split-panel/weekday-weekend-split-panel.component';

const PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
});

@Component({
  selector: 'app-dashboard-overview',
  imports: [
    NgIcon,
    ButtonComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    PaperComponent,
    StatCardComponent,
    NetWorthHeaderComponent,
    CategoryBreakdownPanelComponent,
    CategoryComparisonPanelComponent,
    TrendChartPanelComponent,
    WeekdayWeekendSplitPanelComponent,
    TopTransactionsPanelComponent,
    ActionQueuePanelComponent,
    AccountBalanceStripComponent,
    DashboardCustomizePanelComponent,
  ],
  templateUrl: './dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerCheck, tablerPencil })],
})
export class DashboardOverviewComponent {
  protected readonly statsStore = inject(StatsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly rangeStore = inject(RangeStore);
  protected readonly dashboardLayoutSettingsStore = inject(DashboardLayoutSettingsStore);

  protected readonly customizeMode = signal(false);

  protected readonly visibleRows = computed(() =>
    visibleDashboardRows(
      this.dashboardLayoutSettingsStore.rowOrder(),
      this.dashboardLayoutSettingsStore.hiddenRowIds(),
    ),
  );

  protected toggleCustomizeMode(): void {
    this.customizeMode.set(!this.customizeMode());
  }

  protected readonly drilldownParams = computed(() =>
    buildTransactionDrilldownParams({ from: this.rangeStore.from(), to: this.rangeStore.to() }),
  );

  protected readonly incomeValue = computed(() =>
    formatCurrency(this.statsStore.periodStats().income),
  );

  protected readonly expenseValue = computed(() =>
    formatCurrency(this.statsStore.periodStats().expense),
  );

  protected readonly netValue = computed(() => formatCurrency(this.statsStore.periodStats().net));

  protected readonly netColor = computed<'success' | 'error'>(() =>
    this.statsStore.periodStats().net >= 0 ? 'success' : 'error',
  );

  protected readonly incomeSubLabel = computed(() =>
    this.periodizedSubLabel(this.statsStore.periodStats().income),
  );

  protected readonly expenseSubLabel = computed(() =>
    this.periodizedSubLabel(this.statsStore.periodStats().expense),
  );

  /** `net / income`, worded by sign, distinct from savings rate (TICKET-STAT-21) — reuses `netColor`'s success/error split. */
  protected readonly netMarginSubLabel = computed(() => {
    const { net, income } = this.statsStore.periodStats();
    const margin = computeNetMargin(net, income);
    if (margin == null) return undefined;
    const formatted = PERCENT_FORMATTER.format(Math.abs(margin));
    return this.netColor() === 'success'
      ? `${formatted} of income kept`
      : `${formatted} of income overspent`;
  });

  protected readonly savingsRateValue = computed(() => {
    const rate = this.statsStore.periodStats().savingsRate;
    return rate == null ? '—' : PERCENT_FORMATTER.format(rate);
  });

  protected readonly savingsSubLabel = computed(() =>
    this.periodizedSubLabel(this.statsStore.periodStats().savings),
  );

  /** `€X/month · €X/week · €X/day`, gated by `computePeriodizedRate`'s bucket-count threshold (TICKET-STAT-21) — day always shows, week/month only once the range spans ≥2 of that bucket. */
  private periodizedSubLabel(figure: number): string {
    const { avgPerDay, avgPerWeek, avgPerMonth } = computePeriodizedRate(
      figure,
      this.rangeStore.from(),
      this.rangeStore.to(),
    );
    const parts = [
      avgPerMonth != null ? `${formatCurrency(avgPerMonth)}/month` : null,
      avgPerWeek != null ? `${formatCurrency(avgPerWeek)}/week` : null,
      `${formatCurrency(avgPerDay)}/day`,
    ].filter((part): part is string => part != null);
    return parts.join(' · ');
  }
}
