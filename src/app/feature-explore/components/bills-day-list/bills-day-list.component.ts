import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PrivacyBlurComponent, TypographyComponent } from '@/shared/ui';
import type { BillListDay } from '../../bills-calendar-vm';

/**
 * The date-ordered rendering of the same expected payments the month grid draws (TICKET-REC-03) —
 * days with nothing expected are simply absent, which is the whole point of the view: scan top to
 * bottom for what is next, rather than reading a month's shape.
 *
 * Real list markup, so unlike the grid it is its own accessible representation and carries no
 * `sr-only` mirror.
 */
@Component({
  selector: 'app-bills-day-list',
  imports: [PrivacyBlurComponent, TypographyComponent],
  templateUrl: './bills-day-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillsDayListComponent {
  readonly days = input.required<readonly BillListDay[]>();
  /** Shown when the month holds nothing — already formatted, e.g. "July 2026". */
  readonly monthLabel = input.required<string>();
  readonly privacyMode = input(false);
}
