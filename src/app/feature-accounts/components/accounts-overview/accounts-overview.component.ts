import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
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
  PageHeaderComponent,
} from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';
import { ACCOUNT_ICON_SET, accountIconName } from '../../account-icons';
import { AccountsStore } from '../../accounts.store';
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

  protected readonly deleteConfirmOpen = signal(false);
  private readonly deleteTarget = signal<Account | null>(null);
  protected readonly deleteMessage = computed(() => {
    const target = this.deleteTarget();
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

  protected toggleArchive(account: Account): void {
    if (account.id == null) {
      return;
    }
    void (account.archived
      ? this.accountsStore.unarchiveAccount(account.id)
      : this.accountsStore.archiveAccount(account.id));
  }

  protected confirmDelete(account: Account): void {
    this.deleteTarget.set(account);
    this.deleteConfirmOpen.set(true);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteTarget();
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
