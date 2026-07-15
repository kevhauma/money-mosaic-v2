import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
  tablerChevronDown,
  tablerChevronUp,
  tablerDotsVertical,
  tablerPencil,
  tablerPlus,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import type { Account } from '@/core/data-access';
import {
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
} from '@/shared/ui';
import { createConfirmState, SignedAmountPipe } from '@/shared/utils';
import { ACCOUNT_ICON_SET, accountIconName } from '../../account-icons';
import { AccountsStore } from '@/core/state';
import {
  AccountFormComponent,
  type AccountFormValue,
} from '../account-form/account-form.component';
import { NetWorthHistoryChartComponent } from '../net-worth-history-chart/net-worth-history-chart.component';

@Component({
  selector: 'app-accounts-overview',
  imports: [
    RouterLink,
    NgIcon,
    AccountFormComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    NetWorthHistoryChartComponent,
    PageHeaderComponent,
    SignedAmountPipe,
  ],
  templateUrl: './accounts-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      ...ACCOUNT_ICON_SET,
      tablerPlus,
      tablerDotsVertical,
      tablerPencil,
      tablerArchive,
      tablerArchiveOff,
      tablerTrash,
      tablerChevronUp,
      tablerChevronDown,
    }),
  ],
})
export class AccountsOverviewComponent {
  protected readonly accountsStore = inject(AccountsStore);
  protected readonly accountIconName = accountIconName;

  protected readonly showArchived = signal(false);
  protected readonly visibleAccounts = computed(() =>
    this.showArchived() ? this.accountsStore.accounts() : this.accountsStore.activeAccounts(),
  );

  protected readonly formOpen = signal(false);
  protected readonly editingAccount = signal<Account | null>(null);

  protected readonly deleteConfirm = createConfirmState<Account>();
  protected readonly deleteMessage = computed(() => {
    const target = this.deleteConfirm.pending();
    if (!target) {
      return '';
    }
    const count = this.transactionCountFor(target);
    return count > 0
      ? `${target.name} has ${count} transaction${count === 1 ? '' : 's'}. Deleting it removes them too. This cannot be undone.`
      : 'This cannot be undone.';
  });

  protected openAddForm(): void {
    this.editingAccount.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(account: Account): void {
    this.editingAccount.set(account);
    this.formOpen.set(true);
  }

  protected async saveAccount(value: AccountFormValue): Promise<void> {
    const editing = this.editingAccount();
    if (editing?.id != null) {
      await this.accountsStore.updateAccount(editing.id, value);
    } else {
      await this.accountsStore.addAccount({ ...value, archived: false });
    }
  }

  protected moveAccount(account: Account, direction: 'up' | 'down'): void {
    if (account.id == null) {
      return;
    }
    void this.accountsStore.moveAccount(account.id, direction);
  }

  protected isFirst(account: Account): boolean {
    return this.accountsStore.accounts()[0]?.id === account.id;
  }

  protected isLast(account: Account): boolean {
    const ordered = this.accountsStore.accounts();
    return ordered[ordered.length - 1]?.id === account.id;
  }

  protected toggleArchive(account: Account): void {
    if (account.id == null) {
      return;
    }
    void (account.archived
      ? this.accountsStore.unarchiveAccount(account.id)
      : this.accountsStore.archiveAccount(account.id));
  }

  protected confirmDelete(account: Account): void {
    this.deleteConfirm.request(account);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteConfirm.confirm();
    if (target?.id != null) {
      void this.accountsStore.removeAccount(target.id);
    }
  }

  protected transactionCountFor(account: Account): number {
    return account.id != null
      ? (this.accountsStore.transactionCountById().get(account.id) ?? 0)
      : 0;
  }

  protected balanceFor(account: Account): number {
    return account.id != null
      ? (this.accountsStore.balancesById().get(account.id) ?? account.openingBalance)
      : account.openingBalance;
  }

  /** My net-worth stake in a joint account (TICKET-STAT-03) — null for a non-joint account. */
  protected shareFor(account: Account): number | null {
    return account.type === 'joint' && account.id != null
      ? (this.accountsStore.jointAccountStakeById().get(account.id) ?? null)
      : null;
  }
}
