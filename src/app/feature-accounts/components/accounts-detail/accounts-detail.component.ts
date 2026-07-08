import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerArchive,
  tablerArchiveOff,
  tablerEraser,
  tablerPencil,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  PageHeaderComponent,
} from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';
import { AccountsStore } from '../../accounts.store';
import { AccountBalanceChartComponent } from '../account-balance-chart/account-balance-chart.component';
import {
  AccountFormComponent,
  type AccountFormValue,
} from '../account-form/account-form.component';

@Component({
  selector: 'app-accounts-detail',
  imports: [
    NgIcon,
    TitleCasePipe,
    SignedAmountPipe,
    AccountFormComponent,
    AccountBalanceChartComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './accounts-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({ tablerPencil, tablerArchive, tablerArchiveOff, tablerEraser, tablerTrash }),
  ],
})
export class AccountsDetailComponent {
  readonly id = input.required<string>();

  private readonly router = inject(Router);
  protected readonly accountsStore = inject(AccountsStore);

  protected readonly account = computed(
    () => this.accountsStore.accounts().find((account) => String(account.id) === this.id()) ?? null,
  );

  protected readonly balance = computed(() => {
    const account = this.account();
    return account?.id != null
      ? (this.accountsStore.balancesById().get(account.id) ?? account.openingBalance)
      : 0;
  });

  protected readonly transactionCount = computed(() => {
    const account = this.account();
    return account?.id != null
      ? (this.accountsStore.transactionCountById().get(account.id) ?? 0)
      : 0;
  });

  protected readonly deleteMessage = computed(() => {
    const count = this.transactionCount();
    return count > 0
      ? `This account has ${count} transaction${count === 1 ? '' : 's'}. Deleting it removes them too. This cannot be undone.`
      : 'This cannot be undone.';
  });

  protected readonly clearMessage = computed(() => {
    const count = this.transactionCount();
    return `This removes all ${count} transaction${count === 1 ? '' : 's'} from this account but keeps the account and its settings. This cannot be undone.`;
  });

  protected readonly formOpen = signal(false);
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly clearConfirmOpen = signal(false);

  protected async saveAccount(value: AccountFormValue): Promise<void> {
    const account = this.account();
    if (account?.id != null) {
      await this.accountsStore.updateAccount(account.id, value);
    }
  }

  protected toggleArchive(): void {
    const account = this.account();
    if (account?.id == null) {
      return;
    }
    void (account.archived
      ? this.accountsStore.unarchiveAccount(account.id)
      : this.accountsStore.archiveAccount(account.id));
  }

  protected async deleteConfirmed(): Promise<void> {
    const account = this.account();
    if (account?.id == null) {
      return;
    }
    await this.accountsStore.removeAccount(account.id);
    await this.router.navigate(['/accounts']);
  }

  protected async clearConfirmed(): Promise<void> {
    const account = this.account();
    if (account?.id == null) {
      return;
    }
    // Stay on the detail view (not the accounts list) so the user lands on the now-clean account,
    // ready to re-import (TICKET-ACC-01).
    await this.accountsStore.clearTransactions(account.id);
  }
}
