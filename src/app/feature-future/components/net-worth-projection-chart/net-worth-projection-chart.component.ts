import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChartLine } from '@ng-icons/tabler-icons';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AppSettingsStore, ForecastSettingsStore, GoalsStore } from '@/core/state';
import { EmptyStateComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { formatCurrency, formatMonthYear, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';
import { ForecastStore } from '../../forecast.store';
import {
  projectionAriaLabel,
  projectionCaption,
  projectionEmptyMessage,
} from '../../forecast-chart-copy';
import { buildNetWorthProjectionChartOption } from '../../net-worth-projection-chart-option';
import type { ProjectionAccessibleRow } from '../../projection-accessible-row';
import { ProjectionFigureTableComponent } from '../projection-figure-table/projection-figure-table.component';

/**
 * What the balance looks like as each goal gets bought (FR-FUT-5, TICKET-FUT-07), in whichever
 * direction the page is being read (TICKET-FUT-09) — drawn as a sawtooth rather than a line that
 * only ever rises.
 *
 * The step-downs are the whole point: "when can I afford it" and "what am I left with afterwards"
 * are two halves of one question, and a rising line answers the first while flattering the second.
 * In required-rate mode the line rises at what the plan *demands* and the measured rate is drawn
 * dashed beside it, so the gap between them is the content.
 *
 * Every simplification is inherited from FUT-05 and said out loud in the caption
 * (`forecast-chart-copy.ts`) rather than left for a smooth curve to imply.
 *
 * Uses FUT-03's route-level `provideEchartsCore` — no provider of its own.
 */
@Component({
  selector: 'app-net-worth-projection-chart',
  imports: [
    NgxEchartsDirective,
    NgIcon,
    EmptyStateComponent,
    PaperComponent,
    ProjectionFigureTableComponent,
    TypographyComponent,
  ],
  templateUrl: './net-worth-projection-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChartLine })],
})
export class NetWorthProjectionChartComponent {
  private readonly forecastStore = inject(ForecastStore);
  private readonly goalsStore = inject(GoalsStore);
  private readonly forecastSettingsStore = inject(ForecastSettingsStore);

  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;
  protected readonly isRequiredRateMode = this.forecastStore.isRequiredRateMode;

  private readonly mode = this.forecastSettingsStore.activeMode;
  private readonly goalCount = computed(() => this.goalsStore.activeGoals().length);

  /**
   * Required-rate mode needs no measured history — the rate it draws comes from the dates, and the
   * measured one is only the comparison — so it draws whenever there is a dated goal.
   */
  protected readonly hasChart = computed(() => {
    if (!this.forecastStore.dataReady() || this.goalCount() === 0) return false;
    return this.isRequiredRateMode()
      ? this.forecastStore.requiredPlan().planRequiredPerMonth != null
      : this.forecastStore.velocity().hasEnoughHistory;
  });

  protected readonly emptyMessage = computed(() =>
    projectionEmptyMessage(this.mode(), this.goalCount()),
  );

  protected readonly caption = computed(() =>
    projectionCaption(this.mode(), this.forecastStore.omittedGoalCount()),
  );

  protected readonly chartAriaLabel = computed(() => projectionAriaLabel[this.mode()]);

  protected readonly chartOption = computed(() =>
    buildNetWorthProjectionChartOption({
      points: this.forecastStore.projection(),
      comparisonPoints: this.forecastStore.comparisonProjection(),
      safetyNetAmount: this.forecastSettingsStore.safetyNetAmount(),
      privacyMode: this.privacyMode(),
    }),
  );

  /** Only meaningful in the measured-rate mode: there, a falling line needs saying out loud. */
  protected readonly decliningWarning = computed(() =>
    !this.isRequiredRateMode() && this.forecastStore.velocity().perMonth < 0
      ? 'This line falls because you spent more than you earned over the measured window.'
      : '',
  );

  /** The chart's figures for assistive tech — withheld, not blurred, under privacy mode. */
  protected readonly accessibleRows = computed<ProjectionAccessibleRow[]>(() => {
    const privacyMode = this.privacyMode();
    const comparison = this.forecastStore.comparisonProjection();
    const amountText = (amount: number): string =>
      privacyMode ? HIDDEN_AMOUNT_TEXT : formatCurrency(amount);

    return this.forecastStore.projection().map((point, index) => ({
      month: formatMonthYear(point.date),
      balance: amountText(point.balance),
      comparison: comparison?.[index] ? amountText(comparison[index].balance) : '',
      bought: point.purchases
        .map((purchase) =>
          privacyMode ? purchase.name : `${purchase.name} (${formatCurrency(purchase.amount)})`,
        )
        .join(', '),
    }));
  });
}
