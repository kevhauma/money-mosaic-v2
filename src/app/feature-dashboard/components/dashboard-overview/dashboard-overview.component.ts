import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerAdjustments } from '@ng-icons/tabler-icons';
import { RangeStore, type PeriodStats } from '@/core/stats';
import { AccountsStore } from '@/feature-accounts';
import { buildTransactionDrilldownParams, formatCurrency } from '@/shared/utils';
import { ButtonComponent, PageHeaderComponent, StatCardComponent } from '@/shared/ui';
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
/** `signDisplay: 'exceptZero'` so a year-over-year delta always shows its sign (e.g. "+12%"), unlike the plain PERCENT_FORMATTER used for the (always non-negative) savings rate. */
const YOY_PERCENT_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const DATE_FORMATTER = new Intl.DateTimeFormat('en-BE', { dateStyle: 'medium' });

@Component({
  selector: 'app-dashboard-overview',
  imports: [
    NgIcon,
    ButtonComponent,
    PageHeaderComponent,
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
  viewProviders: [provideIcons({ tablerAdjustments })],
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

  /** Hidden for `all-time` (no meaningful "same period" to shift) and whenever less than a year of history exists (TICKET-STAT-07). */
  protected readonly showYearOverYear = computed(
    () => this.rangeStore.preset() !== 'all-time' && this.statsStore.yearOverYear().delta != null,
  );

  protected readonly incomeYoySubLabel = computed(() =>
    this.yoySubLabel(this.statsStore.yearOverYear().delta?.income ?? null),
  );

  protected readonly expenseYoySubLabel = computed(() =>
    this.yoySubLabel(this.statsStore.yearOverYear().delta?.expense ?? null),
  );

  protected readonly netYoySubLabel = computed(() =>
    this.yoySubLabel(this.statsStore.yearOverYear().delta?.net ?? null),
  );

  private yoySubLabel(deltaPct: number | null): string | undefined {
    if (!this.showYearOverYear() || deltaPct == null) return undefined;
    return `${YOY_PERCENT_FORMATTER.format(deltaPct)} vs. last year`;
  }

  protected readonly incomeYoyTooltip = computed(() =>
    this.yoyTooltip('Earned', (stats) => stats.income),
  );

  protected readonly expenseYoyTooltip = computed(() =>
    this.yoyTooltip('Spent', (stats) => stats.expense),
  );

  protected readonly netYoyTooltip = computed(() => this.yoyTooltip('Saved', (stats) => stats.net));

  /** Spells out the figure behind the delta badge — the prior year's amount and the exact dates it was compared against. */
  private yoyTooltip(verb: string, pick: (stats: PeriodStats) => number): string | undefined {
    if (!this.showYearOverYear()) return undefined;
    const priorYear = this.statsStore.yearOverYear().priorYears[0];
    if (!priorYear) return undefined;
    const amount = formatCurrency(pick(priorYear.stats));
    const from = DATE_FORMATTER.format(new Date(`${priorYear.from}T00:00:00Z`));
    const to = DATE_FORMATTER.format(new Date(`${priorYear.to}T00:00:00Z`));
    return `${verb} ${amount}\nbetween ${from} and ${to}`;
  }

  protected readonly savingsRateValue = computed(() => {
    const rate = this.statsStore.periodStats().savingsRate;
    return rate == null ? '—' : PERCENT_FORMATTER.format(rate);
  });

  /** The absolute savings figure behind the rate — money moved into savings this period (TICKET-TRF-02). */
  protected readonly savingsSubLabel = computed(
    () => `${formatCurrency(this.statsStore.periodStats().savings)} to savings`,
  );

  protected readonly spendingRateValue = computed(
    () => `${formatCurrency(this.statsStore.spendingRate().avgPerDay)}/day`,
  );

  /** Coarser units past day, only when the range is long enough for them to be a genuine average rather than the total (FR-STAT-9). */
  protected readonly spendingRateSubLabel = computed(() => {
    const { avgPerWeek, avgPerMonth } = this.statsStore.spendingRate();
    const parts = [
      avgPerWeek != null ? `${formatCurrency(avgPerWeek)}/week` : null,
      avgPerMonth != null ? `${formatCurrency(avgPerMonth)}/month` : null,
    ].filter((part): part is string => part != null);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  });
}
