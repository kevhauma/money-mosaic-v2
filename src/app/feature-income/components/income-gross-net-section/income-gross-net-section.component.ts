import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import {
  computeGrossNetGrowth,
  computeGrossNetRatio,
  type GrossNetGrowthPoint,
  type GrossNetRatioPoint,
} from '@/core/stats';
import { resolveGrossSeriesColor } from '@/shared/echarts';
import { PaperComponent, TypographyComponent } from '@/shared/ui';
import { formatCurrency, formatPercent } from '@/shared/utils';
import {
  buildGrossNetGrowthChartOption,
  buildTakeHomeChartOption,
  type GrossNetGrowthChartKind,
} from '../../gross-net-chart-options';
import { IncomeStore } from '../../income.store';
import {
  IncomeChartCellComponent,
  type ChartCellRow,
} from '../income-chart-cell/income-chart-cell.component';

/** Printed for a month with nothing to report — the user hasn't said, which is not the same as zero. */
const NOT_ENTERED = '—';

const currencyOrDash = (value: number | null): string =>
  value === null ? NOT_ENTERED : formatCurrency(value);

const percentOrDash = (value: number | null): string =>
  value === null ? NOT_ENTERED : formatPercent(value);

/**
 * The "Net vs gross" section (FR-INC-13, TICKET-INC-16): one card holding the four charts that
 * compare gross pay against what actually reached the account — their levels, the take-home rate
 * between them, and how far each has travelled from the first month both were known, absolutely and
 * as a percentage.
 *
 * The percentage cell is the one that answers the real question: the two lines together means raises
 * pass through intact, gross pulling away from net means the deduction rate is climbing — which
 * "net income is up" can never tell you.
 *
 * Every figure comes from `computeGrossNetRatio` (TICKET-INC-14's basis: annual lump-sum categories
 * excluded, the recorded `bonus` subtracted) and then `computeGrossNetGrowth`, so "gross" and "net"
 * mean exactly the same thing in all four cells and can't drift apart.
 *
 * Reads `IncomeStore.rawIncomeTrend()`, never the smoothed series: a gross wage is entered for a
 * specific month, so the comparison has to be against what actually landed that month.
 *
 * **Pinned to calendar months** — this page has no granularity picker at all (`INCOME_GRANULARITY`,
 * TICKET-INC-02), and `salaryMetadata` is keyed `YYYY-MM`, so the series it's joined against is
 * bucketed the same way by construction.
 *
 * **One empty state for the section, not four**: without a single gross figure none of the four
 * cells can say anything, so the refusal `IncomeGrossNetPanelComponent` used to make for its one
 * chart lives here instead of being repeated per cell.
 */
@Component({
  selector: 'app-income-gross-net-section',
  imports: [IncomeChartCellComponent, PaperComponent, TypographyComponent],
  templateUrl: './income-gross-net-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGrossNetSectionComponent {
  private readonly incomeStore = inject(IncomeStore);

  private readonly points = computed<GrossNetRatioPoint[]>(() =>
    computeGrossNetRatio(
      this.incomeStore.rawIncomeTrend(),
      this.incomeStore.salaryMetadataByMonth(),
      this.incomeStore.smoothedBonusCategoryIds(),
    ),
  );

  private readonly growth = computed<GrossNetGrowthPoint[]>(() =>
    computeGrossNetGrowth(this.points()),
  );

  /** Resolved once for the whole section, so all four cells draw gross in the same colour. */
  private readonly grossColor = computed(() =>
    resolveGrossSeriesColor(this.incomeStore.grossColor()),
  );

  /** Nothing to plot until at least one month has a gross wage — four empty boxes say less than one sentence. */
  protected readonly hasAnyGross = computed(() =>
    this.points().some((point) => point.gross !== null),
  );

  private growthOption(kind: GrossNetGrowthChartKind): EChartsCoreOption {
    return buildGrossNetGrowthChartOption(this.growth(), kind, this.grossColor());
  }

  protected readonly takeHomeOption = computed<EChartsCoreOption>(() =>
    buildTakeHomeChartOption(this.points(), this.grossColor()),
  );
  protected readonly absoluteOption = computed(() => this.growthOption('absolute'));
  protected readonly pctFromStartOption = computed(() => this.growthOption('pctFromStart'));
  protected readonly fromStartOption = computed(() => this.growthOption('fromStart'));

  /**
   * Mirrors the take-home chart's figures into DOM text, from the same signal it renders. The ratio
   * here is the **true, unclipped** one — the band's 100% ceiling is a drawing decision, not a fact.
   */
  protected readonly takeHomeRows = computed<ChartCellRow[]>(() =>
    this.points().map((point) => ({
      key: point.bucketKey,
      cells: [formatCurrency(point.net), currencyOrDash(point.gross), percentOrDash(point.ratio)],
    })),
  );

  protected readonly absoluteRows = computed<ChartCellRow[]>(() =>
    this.growth().map((point) => ({
      key: point.bucketKey,
      cells: [currencyOrDash(point.netValue), currencyOrDash(point.grossValue)],
    })),
  );

  protected readonly fromStartRows = computed<ChartCellRow[]>(() =>
    this.growth().map((point) => ({
      key: point.bucketKey,
      cells: [currencyOrDash(point.netFromStart), currencyOrDash(point.grossFromStart)],
    })),
  );

  protected readonly pctFromStartRows = computed<ChartCellRow[]>(() =>
    this.growth().map((point) => ({
      key: point.bucketKey,
      cells: [percentOrDash(point.netPctFromStart), percentOrDash(point.grossPctFromStart)],
    })),
  );
}
