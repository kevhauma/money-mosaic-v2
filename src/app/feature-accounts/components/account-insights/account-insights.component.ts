import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFileImport } from '@ng-icons/tabler-icons';
import type { Account } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import {
  CategoryBreakdownPanelComponent,
  CategoryComparisonPanelComponent,
  StatsStore,
  TopTransactionsPanelComponent,
  TrendChartPanelComponent,
  WeekdayWeekendSplitPanelComponent,
} from '@/feature-dashboard';
import {
  ButtonComponent,
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PaperComponent,
  StatCardComponent,
} from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  formatDate,
  moneyColor,
} from '@/shared/utils';
import { AccountBalanceChartComponent } from '../account-balance-chart/account-balance-chart.component';

/**
 * Account detail's insight section (TICKET-ACC-14): the Dashboard's stat cards and panels, read
 * through the account-scoped `StatsStore` its host provides, under the page's own range.
 *
 * A child of `AccountsDetailComponent` rather than part of it for a DI reason, not a layout one:
 * the host's `provideStatsScope` factory injects the host to read its account id, so the host
 * itself must never inject `StatsStore` — this component is where the store is first read.
 *
 * The panels are the Dashboard's own classes, not look-alikes, so they compute the same figures
 * the same way; what differs is only the store instance they resolve.
 */
@Component({
  selector: 'app-account-insights',
  imports: [
    NgIcon,
    AccountBalanceChartComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PaperComponent,
    StatCardComponent,
    CategoryBreakdownPanelComponent,
    CategoryComparisonPanelComponent,
    TopTransactionsPanelComponent,
    TrendChartPanelComponent,
    WeekdayWeekendSplitPanelComponent,
  ],
  templateUrl: './account-insights.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerFileImport })],
})
export class AccountInsightsComponent {
  readonly account = input.required<Account>();

  protected readonly statsStore = inject(StatsStore);

  /** Same blur the panels below apply (TICKET-PRIV-01), so the cards don't stand out unblurred. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  /** "Nothing ever imported here": one empty state for the whole section, chart included. */
  protected readonly hasNoTransactions = computed(
    () => this.statsStore.dataReady() && this.statsStore.transactions().length === 0,
  );

  /**
   * "Nothing in this range": one empty state in place of the cards and panels, rather than zeroed
   * cards over an empty trend chart (which has no empty state of its own). The balance chart stays —
   * it plots full history, and is the one thing still worth seeing.
   */
  protected readonly hasNoneInRange = computed(() => !this.statsStore.hasTransactionsInRange());

  protected readonly noneInRangeMessage = computed(
    () =>
      `Nothing moved through this account between ${formatDate(this.statsStore.from())} and ${formatDate(this.statsStore.to())}. Pick a wider range above to see its income, expense and categories.`,
  );

  /** Every card drills into `/transactions` for this account and range (FR-STAT-6). */
  protected readonly drilldownParams = computed(() =>
    buildTransactionDrilldownParams(this.statsStore.drilldownScope()),
  );

  protected readonly incomeValue = computed(() =>
    formatCurrency(this.statsStore.periodStats().income),
  );

  protected readonly expenseValue = computed(() =>
    formatCurrency(this.statsStore.periodStats().expense),
  );

  protected readonly netValue = computed(() => formatCurrency(this.statsStore.periodStats().net));

  protected readonly netColor = computed(() => moneyColor(this.statsStore.periodStats().net));

  protected readonly transfersValue = computed(() => {
    const flows = this.statsStore.transferFlows();
    return `${formatCurrency(flows.in)} / ${formatCurrency(flows.out)}`;
  });

  protected readonly transfersSubLabel = computed(() => {
    const flows = this.statsStore.transferFlows();
    return `Net ${formatCurrency(flows.in - flows.out, { signed: true })} with your other accounts`;
  });

  protected readonly incomeExpenseDefinition =
    'Everything that came in or went out of this account at its full amount, joint or not. Moves between your own accounts are counted under Transfers instead.';

  protected readonly transfersDefinition =
    'Money moved in from, and out to, your other accounts, savings included. It is not income or expense, so it is counted here and nowhere else.';
}
