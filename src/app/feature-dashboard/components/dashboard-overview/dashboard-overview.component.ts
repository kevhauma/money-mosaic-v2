import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerCheck, tablerFileImport, tablerPencil } from '@ng-icons/tabler-icons';
import { computeNetMargin, computePeriodizedRate } from '@/core/stats';
import {
  AccountsStore,
  AppSettingsStore,
  pageRangeControl,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { buildTransactionDrilldownParams, formatCurrency, formatPercent } from '@/shared/utils';
import {
  ButtonComponent,
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  PaperComponent,
  PrivacyToggleComponent,
  RangePickerComponent,
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
import { SpendingHeatmapPanelComponent } from '../spending-heatmap-panel/spending-heatmap-panel.component';
import { TopTransactionsPanelComponent } from '../top-transactions-panel/top-transactions-panel.component';
import { TrendChartPanelComponent } from '../trend-chart-panel/trend-chart-panel.component';
import { WeekdayWeekendSplitPanelComponent } from '../weekday-weekend-split-panel/weekday-weekend-split-panel.component';

@Component({
  selector: 'app-dashboard-overview',
  imports: [
    NgIcon,
    ButtonComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    PaperComponent,
    PrivacyToggleComponent,
    RangePickerComponent,
    StatCardComponent,
    CategoryBreakdownPanelComponent,
    CategoryComparisonPanelComponent,
    TrendChartPanelComponent,
    WeekdayWeekendSplitPanelComponent,
    SpendingHeatmapPanelComponent,
    TopTransactionsPanelComponent,
    ActionQueuePanelComponent,
    AccountBalanceStripComponent,
    DashboardCustomizePanelComponent,
  ],
  templateUrl: './dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerCheck, tablerFileImport, tablerPencil })],
})
export class DashboardOverviewComponent {
  protected readonly statsStore = inject(StatsStore);
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly rangeStore = inject(RangeStore);
  protected readonly transactionsStore = inject(TransactionsStore);
  protected readonly dashboardLayoutSettingsStore = inject(DashboardLayoutSettingsStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  /** Drives the stat cards' `[blurred]`; the panels read the same store themselves (TICKET-PRIV-01). */
  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  /** This page's own date range and its switcher wiring (TICKET-UI-23) — no longer the shell's. */
  protected readonly range = pageRangeControl('dashboard');

  protected readonly customizeMode = signal(false);

  /**
   * Label + icon for the header's settings toggle (TICKET-STAT-25). "Dashboard settings" is the
   * user's own wording, not "Customize" — the panel it opens keeps its internal customize naming.
   */
  protected readonly customizeToggle = computed(() =>
    this.customizeMode()
      ? { label: 'Done', icon: 'tablerCheck' }
      : { label: 'Dashboard settings', icon: 'tablerPencil' },
  );

  /**
   * Deliberately read off `TransactionsStore` rather than `StatsStore`'s period-filtered stats
   * (TICKET-STAT-22): the empty state means "no data at all", not "no data in the selected range" —
   * a range with zero hits must still show the normal zeroed dashboard. Gated on `hydrated()` so the
   * rows' own loading skeletons keep showing while the first read is in flight.
   */
  protected readonly hasNoTransactions = computed(
    () => this.transactionsStore.hydrated() && this.transactionsStore.transactions().length === 0,
  );

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
    buildTransactionDrilldownParams({
      from: this.rangeStore.from('dashboard'),
      to: this.rangeStore.to('dashboard'),
    }),
  );

  /**
   * Point-in-time combined net worth (FR-STAT-1) — the one figure in the stats row that is
   * deliberately not range-scoped. Same `formatCurrency(…, { signed: true })` output the
   * `signedAmount` pipe produced while this lived in the header (TICKET-STAT-25 → TICKET-STAT-28).
   */
  protected readonly netWorthValue = computed(() =>
    formatCurrency(this.accountsStore.netWorth(), { signed: true }),
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

  /**
   * What each of the two savings measures counts, in one sentence (TICKET-STAT-42). Lifted from the
   * header comments on `net-margin.ts` and `PeriodStats.savingsRate`, which are where these
   * definitions already lived — out of the user's reach, which is the whole defect: two adjacent
   * tiles answered "how much do I save?" with 57.1% and 10.7% and neither said why.
   */
  protected readonly netCashFlowDefinition =
    'Income minus everything you spent, whether what is left stayed put or moved on. The sub-label is that as a share of income.';

  protected readonly savingsRateDefinition =
    'The share of income you actually moved into a savings account. Money left sitting in a current account does not count here — Net cash flow is the measure that counts it.';

  /** `net / income`, worded by sign, distinct from savings rate (TICKET-STAT-21) — reuses `netColor`'s success/error split. */
  protected readonly netMarginSubLabel = computed(() => {
    const { net, income } = this.statsStore.periodStats();
    const margin = computeNetMargin(net, income);
    if (margin == null) return undefined;
    const formatted = formatPercent(Math.abs(margin));
    return this.netColor() === 'success'
      ? `${formatted} of income kept, after all spending`
      : `${formatted} of income overspent`;
  });

  protected readonly savingsRateValue = computed(() => {
    const rate = this.statsStore.periodStats().savingsRate;
    return rate == null ? '—' : formatPercent(rate);
  });

  protected readonly savingsSubLabel = computed(() =>
    this.periodizedSubLabel(this.statsStore.periodStats().savings),
  );

  /** `€X/month · €X/week · €X/day`, gated by `computePeriodizedRate`'s bucket-count threshold (TICKET-STAT-21) — day always shows, week/month only once the range spans ≥2 of that bucket. */
  private periodizedSubLabel(figure: number): string {
    const { avgPerDay, avgPerWeek, avgPerMonth } = computePeriodizedRate(
      figure,
      this.rangeStore.from('dashboard'),
      this.rangeStore.to('dashboard'),
    );
    const parts = [
      avgPerMonth != null ? `${formatCurrency(avgPerMonth)}/month` : null,
      avgPerWeek != null ? `${formatCurrency(avgPerWeek)}/week` : null,
      `${formatCurrency(avgPerDay)}/day`,
    ].filter((part): part is string => part != null);
    return parts.join(' · ');
  }
}
