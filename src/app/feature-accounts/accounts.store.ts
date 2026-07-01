import { Injectable, computed, inject, signal } from '@angular/core';
import { AccountsRepository, type Account } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly accountsRepository = inject(AccountsRepository);
  private readonly transactionsStore = inject(TransactionsStore);

  private readonly accountsSignal = signal<Account[]>([]);
  readonly accounts = this.accountsSignal.asReadonly();

  readonly activeAccounts = computed(() =>
    this.accountsSignal().filter((account) => !account.archived),
  );
  readonly archivedAccounts = computed(() =>
    this.accountsSignal().filter((account) => account.archived),
  );

  private readonly transactionTotalsByAccountId = computed(() => {
    const totals = new Map<number, number>();
    for (const transaction of this.transactionsStore.transactions()) {
      totals.set(
        transaction.accountId,
        (totals.get(transaction.accountId) ?? 0) + transaction.amount,
      );
    }
    return totals;
  });

  readonly balancesById = computed(() => {
    const totals = this.transactionTotalsByAccountId();
    return new Map(
      this.accountsSignal().map((account) => [
        account.id!,
        account.openingBalance + (totals.get(account.id!) ?? 0),
      ]),
    );
  });

  readonly netWorth = computed(() =>
    [...this.balancesById().values()].reduce((sum, balance) => sum + balance, 0),
  );

  readonly transactionCountById = computed(() => {
    const counts = new Map<number, number>();
    for (const transaction of this.transactionsStore.transactions()) {
      counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
    }
    return counts;
  });

  hydrate = async (): Promise<void> => {
    this.accountsSignal.set(await this.accountsRepository.getAll());
  };

  addAccount = async (account: Account): Promise<void> => {
    const id = await this.accountsRepository.add(account);
    this.accountsSignal.update((accounts) => [...accounts, { ...account, id }]);
  };

  updateAccount = async (id: number, changes: Partial<Account>): Promise<void> => {
    await this.accountsRepository.update(id, changes);
    this.accountsSignal.update((accounts) =>
      accounts.map((account) => (account.id === id ? { ...account, ...changes } : account)),
    );
  };

  archiveAccount = (id: number): Promise<void> => this.updateAccount(id, { archived: true });

  unarchiveAccount = (id: number): Promise<void> => this.updateAccount(id, { archived: false });

  removeAccount = async (id: number): Promise<void> => {
    await this.accountsRepository.remove(id);
    this.accountsSignal.update((accounts) => accounts.filter((account) => account.id !== id));
  };
}
