import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { appDb } from './core/data-access';
import { AccountsStore } from './feature-accounts/accounts.store';
import { TransactionsStore } from './feature-transactions/transactions.store';
import { TransfersStore } from './feature-transactions/transfers.store';
import { CategoriesStore } from './feature-categories/categories.store';
import { RulesStore } from './feature-categories/rules.store';
import { MappingProfilesStore } from './feature-import/mapping-profiles.store';
import { ImportBatchesStore } from './feature-import/import-batches.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      const accountsStore = inject(AccountsStore);
      const transactionsStore = inject(TransactionsStore);
      const transfersStore = inject(TransfersStore);
      const categoriesStore = inject(CategoriesStore);
      const rulesStore = inject(RulesStore);
      const mappingProfilesStore = inject(MappingProfilesStore);
      const importBatchesStore = inject(ImportBatchesStore);
      return appDb
        .open()
        .then(() =>
          Promise.all([
            transactionsStore.hydrate(),
            transfersStore.hydrate(),
            categoriesStore.hydrate(),
            rulesStore.hydrate(),
            accountsStore.hydrate(),
            mappingProfilesStore.hydrate(),
            importBatchesStore.hydrate(),
          ]),
        );
    }),
  ],
};
