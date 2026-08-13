import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ProjectionAccessibleRow } from '../../projection-accessible-row';

/**
 * The projection chart's screen-reader companion table (TICKET-STAT-20) — every plotted month, its
 * balance, and the goal bought in it, with the comparison series' column in required-rate mode.
 *
 * Presentational, and `sr-only`: not a visible data table, so it skips `mm-table`'s overflow/border
 * chrome entirely. Its figures are **withheld** rather than blurred under privacy mode — the caller
 * does that — because `.sr-only` clips the table to a 1px box where a CSS filter paints nothing and
 * a screen reader would read the amount out regardless.
 */
@Component({
  selector: 'app-projection-figure-table',
  imports: [],
  templateUrl: './projection-figure-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionFigureTableComponent {
  readonly rows = input.required<ProjectionAccessibleRow[]>();
  /** Adds the "at the rate you actually save" column, which only exists in required-rate mode. */
  readonly showComparison = input(false);
}
