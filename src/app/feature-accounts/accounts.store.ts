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
import { AccountDeletionService } from '@/core/accounts';
import { TransactionsStore, TransfersStore } from '@/feature-transactions';
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
      accountsById: computed(() => new Map(entities().map((account) => [account.id!, account]))),
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
    const accountDeletionService = inject(AccountDeletionService);
    const transactionsStore = inject(TransactionsStore);
    const transfersStore = inject(TransfersStore);

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

      /**
       * Cascades the delete: the account, its transactions, and any transfer links touching them are
       * removed in one atomic write (CR-1.1), then mirrored into the transactions/transfers stores so
       * no orphaned rows keep skewing stats or net worth.
       */
      removeAccount: async (id: number): Promise<void> => {
        const { removedTransactionIds, unlinkedTransferIds, clearedTransferTransactionIds } =
          await accountDeletionService.deleteAccount(id);

        patchState(store, removeEntity(id));
        transactionsStore.removeMany(removedTransactionIds);
        transactionsStore.patchMany(
          clearedTransferTransactionIds.map((txId) => ({
            id: txId,
            changes: { transferId: undefined },
          })),
        );
        transfersStore.removeLocal(unlinkedTransferIds);
      },

      /**
       * Wipes an account's transactions (and the transfer links touching them) in one atomic write
       * (CR-1.1) while keeping the account row and its settings/mapping profiles intact
       * (TICKET-ACC-01), then mirrors the changes into the transactions/transfers stores so
       * balancesById/netWorth/transactionCountById recompute immediately (FR-STAT-5).
       */
      clearTransactions: async (id: number): Promise<void> => {
        const { removedTransactionIds, unlinkedTransferIds, clearedTransferTransactionIds } =
          await accountDeletionService.clearTransactions(id);

        transactionsStore.removeMany(removedTransactionIds);
        transactionsStore.patchMany(
          clearedTransferTransactionIds.map((txId) => ({
            id: txId,
            changes: { transferId: undefined },
          })),
        );
        transfersStore.removeLocal(unlinkedTransferIds);
      },
    };
  }),
  withMethods((store) => ({
    archiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: true }),
    unarchiveAccount: (id: number): Promise<void> => store.updateAccount(id, { archived: false }),
  })),
);
