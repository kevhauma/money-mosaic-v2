import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChartLine } from '@ng-icons/tabler-icons';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AppSettingsStore, ForecastSettingsStore, GoalsStore } from '@/core/state';
import { EmptyStateComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { formatCurrency, formatMonthYear, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';
import { ForecastStore } from '../../forecast.store';
import { buildNetWorthProjectionChartOption } from '../../net-worth-projection-chart-option';

/** One row of the chart's screen-reader companion table (TICKET-STAT-20). */
type ProjectionAccessibleRow = { month: string; balance: string; bought: string };

/**
 * What the balance looks like as each goal gets bought (FR-FUT-5, TICKET-FUT-07) — the projection
 * drawn as a sawtooth rather than a line that only ever rises.
 *
 * The step-downs are the whole point: "when can I afford it" and "what am I left with afterwards"
 * are two halves of one question, and a rising line answers the first while flattering the second.
 *
 * Every simplification in FUT-05 is inherited and said out loud in the caption rather than left for
 * a smooth curve to imply: straight line, no compounding, no inflation, no interest, no known
 * upcoming bills.
 *
 * Uses FUT-03's route-level `provideEchartsCore` — no provider of its own.
 */
@Component({
  selector: 'app-net-worth-projection-chart',
  imports: [NgxEchartsDirective, NgIcon, EmptyStateComponent, PaperComponent, TypographyComponent],
  templateUrl: './net-worth-projection-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChartLine })],
})
export class NetWorthProjectionChartComponent {
  private readonly forecastStore = inject(ForecastStore);
  private readonly goalsStore = inject(GoalsStore);
  private readonly forecastSettingsStore = inject(ForecastSettingsStore);

  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  /**
   * There is a forecast worth drawing only once the data is in, a goal exists, and the history
   * supports a rate. Otherwise the empty state says which of those is missing — the same copy the
   * goals section uses, rather than a flat line pretending to be a projection.
   */
  protected readonly hasChart = computed(
    () =>
      this.forecastStore.dataReady() &&
      this.goalsStore.activeGoals().length > 0 &&
      this.forecastStore.velocity().hasEnoughHistory,
  );

  protected readonly emptyMessage = computed(() =>
    this.goalsStore.activeGoals().length === 0
      ? 'Add a goal above and this chart shows what your balance looks like as each one gets bought.'
      : 'Not enough complete months of history yet to project a balance — import more history, or shorten the window.',
  );

  protected readonly chartOption = computed(() =>
    buildNetWorthProjectionChartOption({
      points: this.forecastStore.projection(),
      safetyNetAmount: this.forecastSettingsStore.safetyNetAmount(),
      privacyMode: this.privacyMode(),
    }),
  );

  /** The one sentence that stops a smooth line implying precision the data cannot support. */
  protected readonly caption = computed(() => {
    const omitted = this.forecastStore.omittedGoalCount();
    const base =
      'A straight line from today at your measured rate — no compounding, interest, inflation or upcoming bills.';
    if (omitted === 0) return base;

    const goalWord = omitted === 1 ? 'goal is' : 'goals are';
    return `${base} ${omitted} ${goalWord} not drawn: your rate never reaches ${omitted === 1 ? 'it' : 'them'}.`;
  });

  protected readonly decliningWarning = computed(() =>
    this.forecastStore.velocity().perMonth < 0
      ? 'This line falls because you spent more than you earned over the measured window.'
      : '',
  );

  /**
   * The chart's figures for assistive tech (TICKET-STAT-20). Privacy mode has to **withhold** here
   * rather than blur: `.sr-only` clips the table to a 1px box, so a CSS filter paints nothing and a
   * screen reader would read the amount out regardless.
   */
  protected readonly accessibleRows = computed<ProjectionAccessibleRow[]>(() => {
    const privacyMode = this.privacyMode();
    return this.forecastStore.projection().map((point) => ({
      month: formatMonthYear(point.date),
      balance: privacyMode ? HIDDEN_AMOUNT_TEXT : formatCurrency(point.balance),
      bought: point.purchases
        .map((purchase) =>
          privacyMode ? purchase.name : `${purchase.name} (${formatCurrency(purchase.amount)})`,
        )
        .join(', '),
    }));
  });
}
