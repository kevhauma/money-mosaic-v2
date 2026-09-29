import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  DEFAULT_TRANSFER_SETTINGS,
  TransferSettingsRepository,
  type TransferSettings,
} from '@/core/data-access';
import { createStoreReset, registerStoreReset, retryOnFailure } from '@/core/store-reset';

export const TransferSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS),
  withMethods((store) => {
    const transferSettingsRepository = inject(TransferSettingsRepository);
    let hydration: Promise<void> | null = null;
    /** Empties this store when the signed-in user changes (TICKET-AUTH-02). */
    const reset = createStoreReset(store, () => {
      hydration = null;
    });

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = retryOnFailure(
          transferSettingsRepository.get().then((settings) => {
            patchState(store, settings);
          }),
          () => {
            hydration = null;
          },
        );
      }
      return hydration;
    };

    return {
      reset,
      hydrate,

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
      void store.hydrate();
    },
  }),
);
