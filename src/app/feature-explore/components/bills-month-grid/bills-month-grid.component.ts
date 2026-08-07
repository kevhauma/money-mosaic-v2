import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PrivacyBlurComponent, TypographyComponent } from '@/shared/ui';
import type { BillAccessibleRow, CalendarDayCell } from '../../bills-calendar-vm';

/**
 * The month-grid rendering of a set of expected payments (TICKET-REC-03) — purely presentational:
 * every cell arrives resolved, so this owns layout and nothing else, and the shell can swap it for
 * the list view without either knowing about the other.
 *
 * The grid itself is `aria-hidden`: it is a *layout* of days, not a data table, so a screen reader
 * gets the accompanying `sr-only` table (the TICKET-STAT-20 convention) instead of hearing every
 * payment twice — once from a grid it cannot navigate, once from the table. That also keeps the
 * table's privacy-mode withholding meaningful, which reading the visible cells aloud would undo.
 */
@Component({
  selector: 'app-bills-month-grid',
  imports: [PrivacyBlurComponent, TypographyComponent],
  templateUrl: './bills-month-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillsMonthGridComponent {
  readonly weekdayLabels = input.required<readonly string[]>();
  readonly dayCells = input.required<readonly CalendarDayCell[]>();
  readonly accessibleRows = input.required<readonly BillAccessibleRow[]>();
  /** Names the `sr-only` table, so it is obvious which month is being read out. */
  readonly monthLabel = input.required<string>();
  readonly privacyMode = input(false);
}
