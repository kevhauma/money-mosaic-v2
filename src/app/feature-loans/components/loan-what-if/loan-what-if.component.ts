import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Loan, Transaction } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { computeLoanProgress, projectLoanWhatIf, type WhatIfProjection } from '@/core/loans';
import {
  formatAxisTooltip,
  legendOption,
  resolveChartAnimation,
  resolveChartCategoricalColors,
} from '@/shared/echarts';
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TypographyComponent,
} from '@/shared/ui';
import { buildLoanWhatIfHeadline } from '../../loan-what-if-vm';

const BASELINE_SERIES_NAME = 'Current plan';
const SCENARIO_SERIES_NAME = 'With extra payments';

/**
 * Pure echarts-option builder, kept out of the component so it's testable without TestBed (the
 * `buildLoanBalanceChartOption` precedent). Takes the **projection only** — never the loan — so it
 * is type-agnostic by construction rather than by discipline: `loanType` isn't in scope here.
 *
 * The scenario pays off no later than the baseline, so its series is shorter. It is padded with `0`
 * rather than left null: a flat line along the axis says "this loan is already gone from here on,"
 * which is exactly the point being made, where a line that simply stops reads as missing data.
 */
export const buildLoanWhatIfChartOption = (projection: WhatIfProjection): EChartsCoreOption => {
  const dates = [
    ...new Set([
      ...projection.baseline.balanceSeries.map((point) => point.date),
      ...projection.scenario.balanceSeries.map((point) => point.date),
    ]),
  ].sort();

  const seriesData = (points: { date: string; balance: number }[]): number[] => {
    const byDate = new Map(points.map((point) => [point.date, point.balance]));
    return dates.map((date) => byDate.get(date) ?? 0);
  };

  const legend = legendOption([BASELINE_SERIES_NAME, SCENARIO_SERIES_NAME], 'top');

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
        name: BASELINE_SERIES_NAME,
        type: 'line',
        showSymbol: false,
        data: seriesData(projection.baseline.balanceSeries),
      },
      {
        name: SCENARIO_SERIES_NAME,
        type: 'line',
        showSymbol: false,
        data: seriesData(projection.scenario.balanceSeries),
      },
    ],
  };
};

/** The quick-set amounts beside the field — `forecast-controls`' preset shape, as plain buttons. */
const PRESET_AMOUNTS = [50, 100, 200];

/**
 * The Loan detail page's What-if tab (TICKET-LOAN-13, FR-LOAN-13): one control — an extra amount
 * per month — answered by LOAN-12's `projectLoanWhatIf` with a payoff date, how much sooner that
 * is, and the interest it saves, drawn against the do-nothing baseline.
 *
 * **Nothing here is persisted** (this ticket's Notes): a what-if is a question the user asks, not a
 * fact about the loan. Saving it would make every other surface — the overview cards, the
 * ahead/behind badge, all of which report *real* progress — disagree with a scenario the app had
 * started to believe. So the scenario lives in this component's own control and dies with it, and
 * there is no store write or Dexie touch anywhere in this component.
 *
 * `today` is captured once at construction and passed into the engine, keeping `core/loans` pure —
 * no function there reads the clock.
 */
@Component({
  selector: 'app-loan-what-if',
  imports: [
    ReactiveFormsModule,
    NgxEchartsDirective,
    ButtonComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    PaperComponent,
    PrivacyBlurComponent,
    TypographyComponent,
  ],
  templateUrl: './loan-what-if.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanWhatIfComponent {
  readonly loan = input.required<Loan>();
  readonly payments = input<Transaction[]>([]);

  /** Blurs every monetary figure while privacy mode is on (TICKET-PRIV-01/PRIV-02), as `loan-payments-list` does. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  protected readonly presetAmounts = PRESET_AMOUNTS;
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly extraControl = new FormControl<number | null>(0, {
    validators: [Validators.min(0)],
  });

  private readonly extraValue = toSignal(this.extraControl.valueChanges, {
    initialValue: this.extraControl.value,
  });

  /**
   * What actually reaches the engine. A blank, non-numeric, or negative entry resolves to `0` — the
   * do-nothing scenario — so an in-progress edit shows the unchanged-schedule message rather than a
   * `NaN` payoff date or an `Infinity months earlier` delta.
   */
  private readonly extraMonthlyPayment = computed(() => {
    const value = this.extraValue();
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  });

  protected readonly projection = computed(() => {
    const loan = this.loan();
    return projectLoanWhatIf(
      loan,
      computeLoanProgress(loan, this.payments()),
      { extraMonthlyPayment: this.extraMonthlyPayment(), lumpSums: [] },
      this.today,
    );
  });

  protected readonly headline = computed(() => buildLoanWhatIfHeadline(this.projection()));

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildLoanWhatIfChartOption(this.projection()),
  );

  protected get extraError(): string {
    const control = this.extraControl;
    return control.touched && control.invalid ? 'Enter 0 or more.' : '';
  }

  protected applyPreset(amount: number): void {
    this.extraControl.setValue(amount);
  }
}
