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
      const mappingProfilesStore = inject(MappingProfilesStore);
      const importBatchesStore = inject(ImportBatchesStore);
      return appDb
        .open()
        .then(() =>
          Promise.all([
            transactionsStore.hydrate(),
            accountsStore.hydrate(),
            mappingProfilesStore.hydrate(),
            importBatchesStore.hydrate(),
          ]),
        );
    }),
  ],
};
