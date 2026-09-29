import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent, TypographyComponent } from '@/shared/ui';
import type { AdminUserRow } from '../../admin-user-row';

/**
 * The five things an admin can do to one account, as that row's last cell (TICKET-AUTH-03).
 *
 * Its own component because the cell carries more than the rest of the table put together — five
 * controls, three of which are conditionally refused, plus the sentence explaining why — and the
 * page's template crossed the length at which TICKET-AUTH-04 split the Settings account section.
 * It owns no state and reaches no store: it renders one `AdminUserRow` and reports which button was
 * pressed, so every decision stays on the page (and every *rule* stays on the server).
 */
@Component({
  selector: 'app-admin-user-actions',
  imports: [ButtonComponent, TypographyComponent],
  templateUrl: './admin-user-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserActionsComponent {
  readonly row = input.required<AdminUserRow>();

  readonly rename = output<void>();
  readonly resetPassword = output<void>();
  readonly toggleRole = output<void>();
  readonly toggleDisabled = output<void>();
  readonly remove = output<void>();
}
