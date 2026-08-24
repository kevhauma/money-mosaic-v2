import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerArrowsExchange, tablerPencil, tablerUnlink } from '@ng-icons/tabler-icons';
import {
  BadgeComponent,
  ButtonComponent,
  FlexComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { LocaleDatePipe, SignedAmountPipe } from '@/shared/utils';
import type { CategorySelectOption } from '../../category-picker';
import type { TransactionRowVm } from '../../transaction-row-vm';
import { CategorySelectCellComponent } from '../category-select-cell/category-select-cell.component';

/**
 * One transaction as a card, for viewports too narrow to read the table (TICKET-TXN-12). Same
 * `TransactionRowVm` and same four outputs as `app-transaction-row`, so the page swaps one for the
 * other without re-wiring anything and no field can be dropped from one presentation only —
 * `transaction-card.component.spec.ts` asserts the two render the same facts.
 *
 * The date and amount lead, side by side, because the amount is the column the review found people
 * scrolling sideways for; description and account follow underneath, and the two things you can
 * *do* to a row — set its category, edit or unlink it — sit on the last line where a thumb reaches
 * them. Every one of those targets is at least 44px (`min-h-11`/`min-w-11`), which is what the card
 * exists for: the table's 20px checkbox and 24px icon buttons are fine under a mouse and not under
 * a thumb. The visual controls stay their normal size — it is the hit area that grows.
 */
@Component({
  selector: 'app-transaction-card',
  imports: [
    NgIcon,
    LocaleDatePipe,
    SignedAmountPipe,
    BadgeComponent,
    ButtonComponent,
    CategorySelectCellComponent,
    FlexComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './transaction-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `display: contents` for the same reason `app-transaction-row` uses it: the component element
  // sits between the page's `<ul>` and this card's `<li>`, and would otherwise break the list
  // relationship a screen reader reads ("item 3 of 50").
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  viewProviders: [provideIcons({ tablerArrowsExchange, tablerPencil, tablerUnlink })],
})
export class TransactionCardComponent {
  readonly row = input.required<TransactionRowVm>();
  readonly categoryOptions = input.required<readonly CategorySelectOption[]>();

  readonly selectionToggled = output<void>();
  /** `undefined` when the user picks "Uncategorised". */
  readonly categoryChanged = output<number | undefined>();
  readonly editRequested = output<void>();
  readonly unlinkRequested = output<number>();
}
