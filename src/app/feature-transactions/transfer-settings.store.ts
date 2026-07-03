import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
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

    return {
      hydrate: async (): Promise<void> => {
        patchState(store, await transferSettingsRepository.get());
      },

      update: async (changes: Partial<TransferSettings>): Promise<void> => {
        await transferSettingsRepository.update(changes);
        patchState(store, changes);
      },
    };
  }),
);
