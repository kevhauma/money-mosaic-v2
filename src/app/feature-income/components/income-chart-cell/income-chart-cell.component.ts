import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { TypographyComponent } from '@/shared/ui';

/** One row of a chart's screen-reader companion table: a row header plus its cells, in column order. */
export type ChartCellRow = {
  /** Doubles as the `@for` track key and the row's `<th scope="row">`. */
  key: string;
  cells: string[];
};

/**
 * One cell of the "Net vs gross" grid (TICKET-INC-16): a sub-heading, a chart, and the `sr-only`
 * companion table that mirrors it (TICKET-UI-07's shape). Presentational and stateless in the
 * `income-category-checklist` mould — the caller owns the option and the rows, so all four cells
 * share one piece of chrome instead of repeating it four times with four chances to drift.
 *
 * No `mm-paper` of its own: the section is the card, and a card per cell would be the card-in-a-card
 * the ticket exists to remove.
 */
@Component({
  selector: 'app-income-chart-cell',
  imports: [NgxEchartsDirective, TypographyComponent],
  templateUrl: './income-chart-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeChartCellComponent {
  readonly heading = input.required<string>();
  readonly option = input.required<EChartsCoreOption>();
  /** What the chart shows, for assistive tech; the companion table follows it in the DOM. */
  readonly ariaLabel = input.required<string>();
  /** The companion table's `<caption>` — what the numbers under the chart actually are. */
  readonly caption = input.required<string>();
  readonly columnHeaders = input.required<string[]>();
  readonly rows = input.required<ChartCellRow[]>();
}
