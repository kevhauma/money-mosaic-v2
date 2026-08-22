import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Loan } from '@/core/data-access';
import { computeAmortizationSchedule, type AmortizationEntry } from '@/core/loans';
import {
  legendOption,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import { FlexComponent, TabsComponent, TypographyComponent, type TabDefinition } from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/utils';

const PRINCIPAL_SERIES_NAME = 'Principal';
const INTEREST_SERIES_NAME = 'Interest';

/**
 * Which total the two shares are measured against. Both bases split the same loan the same two
 * ways; they differ only in the denominator, which is the whole point of the toggle:
 *
 * - `payment` — **this month's payment is 100%.** The classic amortization picture: interest
 *   dominates the early payments and principal the late ones, with the crossover visible.
 * - `balance` — **the loan's whole cost is 100%.** Each month plots what is *still owed* — the
 *   remaining balance plus the interest not yet accrued — so the stack falls from 100% to 0% and
 *   shows that the interest half burns off well ahead of the principal half.
 */
export type LoanCompositionBasis = 'payment' | 'balance';

/**
 * One month's two shares. `*Percent` is what the chart *draws* (echarts' 0–100 axis scale);
 * `*Amount` is the currency figure behind it, which is what the tooltip *says* — a share answers
 * "which half is this month mostly paying for", but the number you'd act on is the euro amount.
 */
type CompositionPoint = {
  date: string;
  dateLabel: string;
  principalPercent: number;
  interestPercent: number;
  principalAmount: number;
  interestAmount: number;
};

/** Only the fields the tooltip callback reads; echarts passes far more. */
type CompositionTooltipParam = {
  dataIndex: number;
  marker?: string;
  seriesName?: string;
};

/**
 * Pure option builder, kept out of the component so it's testable without TestBed (the
 * `buildLoanBalanceChartOption` precedent). No transaction data and no `loanType` branch: this
 * draws the *scheduled* composition, which is a property of the terms alone.
 */
export const buildLoanCompositionChartOption = (
  loan: Loan,
  basis: LoanCompositionBasis,
): EChartsCoreOption => {
  const points = compositionPoints(loan, basis);
  const legend = legendOption([PRINCIPAL_SERIES_NAME, INTEREST_SERIES_NAME], 'top');

  const series = (name: string, pick: (point: CompositionPoint) => number): object => ({
    name,
    type: 'line',
    // One stack, so the two shares read as parts of a whole rather than two independent lines.
    stack: 'composition',
    areaStyle: {},
    showSymbol: false,
    lineStyle: { width: 1 },
    data: points.map(pick),
  });

  return {
    ...resolveChartAnimation(),
    color: resolveChartCategoricalColors(),
    tooltip: { trigger: 'axis', formatter: compositionTooltip(points) },
    legend: legend.legend,
    grid: { left: 48, right: 24, top: legend.gridOffset, bottom: 40 },
    xAxis: { type: 'category', data: points.map((point) => point.date) },
    // Fixed to a full 0–100 axis in both bases — an auto-scaled axis would silently rescale between
    // them and make the toggle look like it changed the loan rather than the question being asked.
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      series(PRINCIPAL_SERIES_NAME, (point) => point.principalPercent),
      series(INTEREST_SERIES_NAME, (point) => point.interestPercent),
    ],
  };
};

/**
 * The hovered month's two figures as **currency, not the percentages the chart draws** — the shares
 * are already legible from the bands themselves, so restating them adds nothing, whereas the amount
 * behind a share is the thing you can't read off the picture. Rounded to whole units
 * (`{ whole: true }`): a tooltip is skimmed, and cents on a mortgage schedule are noise.
 *
 * Not `formatAxisTooltip` — that reads each series' own plotted `value`, which here is a percentage.
 * This looks the amount up by `dataIndex` instead, so the chart can draw one thing and say another.
 */
const compositionTooltip =
  (points: CompositionPoint[]) =>
  (params: CompositionTooltipParam | CompositionTooltipParam[]): string => {
    const items = Array.isArray(params) ? params : [params];
    const point = points[items[0]?.dataIndex];
    if (!point) return '';

    const amountOf = (seriesName: string | undefined): number | null =>
      seriesName === PRINCIPAL_SERIES_NAME
        ? point.principalAmount
        : seriesName === INTEREST_SERIES_NAME
          ? point.interestAmount
          : null;

    const lines = items
      .map((item) => {
        const amount = amountOf(item.seriesName);
        return amount === null
          ? null
          : `${item.marker ?? ''}${item.seriesName}: ${formatCurrency(amount, { whole: true })}`;
      })
      .filter((line): line is string => line !== null);

    return [point.dateLabel, ...lines].join('<br/>');
  };

