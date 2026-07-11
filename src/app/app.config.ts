import {
  ApplicationConfig,
  inject,
  Injector,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { appDb } from './core/data-access';
import { AccountsStore } from './feature-accounts/accounts.store';
import { TransactionsStore } from './feature-transactions/transactions.store';
import { TransfersStore } from './feature-transactions/transfers.store';
import { TransferSettingsStore } from './feature-transactions/transfer-settings.store';
import { CategoriesStore } from './feature-categories/categories.store';
import { RulesStore } from './feature-categories/rules.store';
import { CategoryModelStore } from './feature-categories/category-model.store';
import { MappingProfilesStore } from './feature-import/mapping-profiles.store';
import { ImportBatchesStore } from './feature-import/import-batches.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      // Captured before the async boundary — `inject()` only works synchronously here, but the
      // dev-seed step below runs after `await`, so it resolves its service off this injector.
      const injector = inject(Injector);
      const accountsStore = inject(AccountsStore);
      const transactionsStore = inject(TransactionsStore);
      const transfersStore = inject(TransfersStore);
      const transferSettingsStore = inject(TransferSettingsStore);
      const categoriesStore = inject(CategoriesStore);
      const rulesStore = inject(RulesStore);
      const categoryModelStore = inject(CategoryModelStore);
      const mappingProfilesStore = inject(MappingProfilesStore);
      const importBatchesStore = inject(ImportBatchesStore);
      return appDb
        .open()
        .then(() =>
          Promise.all([
            transactionsStore.hydrate(),
            transfersStore.hydrate(),
            transferSettingsStore.hydrate(),
            categoriesStore.hydrate(),
            rulesStore.hydrate(),
            accountsStore.hydrate(),
            mappingProfilesStore.hydrate(),
            importBatchesStore.hydrate(),
          ]),
        )
        .then(() => categoryModelStore.hydrate())
        .then(async () => {
          // Dev-only sample-data seed (TICKET-DEV-01). The dynamic import keeps the seed module and
          // its dataset in a separate chunk that a production build never references or loads, and
          // `isDevMode()` gates it out at runtime regardless.
          if (isDevMode()) {
            const { DevSeedService } = await import('./dev-seed/dev-seed.service');
            await injector.get(DevSeedService).seedIfEmpty();
          }
        });
    }),
  ],
};
