import { KeyValuePipe } from '@angular/common';
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
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  PageHeaderComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';
import { AccountsStore, ImportBatchesStore } from '@/core/state';
import { AccountBalanceBlockComponent } from '../account-balance-block/account-balance-block.component';
import { AccountBalanceChartComponent } from '../account-balance-chart/account-balance-chart.component';
import {
  AccountFormComponent,
  type AccountFormValue,
} from '../account-form/account-form.component';
import { lastImportStatus } from '../../last-import-status';

@Component({
  selector: 'app-accounts-detail',
  imports: [
    NgIcon,
    KeyValuePipe,
    SignedAmountPipe,
    AccountFormComponent,
    AccountBalanceBlockComponent,
    AccountBalanceChartComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    PageHeaderComponent,
    PaperComponent,
    TypographyComponent,
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
  /** For the "last import" line under the balance (TICKET-ACC-13); injecting it hydrates it. */
  private readonly importBatchesStore = inject(ImportBatchesStore);

  protected readonly account = computed(
    () => this.accountsStore.accounts().find((account) => String(account.id) === this.id()) ?? null,
  );

  protected readonly balance = computed(() => {
    const account = this.account();
    return account?.id != null
      ? (this.accountsStore.balancesById().get(account.id) ?? account.openingBalance)
      : 0;
  });

  /** My net-worth stake in this account (TICKET-STAT-46) — null for a non-joint account. */
  private readonly share = computed<number | null>(() => {
    const account = this.account();
    return account?.type === 'joint' && account.id != null
      ? (this.accountsStore.jointAccountStakeById().get(account.id) ?? null)
      : null;
  });

  /** Flag + non-nullable number split, same rationale as `AccountCardVm.hasShare`/`shareDisplay`. */
  protected readonly hasShare = computed(() => this.share() !== null);
  protected readonly shareDisplay = computed(() => this.share() ?? 0);

  /**
   * The same line the account cards carry (TICKET-ACC-13), from the same helper, so the two can
   * never word it differently. It sits with the balance rather than in `mm-page-header` — the
   * header takes no subtitle by design (TICKET-UI-22), and "how current is this" belongs next to
   * the number it qualifies anyway.
   *
   * `null` until the batches have loaded, for the reason on `AccountCardVm.lastImport`: an
   * un-hydrated store would otherwise render "Never imported" over a perfectly current account.
   */
  protected readonly lastImport = computed(() => {
    const account = this.account();
    if (!this.importBatchesStore.hydrated()) return null;

    return lastImportStatus(
      account?.id != null
        ? this.importBatchesStore.lastImportedAtByAccountId().get(account.id)
        : undefined,
      new Date().toISOString(),
    );
  });

  protected readonly archiveToggle = computed(() =>
    this.account()?.archived
      ? { label: 'Unarchive', icon: 'tablerArchiveOff' }
      : { label: 'Archive', icon: 'tablerArchive' },
  );

  protected readonly contributorBreakdown = computed(() => {
    const account = this.account();
    return account?.type === 'joint' && account.id != null
      ? (this.accountsStore.contributorBreakdownById().get(account.id) ?? null)
      : null;
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
