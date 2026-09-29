import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  DEFAULT_TRANSFER_SETTINGS,
  TransferSettingsRepository,
  type TransferSettings,
} from '@/core/data-access';
import { createHydration, registerStoreReset, withHydrationState } from '@/core/store-reset';

export const TransferSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS),
  withHydrationState(),
  withMethods((store) => {
    const transferSettingsRepository = inject(TransferSettingsRepository);

    /**
     * `hydrate` is idempotent and triggered on first injection (`withHooks` below,
     * TICKET-PERF-07); `retry` re-reads after a failed load and `reset` empties the store when the
     * signed-in user changes (TICKET-SRV-06, TICKET-AUTH-02).
     */
    const { hydrate, retry, reset } = createHydration(store, () =>
      transferSettingsRepository.get().then((settings) => {
        patchState(store, settings);
      }),
    );

    return {
      reset,
      hydrate,
      retry,

      update: async (changes: Partial<TransferSettings>): Promise<void> => {
        await transferSettingsRepository.update(changes);
        patchState(store, changes);
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Registers this store for the sign-out wipe (TICKET-AUTH-02), before hydration starts.
      registerStoreReset('TransferSettingsStore', store.reset, store.hydrate);

      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `matchWindowDays()`/`autoLinkMediumConfidence()` synchronously can still `await
      // store.hydrate()` as a guard.
      // `.catch` because nothing awaits this: the failure is already on the store's `error` for the
      // page to render, and un-caught it would be an unhandled rejection too (TICKET-SRV-06).
      void store.hydrate().catch(() => undefined);
    },
  }),
);
