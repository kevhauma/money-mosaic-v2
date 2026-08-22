import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Loan, Transaction } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import {
  computeLoanProgress,
  projectLoanWhatIf,
  type EarlyRepaymentFeeModel,
  type WhatIfLumpSum,
  type WhatIfProjection,
} from '@/core/loans';
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
  SelectComponent,
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

type FeeKind = EarlyRepaymentFeeModel['kind'];

const FEE_KIND_OPTIONS: { value: FeeKind; label: string }[] = [
  { value: 'monthsOfInterest', label: "Months' interest on the amount" },
  { value: 'percentOfAmount', label: '% of the amount' },
  { value: 'none', label: 'No fee' },
];

/**
 * What each model's number field means, and what it starts at. Three months is the common European
 * mortgage cap (the Belgian *wederbeleggingsvergoeding*); 1% is the usual consumer/auto figure.
 * Both are **defaults, not truths** — the user's own contract is the only authority, which is why
 * both the model and its number stay editable and the hint says so.
 */
const FEE_KIND_DEFAULTS: Record<FeeKind, { value: number | null; legend: string }> = {
  monthsOfInterest: { value: 3, legend: 'Months of interest' },
  percentOfAmount: { value: 1, legend: 'Percent of the amount' },
  none: { value: null, legend: '' },
};

/** One lump-sum row: how much, and the month it lands in. */
type LumpSumRow = FormGroup<{
  amount: FormControl<number | null>;
  month: FormControl<string>;
}>;

/** A month a lump sum can be dated to — what `<input type="month">` produces. */
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

const newLumpSumRow = (): LumpSumRow =>
  new FormGroup({
    amount: new FormControl<number | null>(null, { validators: [Validators.min(0.01)] }),
    month: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(MONTH_PATTERN)],
    }),
  });

/**
 * The Loan detail page's What-if tab (TICKET-LOAN-13/14, FR-LOAN-13/14): an extra amount per month
 * and any number of one-off lump sums, answered by LOAN-12's `projectLoanWhatIf` with a payoff date,
 * how much sooner that is, and what it saves — **net of the early-repayment fee** a lender would
 * charge on each lump sum, since a gross figure is most misleading exactly where the lump sum is
 * biggest.
 *
 * **Nothing here is persisted** (LOAN-13's Notes): a what-if is a question the user asks, not a
 * fact about the loan. Saving it would make every other surface — the overview cards, the
 * ahead/behind badge, all of which report *real* progress — disagree with a scenario the app had
 * started to believe. So the scenario and the fee model live in this component's own controls and
 * die with it, and there is no store write or Dexie touch anywhere in this component.
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
    SelectComponent,
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
  protected readonly feeKindOptions = FEE_KIND_OPTIONS;
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly extraControl = new FormControl<number | null>(0, {
    validators: [Validators.min(0)],
  });

  protected readonly lumpSumRows = new FormArray<LumpSumRow>([]);

  protected readonly feeKindControl = new FormControl<FeeKind>('monthsOfInterest', {
    nonNullable: true,
  });
  protected readonly feeValueControl = new FormControl<number | null>(
    FEE_KIND_DEFAULTS.monthsOfInterest.value,
    { validators: [Validators.min(0)] },
  );

  private readonly extraValue = toSignal(this.extraControl.valueChanges, {
    initialValue: this.extraControl.value,
  });
  private readonly lumpSumValue = toSignal(this.lumpSumRows.valueChanges, { initialValue: null });
  private readonly feeKind = toSignal(this.feeKindControl.valueChanges, {
    initialValue: this.feeKindControl.value,
  });
  private readonly feeValue = toSignal(this.feeValueControl.valueChanges, {
    initialValue: this.feeValueControl.value,
  });

  constructor() {
    // Switching model re-seeds its number, so picking "% of the amount" doesn't silently inherit
    // the 3 that meant *months* — the `account-form.component.ts` takeUntilDestroyed precedent.
    this.feeKindControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => {
      this.feeValueControl.setValue(FEE_KIND_DEFAULTS[kind].value);
    });
  }

  protected readonly feeValueLegend = computed(() => FEE_KIND_DEFAULTS[this.feeKind()].legend);
  protected readonly feeTakesValue = computed(() => this.feeKind() !== 'none');

  /**
   * What actually reaches the engine. A blank, non-numeric, or negative entry resolves to `0` — the
   * do-nothing scenario — so an in-progress edit shows the unchanged-schedule message rather than a
   * `NaN` payoff date or an `Infinity months earlier` delta.
   */
  private readonly extraMonthlyPayment = computed(() => {
    const value = this.extraValue();
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  });

  /**
   * Only rows that are actually answerable: a positive amount and a parseable `yyyy-mm`. A half-typed
   * row is skipped rather than defaulted, so the figures never quietly price a month the user hasn't
   * chosen yet. The engine dates each to the 1st, which is immaterial — it matches lump sums to a
   * projected month by `yyyy-mm` (LOAN-12).
   */
  private readonly lumpSums = computed<WhatIfLumpSum[]>(() => {
    this.lumpSumValue();
    return this.lumpSumRows.controls
      .map((row) => row.getRawValue())
      .filter(
        (row): row is { amount: number; month: string } =>
          typeof row.amount === 'number' &&
          Number.isFinite(row.amount) &&
          row.amount > 0 &&
          MONTH_PATTERN.test(row.month),
      )
      .map((row) => ({ date: `${row.month}-01`, amount: row.amount }));
  });

  /** The chosen penalty model. An unusable number falls back to that model's own default rather than to no fee, which would understate the cost. */
  private readonly feeModel = computed<EarlyRepaymentFeeModel>(() => {
    const kind = this.feeKind();
    if (kind === 'none') {
      return { kind: 'none' };
    }
    const typed = this.feeValue();
    const fallback = FEE_KIND_DEFAULTS[kind].value ?? 0;
    const value =
      typeof typed === 'number' && Number.isFinite(typed) && typed >= 0 ? typed : fallback;
    return kind === 'monthsOfInterest' ? { kind, months: value } : { kind, percent: value };
  });

  protected readonly projection = computed(() => {
    const loan = this.loan();
    return projectLoanWhatIf(
      loan,
      computeLoanProgress(loan, this.payments()),
      { extraMonthlyPayment: this.extraMonthlyPayment(), lumpSums: this.lumpSums() },
      this.today,
      this.feeModel(),
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

  protected addLumpSum(): void {
    this.lumpSumRows.push(newLumpSumRow());
  }

  protected removeLumpSum(index: number): void {
    this.lumpSumRows.removeAt(index);
  }
}