/** Each month's payment as the whole: interest is `100 - principal` rather than a second division, so the stack lands on exactly 100. */
const paymentBasisPoints = (schedule: AmortizationEntry[]): CompositionPoint[] =>
  schedule.map((entry) => {
    const principalPercent = entry.payment > 0 ? (entry.principalPortion / entry.payment) * 100 : 0;
    return {
      date: entry.date,
      dateLabel: formatDate(entry.date),
      principalPercent,
      interestPercent: 100 - principalPercent,
      principalAmount: entry.principalPortion,
      interestAmount: entry.interestPortion,
    };
  });

/**
 * What is still owed each month, against everything the loan will ever cost — principal repaid plus
 * interest accrued, i.e. the sum of every scheduled payment. Walks the schedule backwards so the
 * interest not yet accrued accumulates in one pass and the final month lands on exactly 0.
 */
const balanceBasisPoints = (schedule: AmortizationEntry[]): CompositionPoint[] => {
  const totalCost = schedule.reduce((total, entry) => total + entry.payment, 0);
  const share = (amount: number): number => (totalCost > 0 ? (amount / totalCost) * 100 : 0);

  const points: CompositionPoint[] = [];
  let interestStillToAccrue = 0;
  for (let index = schedule.length - 1; index >= 0; index--) {
    const entry = schedule[index];
    points.unshift({
      date: entry.date,
      dateLabel: formatDate(entry.date),
      principalPercent: share(entry.remainingBalance),
      interestPercent: share(interestStillToAccrue),
      principalAmount: entry.remainingBalance,
      interestAmount: interestStillToAccrue,
    });
    interestStillToAccrue += entry.interestPortion;
  }
  return points;
};

/** The two shares per scheduled month, for whichever basis is selected. */
const compositionPoints = (loan: Loan, basis: LoanCompositionBasis): CompositionPoint[] => {
  const schedule = computeAmortizationSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.startDate,
  );
  return basis === 'payment' ? paymentBasisPoints(schedule) : balanceBasisPoints(schedule);
};

const BASIS_TABS: TabDefinition[] = [
  { label: 'Monthly payment', value: 'payment' },
  { label: 'Remaining balance', value: 'balance' },
];

/** What each basis is actually measuring, said in words rather than left to be inferred from the axis. */
const BASIS_CAPTION: Record<LoanCompositionBasis, string> = {
  payment:
    "Each month's payment as 100%, split into the principal it repays and the interest it covers.",
  balance:
    "What's still owed each month — remaining principal plus interest not yet accrued — as a share of everything the loan will cost.",
};

/**
 * The principal-vs-interest composition of a loan's schedule (loan feedback, 2026-08-22), shown at
 * the top of the amortization panel: the same figures the table below lists month by month, read as
 * two shares over the whole term.
 *
 * No `sr-only` companion table (the TICKET-STAT-20 pattern) on purpose — the amortization table it
 * sits directly above already carries every principal and interest figure this chart is derived
 * from, so a second one would repeat the panel's own content rather than add to it.
 *
 * The basis lives in a local `signal`, not `ChartOptionsStore`: that store exists because
 * `setOption(option, true)` discards echarts' *own* legend/zoom state, which a caller-owned toggle
 * never had. It sits beside `LoanAmortizationTableComponent.open` in scope and lifetime.
 */
@Component({
  selector: 'app-loan-composition-chart',
  imports: [NgxEchartsDirective, FlexComponent, TabsComponent, TypographyComponent],
  templateUrl: './loan-composition-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanCompositionChartComponent {
  readonly loan = input.required<Loan>();

  protected readonly basisTabs = BASIS_TABS;
  protected readonly basis = signal<LoanCompositionBasis>('payment');
  protected readonly caption = computed(() => BASIS_CAPTION[this.basis()]);

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildLoanCompositionChartOption(this.loan(), this.basis()),
  );

  /** `mm-tabs` emits the raw `string | undefined` its `TabDefinition[]` carries; narrow it rather than casting. */
  protected setBasis(value: string | undefined): void {
    if (value === 'payment' || value === 'balance') {
      this.basis.set(value);
    }
  }
}
