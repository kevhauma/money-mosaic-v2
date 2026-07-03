import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { AccountsRepository, type Account } from '@/core/data-access';
import { TransactionsStore } from '@/feature-transactions';
import { withArchivable } from '@/shared/utils';

const accountConfig = entityConfig({
  entity: type<Account>(),
  selectId: (account) => account.id!,
});

export const AccountsStore = signalStore(
  { providedIn: 'root' },
  withEntities(accountConfig),
  withArchivable<Account>(),
  withComputed(({ entities, activeEntities, archivedEntities }) => {
    const transactionsStore = inject(TransactionsStore);

    const transactionTotalsByAccountId = computed(() => {
      const totals = new Map<number, number>();
      for (const transaction of transactionsStore.transactions()) {
        totals.set(
          transaction.accountId,
          (totals.get(transaction.accountId) ?? 0) + transaction.amount,
        );
      }
      return totals;
    });

    const balancesById = computed(() => {
      const totals = transactionTotalsByAccountId();
      return new Map(
        entities().map((account) => [
          account.id!,
          account.openingBalance + (totals.get(account.id!) ?? 0),
        ]),
      );
    });

    return {
      accounts: entities,
      activeAccounts: activeEntities,
      archivedAccounts: archivedEntities,
      balancesById,
      netWorth: computed(() =>
        [...balancesById().values()].reduce((sum, balance) => sum + balance, 0),
      ),
      transactionCountById: computed(() => {
        const counts = new Map<number, number>();
        for (const transaction of transactionsStore.transactions()) {
          counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
        }
        return counts;
      }),
    };
  }),
  withMethods((store) => {
    const accountsRepository = inject(AccountsRepository);

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, setAllEntities(await accountsRepository.getAll(), accountConfig));
      },

      addAccount: async (account: Account): Promise<void> => {
        const id = await accountsRepository.add(account);
        const added: Account = { ...account, id };
        patchState(store, addEntity(added, accountConfig));
      },

      updateAccount: async (id: number, changes: Partial<Account>): Promise<void> => {
        await accountsRepository.update(id, changes);
        patchState(store, updateEntity({ id, changes }, accountConfig));
      },

      removeAccount: async (id: number): Promise<void> => {
        await accountsRepository.remove(id);
        patchState(store, removeEntity(id));
      },
    };
  }),
  withMethods((store) => ({
    archiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: true }),
    unarchiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: false }),
  })),
);
