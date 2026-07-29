import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerPencil, tablerUnlink } from '@ng-icons/tabler-icons';
import { BadgeComponent, ButtonComponent, FlexComponent, TypographyComponent } from '@/shared/ui';
import { LocaleDatePipe, SignedAmountPipe } from '@/shared/utils';
import type { TransactionRowVm } from '../../transaction-row-vm';
import {
  CategorySelectCellComponent,
  type CategorySelectOption,
} from '../category-select-cell/category-select-cell.component';

/**
 * One row of the transactions table (TICKET-TXN-09, CR4-1 §5 Option C) — purely presentational:
 * every display fact is already resolved on the `TransactionRowVm` the page builds, and the row
 * only re-emits its actions upward.
 *
 * `display: contents` on the host keeps the table's `tbody > tr > td` layout intact despite the
 * component element sitting between them (same reason as `app-account-balance-block`) — an
 * attribute selector on `tr` would avoid the wrapper, but the project's `component-selector` lint
 * rule requires the selector to *start* with the `app-` prefix.
 */
@Component({
  selector: 'app-transaction-row',
  imports: [
    NgIcon,
    LocaleDatePipe,
    SignedAmountPipe,
    BadgeComponent,
    ButtonComponent,
    CategorySelectCellComponent,
    FlexComponent,
    TypographyComponent,
  ],
  templateUrl: './transaction-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  viewProviders: [provideIcons({ tablerPencil, tablerUnlink })],
})
export class TransactionRowComponent {
  readonly row = input.required<TransactionRowVm>();
  readonly categoryOptions = input.required<readonly CategorySelectOption[]>();

  readonly selectionToggled = output<void>();
  /** `undefined` when the user picks "Uncategorised". */
  readonly categoryChanged = output<number | undefined>();
  readonly editRequested = output<void>();
  readonly unlinkRequested = output<number>();
}
