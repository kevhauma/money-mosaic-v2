import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerChevronDown,
  tablerChevronUp,
  tablerDotsVertical,
  tablerGripVertical,
  tablerPencil,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import {
  ButtonComponent,
  DropdownComponent,
  FlexComponent,
  PrivacyBlurComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { GoalRowVm } from '../../goal-row-vm';

/**
 * One row of the goals list (TICKET-FUT-04) — presentational, so it holds no store and decides
 * nothing: the panel above owns the order and the writes, and this renders the resolved
 * `GoalRowVm` and reports what was clicked.
 *
 * The move-up/move-down buttons are the **keyboard path to the funding order**; they are not a
 * duplicate of the drag handle but the reason the order is reachable at all without a pointer.
 */
@Component({
  selector: 'app-goal-row',
  imports: [
    // `cdkDragHandle` only — `cdkDrag` itself sits on this component's host element, applied by the
    // panel, so the handle inside this template still resolves its parent through the injector.
    DragDropModule,
    NgIcon,
    ButtonComponent,
    DropdownComponent,
    FlexComponent,
    PrivacyBlurComponent,
    TypographyComponent,
  ],
  templateUrl: './goal-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerChevronDown,
      tablerChevronUp,
      tablerDotsVertical,
      tablerGripVertical,
      tablerPencil,
      tablerTrash,
    }),
  ],
})
export class GoalRowComponent {
  readonly row = input.required<GoalRowVm>();
  readonly privacyMode = input(false);

  readonly move = output<'up' | 'down'>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
