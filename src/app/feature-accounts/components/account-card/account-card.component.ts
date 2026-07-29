import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
  tablerChevronDown,
  tablerChevronUp,
  tablerDotsVertical,
  tablerPencil,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import {
  BadgeComponent,
  ButtonComponent,
  DropdownComponent,
  FlexComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { AccountCardVm } from '../../account-card-vm';
import { ACCOUNT_ICON_SET } from '../../account-icons';
import { AccountBalanceBlockComponent } from '../account-balance-block/account-balance-block.component';

/**
 * One account's card in the accounts overview grid (TICKET-ACC-05, CR4-1 §3 Options A+B) —
 * purely presentational: every display fact (balance, share, icon name, first/last position) is
 * already resolved on the `AccountCardVm` row the overview builds; this component only renders it
 * and re-emits the row actions upward.
 */
@Component({
  selector: 'app-account-card',
  imports: [
    RouterLink,
    NgIcon,
    AccountBalanceBlockComponent,
    BadgeComponent,
    ButtonComponent,
    DropdownComponent,
    FlexComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './account-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      ...ACCOUNT_ICON_SET,
      tablerChevronUp,
      tablerChevronDown,
      tablerDotsVertical,
      tablerPencil,
      tablerArchive,
      tablerArchiveOff,
      tablerTrash,
    }),
  ],
})
export class AccountCardComponent {
  readonly vm = input.required<AccountCardVm>();
  readonly dataReady = input(false);

  readonly edit = output<void>();
  readonly archive = output<void>();
  readonly delete = output<void>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
}
