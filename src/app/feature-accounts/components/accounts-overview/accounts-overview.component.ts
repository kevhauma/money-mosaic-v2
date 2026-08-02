import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerPlus } from '@ng-icons/tabler-icons';
import type { Account } from '@/core/data-access';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  LabelComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  RangeGroupingSwitcherComponent,
  TypographyComponent,
} from '@/shared/ui';
import { createConfirmState } from '@/shared/utils';
import { ACCOUNT_ICON_SET, accountIconName } from '../../account-icons';
import { AccountsStore, pageRangeControl } from '@/core/state';
import type { AccountCardVm } from '../../account-card-vm';
import {
  AccountFormComponent,
  type AccountFormValue,
} from '../account-form/account-form.component';
import { AccountCardComponent } from '../account-card/account-card.component';
import { AccountBalanceHistoryChartComponent } from '../account-balance-history-chart/account-balance-history-chart.component';

@Component({
  selector: 'app-accounts-overview',
  imports: [
    AccountBalanceHistoryChartComponent,
    AccountCardComponent,
    AccountFormComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    LabelComponent,
    LoadingSkeletonComponent,
    NgIcon,
    PageHeaderComponent,
    RangeGroupingSwitcherComponent,
    TypographyComponent,
  ],
  templateUrl: './accounts-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ accountWallet: ACCOUNT_ICON_SET.accountWallet, tablerPlus })],
})
export class AccountsOverviewComponent {
  protected readonly accountsStore = inject(AccountsStore);

  /** This page's own date range and its switcher wiring (TICKET-UI-23) — no longer the shell's. */
  protected readonly range = pageRangeControl('accounts');

  // Filters the card list only, never the chart: `app-account-balance-history-chart` plots
  // `activeAccounts()` by design (TICKET-ACC-07), so an archived account has no band even with
  // this on. Worth stating now that the toggle sits next to the range that *does* drive the chart.
  protected readonly showArchived = signal(false);
  protected readonly visibleAccounts = computed(() =>
    this.showArchived() ? this.accountsStore.accounts() : this.accountsStore.activeAccounts(),
  );

  /** One row per visible account, joining balance/share/position/icon so the `@for` below never
   * calls a component method per row (TICKET-ACC-05). */
  protected readonly accountCards = computed<AccountCardVm[]>(() => {
    const accounts = this.visibleAccounts();
    const ordered = this.accountsStore.accounts();
    const balancesById = this.accountsStore.balancesById();
    const jointStakeById = this.accountsStore.jointAccountStakeById();
    const firstId = ordered[0]?.id;
    const lastId = ordered[ordered.length - 1]?.id;

    return accounts.map((account) => ({
      account,
      balance:
        account.id != null
          ? (balancesById.get(account.id) ?? account.openingBalance)
          : account.openingBalance,
      hasShare: account.type === 'joint' && account.id != null,
      shareDisplay:
        account.type === 'joint' && account.id != null ? (jointStakeById.get(account.id) ?? 0) : 0,
      isFirst: account.id === firstId,
      isLast: account.id === lastId,
      iconName: accountIconName(account.icon),
      ibanTail: account.iban ? account.iban.slice(-4) : null,
    }));
  });

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
}
