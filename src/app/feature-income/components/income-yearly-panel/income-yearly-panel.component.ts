import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { computeYearlyIncomeSummary, type YearlyIncomeEntry } from '@/core/stats';
import { AccountsStore, CategoriesStore, TransactionsStore } from '@/core/state';
import { savingsAccountIbans } from '@/core/transfers';
import {
  formatAxisTooltip,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import { PaperComponent } from '@/shared/ui';
import { formatCurrency, formatPercent } from '@/shared/utils';
import { IncomeStore } from '../../income.store';

export type YearlyIncomeAccessibleRow = { year: string; total: string; change: string };

/** Placeholder for a year with no comparison to make (`pctVsPriorYear: null`). Printed rather than left blank, so the bar reads as "nothing to compare" instead of as a missing value. */
const NO_CHANGE_SHOWN = '—';

/** Why a bar carries no percentage, for the tooltip — where there's room to say it. The compact `—` above the bar can't. */
const INCOMPLETE_YEAR_REASON = 'incomplete year — not comparable';

/** `+8.2%` / `-25%` / `—`, via the `'signed'` percent variant so a rise carries an explicit `+`: the label stands alone above its bar, with no icon or neighbouring figure to read direction from. */
export const formatYearOverYearChange = (pctVsPriorYear: number | null): string =>
  pctVsPriorYear === null ? NO_CHANGE_SHOWN : formatPercent(pctVsPriorYear, 'signed');

/** The tooltip's change line: the percentage when there is one, otherwise the reason there isn't. */
export const describeYearOverYearChange = (entry: YearlyIncomeEntry): string =>
  entry.pctVsPriorYear === null && entry.isPartialYear
    ? INCOMPLETE_YEAR_REASON
    : formatYearOverYearChange(entry.pctVsPriorYear);

/** Only the fields this chart's tooltip/label callbacks read off echarts' callback params. */
type YearlyTooltipParam = { dataIndex: number; value: number };

/**
 * Pure echarts-option builder for the yearly income bars, kept separate from the component so it's
 * testable without TestBed. One bar per calendar year with its %-change vs. the prior year printed
 * above it, and the same change repeated in the tooltip beneath the amount — the label is the
 * at-a-glance read, the tooltip the precise one. A year with no percentage shows `—` above the bar
 * and, when that's because the year is incomplete, says so in the tooltip.
 *
 * No `dataZoom` (unlike the monthly chart's `bucketedZoomAxisOption`): a full history is a handful
 * of years, so every bar fits on the axis and a slider would only add chrome to hide data behind.
 */
export const buildYearlyIncomeChartOption = (entries: YearlyIncomeEntry[]): EChartsCoreOption => {
  const changeLabels = entries.map((entry) => formatYearOverYearChange(entry.pctVsPriorYear));
  const changeDescriptions = entries.map(describeYearOverYearChange);

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: {
      trigger: 'axis',
      formatter: (params: YearlyTooltipParam | YearlyTooltipParam[]): string => {
        // Axis trigger over a single bar series: always exactly one hovered bar, so its index is
        // always a real position in `changeDescriptions`.
        const [hovered] = Array.isArray(params) ? params : [params];
        const change = changeDescriptions[hovered.dataIndex];
        return `${formatAxisTooltip(params)}<br/>vs. prior year: ${change}`;
      },
    },
    grid: { left: 56, right: 24, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: entries.map((entry) => entry.year) },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Income',
        type: 'bar',
        data: entries.map((entry) => entry.total),
        label: {
          show: true,
          position: 'top',
          // The app's first in-canvas chart text, so there's no `resolveChartTextColor()` to read:
          // `'inherit'` takes the bar's own colour, which already comes from
          // `resolveChartCategoricalColors()` and is therefore theme-resolved. Left unset, echarts
          // paints labels near-black and they vanish on the dark themes.
          color: 'inherit',
          formatter: (params: YearlyTooltipParam): string => changeLabels[params.dataIndex],
        },
      },
    ],
  };
};

/**
 * Yearly income view (FR-INC-6, TICKET-INC-06): one bar per calendar year across the user's full
 * history, each labelled with its %-change vs. the year before.
 *
 * Its own aggregate over raw transactions (`computeYearlyIncomeSummary`), not a re-bucketing of the
 * monthly series next to it — and deliberately range-independent, reading the page-level
 * `IncomeStore.fullHistoryRange` rather than the topbar, so the yearly trend always shows every
 * year the user has data for. Totals are unsmoothed on purpose: FR-INC-4 redistributes a lump sum
 * *within* a year, which changes nothing once the bucket is the whole year.
 */
@Component({
  selector: 'app-income-yearly-panel',
  imports: [NgxEchartsDirective, PaperComponent],
  templateUrl: './income-yearly-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeYearlyPanelComponent {
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly incomeStore = inject(IncomeStore);

  private readonly range = this.incomeStore.fullHistoryRange;

  private readonly yearlyIncome = computed(() =>
    computeYearlyIncomeSummary(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.incomeStore.selectedIncomeCategoryIds(),
      this.range().from,
      this.range().to,
      savingsAccountIbans(this.accountsStore.accounts()),
      this.accountsStore.accountsById(),
    ),
  );

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildYearlyIncomeChartOption(this.yearlyIncome()),
  );

  /**
   * Mirrors the chart's figures into DOM text for assistive tech (same treatment as the monthly
   * chart and the dashboard's trend panel, TICKET-STAT-20) — sourced from the same signal the chart
   * renders, so it can never diverge.
   */
  protected readonly accessibleRows = computed<YearlyIncomeAccessibleRow[]>(() =>
    this.yearlyIncome().map((entry) => ({
      year: entry.year,
      total: formatCurrency(entry.total),
      // The tooltip's wording, not the bar label's `—`: a screen-reader user has no bar to hover
      // for the reason, so the table is where it has to be said.
      change: describeYearOverYearChange(entry),
    })),
  );

  protected readonly chartAriaLabel = computed(
    () =>
      `Income per calendar year with change vs. the prior year, ${this.range().from}–${this.range().to}; table with values follows`,
  );
}
