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
import {
  AccountsStore,
  CategoriesStore,
  TransactionsStore,
  TransferSettingsStore,
  TransfersStore,
} from './core/state';
import { RulesStore } from './feature-categories/rules.store';
import { CategoryModelStore } from './feature-categories/category-model.store';
import { MappingProfilesStore } from './feature-import/mapping-profiles.store';
import { ImportBatchesStore } from './feature-import/import-batches.store';
import { CategoryComparisonSettingsStore } from './feature-dashboard/category-comparison-settings.store';
import { DashboardLayoutSettingsStore } from './feature-dashboard/dashboard-layout-settings.store';
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
      const categoryComparisonSettingsStore = inject(CategoryComparisonSettingsStore);
      const dashboardLayoutSettingsStore = inject(DashboardLayoutSettingsStore);
      return appDb
        .open()
        .then(() => {
          // Transactions/transfers are the two tables that can grow large enough to block first
          // paint for a noticeable stretch (CR-3.4) — kick their hydration off here without
          // awaiting it. Each exposes `hydrated: Signal<boolean>` so data-heavy views gate on it
          // instead of assuming the old all-or-nothing barrier (TICKET-PERF-05).
          void transactionsStore.hydrate();
          void transfersStore.hydrate();
          // CategoryModelStore awaits categories/transactions/rules hydration internally (its own
          // `hydrate()`, TICKET-PERF-05), so it's safe to fire off here too without blocking
          // bootstrap on it.
          void categoryModelStore.hydrate();

          return Promise.all([
            accountsStore.hydrate(),
            transferSettingsStore.hydrate(),
            categoriesStore.hydrate(),
            rulesStore.hydrate(),
            mappingProfilesStore.hydrate(),
            importBatchesStore.hydrate(),
            categoryComparisonSettingsStore.hydrate(),
            dashboardLayoutSettingsStore.hydrate(),
          ]);
        })
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
