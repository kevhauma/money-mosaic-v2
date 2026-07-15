import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  DEFAULT_TRANSFER_SETTINGS,
  TransferSettingsRepository,
  type TransferSettings,
} from '@/core/data-access';

export const TransferSettingsStore = signalStore(
  { providedIn: 'root' },
  withState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS),
  withMethods((store) => {
    const transferSettingsRepository = inject(TransferSettingsRepository);
    let hydration: Promise<void> | null = null;

    /** Idempotent — triggered on first injection (`withHooks` below, TICKET-PERF-07). */
    const hydrate = (): Promise<void> => {
      if (!hydration) {
        hydration = transferSettingsRepository.get().then((settings) => {
          patchState(store, settings);
        });
      }
      return hydration;
    };

    return {
      hydrate,

      update: async (changes: Partial<TransferSettings>): Promise<void> => {
        await transferSettingsRepository.update(changes);
        patchState(store, changes);
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Fire-and-forget: kicks off hydration the moment anything first injects this store,
      // instead of at app bootstrap (TICKET-PERF-07). Idempotent, so flows that read
      // `matchWindowDays()`/`autoLinkMediumConfidence()` synchronously can still `await
      // store.hydrate()` as a guard.
      void store.hydrate();
    },
  }),
);
