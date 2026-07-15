import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntities,
  addEntity,
  entityConfig,
  removeEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { TransfersRepository, type Transaction, type Transfer } from '@/core/data-access';
import { TransferLinkingService, TransferMatchingService } from '@/core/transfers';
import { TransactionsStore } from './transactions.store';
import { TransferSettingsStore } from './transfer-settings.store';

const transferConfig = entityConfig({
  entity: type<Transfer>(),
  selectId: (transfer) => transfer.id!,
});

export const TransfersStore = signalStore(
  { providedIn: 'root' },
  withEntities(transferConfig),
  withComputed(({ entities }) => ({
    transfers: entities,
    transferByTransactionId: computed(() => {
      const map = new Map<number, Transfer>();
      for (const transfer of entities()) {
        map.set(transfer.fromTransactionId, transfer);
        map.set(transfer.toTransactionId, transfer);
      }
      return map;
    }),
    /** Keyed by the transfer's own id, for resolving a `attributionOverride.reimbursementTransferId` (TICKET-TXN-03). */
    transfersById: computed(() => new Map(entities().map((transfer) => [transfer.id!, transfer]))),
  })),
  withState({ hydrated: false }),
  withMethods((store) => {
    const transfersRepository = inject(TransfersRepository);
    const transferLinkingService = inject(TransferLinkingService);
    const transactionsStore = inject(TransactionsStore);
    let hydration: Promise<void> | null = null;

    return {
      /** Idempotent; `force: true` re-fetches (used by the dev seed after writing new transfers). */
      hydrate: (options?: { force?: boolean }): Promise<void> => {
        if (!hydration || options?.force) {
          hydration = transfersRepository.getAll().then((transfers) => {
            patchState(store, setAllEntities(transfers, transferConfig), { hydrated: true });
          });
        }
        return hydration;
      },

      link: async (fromTransaction: Transaction, toTransaction: Transaction): Promise<void> => {
        const { transfer, updatedTransactions } = await transferLinkingService.linkManually(
          fromTransaction,
          toTransaction,
        );
        patchState(store, addEntity(transfer, transferConfig));
        transactionsStore.patchMany(
          updatedTransactions.map((transaction) => ({
            id: transaction.id!,
            changes: {
              transferId: transaction.transferId,
              categoryId: transaction.categoryId,
              categoryManual: transaction.categoryManual,
            },
          })),
        );
      },

      unlink: async (transferId: number): Promise<void> => {
        const transfer = store.transfers().find((candidate) => candidate.id === transferId);
        if (!transfer) return;

        const { clearedAttributionOverrides } = await transferLinkingService.unlink(transfer);

        patchState(store, removeEntity(transferId));
        transactionsStore.patchMany([
          { id: transfer.fromTransactionId, changes: { transferId: undefined } },
          { id: transfer.toTransactionId, changes: { transferId: undefined } },
          ...clearedAttributionOverrides.map(({ id, attributionOverride }) => ({
            id,
            changes: { attributionOverride },
          })),
        ]);
      },

      /** Reflects transfer deletions already persisted elsewhere (e.g. undoing an import that severed a cross-import link). */
      removeLocal: (transferIds: number[]): void => {
        patchState(store, removeEntities(transferIds));
      },
    };
  }),
  withMethods((store) => {
    const transferMatchingService = inject(TransferMatchingService);
    const transferSettingsStore = inject(TransferSettingsStore);
    const transactionsStore = inject(TransactionsStore);

    return {
      /**
       * Re-runs auto-matching across the whole dataset — called after every import and on demand
       * (FR-TRF-2). Awaits `TransactionsStore`'s own hydration first (idempotent, resolves
       * immediately once hydrated) — `patchMany` below is a silent no-op for ids not yet in the
       * entity map, so this guard keeps the mirror update correct even if `runAutoLink` fires
       * before the bootstrap-kicked-off (non-blocking) transactions hydrate has resolved
       * (TICKET-PERF-05).
       */
      runAutoLink: async (): Promise<number> => {
        await transactionsStore.hydrate();
        const linked = await transferMatchingService.runAndPersist(
          transferSettingsStore.matchWindowDays(),
          transferSettingsStore.autoLinkMediumConfidence(),
        );
        patchState(store, addEntities(linked, transferConfig));
        // Linking always clears the category (TICKET-TRF-01), so this mirror holds unconditionally.
        transactionsStore.patchMany(
          linked.flatMap((transfer) => [
            {
              id: transfer.fromTransactionId,
              changes: {
                transferId: transfer.id,
                categoryId: undefined,
                categoryManual: undefined,
              },
            },
            {
              id: transfer.toTransactionId,
              changes: {
                transferId: transfer.id,
                categoryId: undefined,
                categoryManual: undefined,
              },
            },
          ]),
        );
        return linked.length;
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `transfers()` synchronously can still `await store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
