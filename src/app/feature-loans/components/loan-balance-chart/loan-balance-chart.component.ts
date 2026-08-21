import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Loan, Transaction } from '@/core/data-access';
import { computeActualBalanceSeries, computeAmortizationSchedule } from '@/core/loans';
import {
  formatAxisTooltip,
  legendOption,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import { FlexComponent, PaperComponent } from '@/shared/ui';

const SCHEDULED_SERIES_NAME = 'Scheduled';
const ACTUAL_SERIES_NAME = 'Actual';

/**
 * Pure echarts-option builder, kept separate from the component so it's testable without TestBed
 * (the `buildAccountBalanceChartOption` precedent) — "loan balance," never "mortgage balance," in
 * every label, since this draws identically for any `loanType`.
 *
 * The two series are sampled on different timelines — LOAN-04's schedule is one point per calendar
 * month for the whole term, LOAN-07's actual series is one point per real payment — so they share a
 * category x-axis built from the *union* of both series' dates (plus the loan's own start date, the
 * common origin both lines are anchored to at `loan.principal`). `connectNulls` draws a straight
 * line across whichever dates a given series has no point at, rather than a gap.
 */
export const buildLoanBalanceChartOption = (
  loan: Loan,
  payments: Transaction[],
): EChartsCoreOption => {
  const schedule = computeAmortizationSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.startDate,
  );
  const actual = computeActualBalanceSeries(loan, payments);

  const scheduledByDate = new Map(schedule.map((entry) => [entry.date, entry.remainingBalance]));
  const actualByDate = new Map(actual.map((point) => [point.date, point.balance]));

  const dates = [
    ...new Set([loan.startDate, ...scheduledByDate.keys(), ...actualByDate.keys()]),
  ].sort();

  const seriesData = (byDate: Map<string, number>): (number | null)[] =>
    dates.map((date) => (date === loan.startDate ? loan.principal : (byDate.get(date) ?? null)));

  const legend = legendOption([SCHEDULED_SERIES_NAME, ACTUAL_SERIES_NAME], 'top');

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: { trigger: 'axis', formatter: formatAxisTooltip },
    legend: legend.legend,
    grid: { left: 56, right: 24, top: legend.gridOffset, bottom: 40 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      {
        name: SCHEDULED_SERIES_NAME,
        type: 'line',
        connectNulls: true,
        showSymbol: false,
        data: seriesData(scheduledByDate),
      },
      {
        name: ACTUAL_SERIES_NAME,
        type: 'line',
        connectNulls: true,
        data: seriesData(actualByDate),
      },
    ],
  };
};

/** The Loan detail page's balance-over-time panel (TICKET-LOAN-07): scheduled vs. actual. */
@Component({
  selector: 'app-loan-balance-chart',
  imports: [NgxEchartsDirective, FlexComponent, PaperComponent],
  templateUrl: './loan-balance-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanBalanceChartComponent {
  readonly loan = input.required<Loan>();
  readonly payments = input<Transaction[]>([]);

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildLoanBalanceChartOption(this.loan(), this.payments()),
  );
}
