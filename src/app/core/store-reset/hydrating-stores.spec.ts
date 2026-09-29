import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { getState } from '@ngrx/signals';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  ForecastSettingsStore,
  GoalsStore,
  ImportBatchesStore,
  TransactionsStore,
  TransferSettingsStore,
  TransfersStore,
} from '@/core/state';
import { AdminUsersStore } from '@/feature-auth/admin-users.store';
import { CategoryModelService } from '@/feature-categories/category-model.service';
import { CategoryModelStore } from '@/feature-categories/category-model.store';
import { RulesStore } from '@/feature-categories/rules.store';
import { CategoryComparisonSettingsStore } from '@/feature-dashboard/category-comparison-settings.store';
import { DashboardLayoutSettingsStore } from '@/feature-dashboard/dashboard-layout-settings.store';
import { MappingProfilesStore } from '@/feature-import/mapping-profiles.store';
import { IncomeStore } from '@/feature-income/income.store';
import { LoansStore } from '@/feature-loans/loans.store';
import { RecurringSeriesStore } from '@/feature-recurring/recurring-series.store';

/**
 * Every hydrating store carries `loading` and `error`, and nobody can add one that does not
 * (TICKET-SRV-06).
 *
 * Two halves, because either alone has a hole. The **runtime** half instantiates each store and
 * reads its initial state, which is the only way to prove the keys are really declared —
 * `withState` fixes the shape once, and a key patched but never declared cannot be read back (the
 * `DEFAULT_APP_SETTINGS` gotcha), so a store could compose the feature and still be broken. The
 * **source** half checks the list below against the file tree, so a store added next year is a
 * failing test here rather than a page that shows a spinner forever.
 */
const APP_ROOT = join(process.cwd(), 'src', 'app');

const storeFilesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return storeFilesUnder(path);
    return entry.endsWith('.store.ts') ? [path] : [];
  });

/** The same marker `store-reset-registry.spec.ts` uses: a store that hydrates builds it here. */
const hydratingStoreFiles = (): string[] =>
  storeFilesUnder(APP_ROOT)
    .filter((path) => readFileSync(path, 'utf-8').includes('createHydration('))
    .map((path) => path.slice(APP_ROOT.length + 1).replaceAll('\\', '/'));

/** Every hydrating store, by the file it lives in, so the two halves can be compared. */
const HYDRATING_STORES = {
  'core/state/accounts.store.ts': AccountsStore,
  'core/state/app-settings.store.ts': AppSettingsStore,
  'core/state/categories.store.ts': CategoriesStore,
  'core/state/forecast-settings.store.ts': ForecastSettingsStore,
  'core/state/goals.store.ts': GoalsStore,
  'core/state/import-batches.store.ts': ImportBatchesStore,
  'core/state/transactions.store.ts': TransactionsStore,
  'core/state/transfer-settings.store.ts': TransferSettingsStore,
  'core/state/transfers.store.ts': TransfersStore,
  'feature-auth/admin-users.store.ts': AdminUsersStore,
  'feature-categories/category-model.store.ts': CategoryModelStore,
  'feature-categories/rules.store.ts': RulesStore,
  'feature-dashboard/category-comparison-settings.store.ts': CategoryComparisonSettingsStore,
  'feature-dashboard/dashboard-layout-settings.store.ts': DashboardLayoutSettingsStore,
  'feature-import/mapping-profiles.store.ts': MappingProfilesStore,
  'feature-income/income.store.ts': IncomeStore,
  'feature-loans/loans.store.ts': LoansStore,
  'feature-recurring/recurring-series.store.ts': RecurringSeriesStore,
};

describe('hydrating stores: loading and error are declared state, not patched-in extras', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideFakeApi(),
        // The one collaborator that cannot be constructed in jsdom: `CategoryModelService` opens a
        // Web Worker in a field initializer. Nothing here calls it — the store is injected to read
        // its state, not to run it.
        { provide: CategoryModelService, useValue: {} },
      ],
    });
  });

  it.each(Object.entries(HYDRATING_STORES))('%s declares both keys', (_path, store) => {
    const state = getState(TestBed.inject(store)) as Record<string, unknown>;

    // `in`, not a truthiness check: `false` and `null` are the initial values, and the bug this
    // guards against is the key being absent rather than its value being wrong.
    expect('loading' in state).toBe(true);
    expect('error' in state).toBe(true);
    expect(state['error']).toBeNull();
  });

  it('covers every hydrating store in the source tree, so a new one cannot be left out', () => {
    expect(hydratingStoreFiles().sort()).toEqual(Object.keys(HYDRATING_STORES).sort());
  });
});
