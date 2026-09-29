import { TestBed } from '@angular/core/testing';
import type { AccentColorId } from '@/core/theme';
import type { SavingBasis } from '@/core/stats';
import type { CurrencySymbolPosition } from '@/shared/utils';
import { AccountsRepository } from './accounts.repository';
import { withApiTesting } from './api-client.testing';
import { AppSettingsRepository } from './app-settings.repository';
import { CategoriesRepository } from './categories.repository';
import { CategoryComparisonSettingsRepository } from './category-comparison-settings.repository';
import { CategoryModelRepository } from './category-model.repository';
import { DashboardLayoutSettingsRepository } from './dashboard-layout-settings.repository';
import {
  DataManagementRepository,
  type AppDataExport,
  type ImportMode,
  type LocalMigrationReport,
  type LocalMigrationState,
} from './data-management.repository';
import type {
  Account,
  AppSettings,
  Category,
  CategoryComparisonSettings,
  CategoryModelArtifact,
  CategoryModelSettings,
  DashboardLayoutSettings,
  DashboardRowId,
  ForecastMode,
  ForecastSettings,
  ImportBatch,
  Loan,
  MappingProfile,
  RecentRange,
  RecurringOverride,
  Rule,
  SalaryMetadata,
  SavingsGoal,
  Transaction,
  Transfer,
  TransferSettings,
} from './entities';
import { ForecastSettingsRepository } from './forecast-settings.repository';
import { GoalsRepository } from './goals.repository';
import { ImportBatchesRepository } from './import-batches.repository';
import { LoansRepository } from './loans.repository';
import { MappingProfilesRepository } from './mapping-profiles.repository';
import { RecurringOverridesRepository } from './recurring-overrides.repository';
import { RulesRepository } from './rules.repository';
import { SalaryMetadataRepository } from './salary-metadata.repository';
import { TransactionsRepository } from './transactions.repository';
import { TransferSettingsRepository } from './transfer-settings.repository';
import { TransfersRepository } from './transfers.repository';

/**
 * The repository layer's public surface, pinned (TICKET-SRV-05).
 *
 * Seventeen repositories were reimplemented by hand over HTTP, and the promise that made that
 * survivable was that **not one caller changes**: the same method names, the same parameters, the
 * same return types, down to the `Promise<number>` Dexie's `update` answered with. That promise is
 * exactly the kind a hand port breaks quietly — a `Promise<void>` becomes a `Promise<number>` and a
 * caller's `if` starts always-truthing — so it is written down here rather than trusted.
 *
 * **The pins below are compile-time.** `Pinned<Repository, Expected>` is `never` unless the two are
 * *identical* (not merely assignable), so `const pins: Pins = [...]` in the first test does not
 * compile when a signature drifts — and `ng test` builds each spec through the Angular compiler, so
 * a type error there fails the run rather than being ignored. The runtime test underneath asserts
 * the same surface from the other side: the methods an instance actually has, and their arity.
 */

/** Exact type equality, not assignability — `(a: number) => void` is assignable to `() => void`. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** A class's public members as a plain object type: `keyof` already drops the private ones. */
type Surface<T> = { [K in keyof T]: T[K] };

type Pinned<Repository, Expected> =
  Equals<Surface<Repository>, Expected> extends true ? true : never;

type Pins = [
  Pinned<
    AccountsRepository,
    {
      getAll: () => Promise<Account[]>;
      add: (account: Account) => Promise<number>;
      update: (id: number, changes: Partial<Account>) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    CategoriesRepository,
    {
      getAll: () => Promise<Category[]>;
      add: (category: Category) => Promise<number>;
      update: (id: number, changes: Partial<Category>) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    RulesRepository,
    {
      getAll: () => Promise<Rule[]>;
      add: (rule: Rule) => Promise<number>;
      update: (id: number, changes: Partial<Rule>) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    LoansRepository,
    {
      getAll: () => Promise<Loan[]>;
      add: (loan: Loan) => Promise<number>;
      update: (id: number, changes: Partial<Loan>) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    MappingProfilesRepository,
    {
      getAll: () => Promise<MappingProfile[]>;
      add: (profile: MappingProfile) => Promise<number>;
      update: (id: number, changes: Partial<MappingProfile>) => Promise<number>;
    }
  >,
  Pinned<
    ImportBatchesRepository,
    {
      getAll: () => Promise<ImportBatch[]>;
      getById: (id: number) => Promise<ImportBatch | undefined>;
      add: (batch: ImportBatch) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    RecurringOverridesRepository,
    {
      getAll: () => Promise<RecurringOverride[]>;
      add: (override: RecurringOverride) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    TransfersRepository,
    {
      getAll: () => Promise<Transfer[]>;
      add: (transfer: Transfer) => Promise<number>;
    }
  >,
  Pinned<
    SalaryMetadataRepository,
    {
      getAll: () => Promise<SalaryMetadata[]>;
      upsert: (entry: SalaryMetadata) => Promise<number>;
      remove: (id: number) => Promise<void>;
    }
  >,
  Pinned<
    GoalsRepository,
    {
      getAll: () => Promise<SavingsGoal[]>;
      add: (goal: SavingsGoal) => Promise<number>;
      update: (id: number, changes: Partial<SavingsGoal>) => Promise<number>;
      remove: (id: number) => Promise<void>;
      bulkUpdateSortOrder: (updates: { id: number; sortOrder: number }[]) => Promise<void>;
    }
  >,
  Pinned<
    TransactionsRepository,
    {
      getAll: () => Promise<Transaction[]>;
      count: () => Promise<number>;
      getByAccount: (accountId: number) => Promise<Transaction[]>;
      update: (id: number, changes: Partial<Transaction>) => Promise<number>;
      bulkUpdate: (updates: { id: number; changes: Partial<Transaction> }[]) => Promise<number>;
      bulkAdd: (transactions: Transaction[]) => Promise<number[]>;
      getByImportBatch: (importBatchId: number) => Promise<Transaction[]>;
      getByReimbursementTransferId: (transferId: number) => Promise<Transaction[]>;
    }
  >,
  Pinned<
    CategoryModelRepository,
    {
      get: () => Promise<CategoryModelArtifact | undefined>;
      save: (artifact: CategoryModelArtifact) => Promise<1>;
      clear: () => Promise<void>;
      getSettings: () => Promise<CategoryModelSettings>;
      setTrainingWindowYears: (trainingWindowYears: number | null) => Promise<number>;
    }
  >,
];

type SettingsPins = [
  Pinned<
    TransferSettingsRepository,
    {
      get: () => Promise<TransferSettings>;
      update: (changes: Partial<TransferSettings>) => Promise<number>;
    }
  >,
  Pinned<
    CategoryComparisonSettingsRepository,
    {
      get: () => Promise<CategoryComparisonSettings>;
      setExcludedCategoryIds: (excludedCategoryIds: number[]) => Promise<number>;
    }
  >,
  Pinned<
    DashboardLayoutSettingsRepository,
    {
      get: () => Promise<DashboardLayoutSettings>;
      setRowOrder: (rowOrder: DashboardRowId[]) => Promise<number>;
      setHiddenRowIds: (hiddenRowIds: DashboardRowId[]) => Promise<number>;
    }
  >,
  Pinned<
    ForecastSettingsRepository,
    {
      get: () => Promise<ForecastSettings>;
      setLookbackMonths: (lookbackMonths: number) => Promise<number>;
      setBasis: (basis: SavingBasis) => Promise<number>;
      setSafetyNetAmount: (safetyNetAmount: number) => Promise<number>;
      setMode: (mode: ForecastMode) => Promise<number>;
      setScopeAccountIds: (scopeAccountIds: number[]) => Promise<number>;
    }
  >,
  Pinned<
    AppSettingsRepository,
    {
      get: () => Promise<AppSettings>;
      setPrimaryColor: (primaryColor: AccentColorId | undefined) => Promise<number>;
      setCurrencySymbol: (currencySymbol: string) => Promise<number>;
      setCurrencySymbolPosition: (
        currencySymbolPosition: CurrencySymbolPosition,
      ) => Promise<number>;
      setLocale: (locale: string) => Promise<number>;
      setExcludedIncomeCategoryIds: (excludedIncomeCategoryIds: number[]) => Promise<number>;
      setHeatmapExcludedCategoryIds: (heatmapExcludedCategoryIds: number[]) => Promise<number>;
      setCareerStartDate: (careerStartDate: string | undefined) => Promise<number>;
      setSmoothedBonusCategoryIds: (smoothedBonusCategoryIds: number[]) => Promise<number>;
      setGrossColor: (grossColor: AccentColorId | undefined) => Promise<number>;
      setMainIncomeCategoryId: (mainIncomeCategoryId: number | undefined) => Promise<number>;
      setPrivacyMode: (privacyMode: boolean) => Promise<number>;
      setFiscalYearStartMonth: (fiscalYearStartMonth: number) => Promise<number>;
      setRecentRanges: (recentRanges: RecentRange[]) => Promise<number>;
    }
  >,
  Pinned<
    DataManagementRepository,
    {
      exportAll: () => Promise<AppDataExport>;
      importAll: (data: AppDataExport, mode: ImportMode) => Promise<void>;
      deleteAll: () => Promise<void>;
      localMigrationState: () => Promise<LocalMigrationState>;
      migrateLocalDatabase: (
        data: AppDataExport,
        mode: ImportMode,
      ) => Promise<LocalMigrationReport>;
    }
  >,
];

/** Method name -> arity, as the instance actually carries them. */
type Arities = Record<string, number>;

const ARITIES: readonly [string, new () => object, Arities][] = [
  ['AccountsRepository', AccountsRepository, { getAll: 0, add: 1, update: 2, remove: 1 }],
  ['CategoriesRepository', CategoriesRepository, { getAll: 0, add: 1, update: 2, remove: 1 }],
  ['RulesRepository', RulesRepository, { getAll: 0, add: 1, update: 2, remove: 1 }],
  ['LoansRepository', LoansRepository, { getAll: 0, add: 1, update: 2, remove: 1 }],
  ['MappingProfilesRepository', MappingProfilesRepository, { getAll: 0, add: 1, update: 2 }],
  [
    'ImportBatchesRepository',
    ImportBatchesRepository,
    { getAll: 0, getById: 1, add: 1, remove: 1 },
  ],
  ['RecurringOverridesRepository', RecurringOverridesRepository, { getAll: 0, add: 1, remove: 1 }],
  ['TransfersRepository', TransfersRepository, { getAll: 0, add: 1 }],
  ['SalaryMetadataRepository', SalaryMetadataRepository, { getAll: 0, upsert: 1, remove: 1 }],
  [
    'GoalsRepository',
    GoalsRepository,
    { getAll: 0, add: 1, update: 2, remove: 1, bulkUpdateSortOrder: 1 },
  ],
  [
    'TransactionsRepository',
    TransactionsRepository,
    {
      getAll: 0,
      count: 0,
      getByAccount: 1,
      update: 2,
      bulkUpdate: 1,
      bulkAdd: 1,
      getByImportBatch: 1,
      getByReimbursementTransferId: 1,
    },
  ],
  [
    'CategoryModelRepository',
    CategoryModelRepository,
    { get: 0, save: 1, clear: 0, getSettings: 0, setTrainingWindowYears: 1 },
  ],
  ['TransferSettingsRepository', TransferSettingsRepository, { get: 0, update: 1 }],
  [
    'CategoryComparisonSettingsRepository',
    CategoryComparisonSettingsRepository,
    { get: 0, setExcludedCategoryIds: 1 },
  ],
  [
    'DashboardLayoutSettingsRepository',
    DashboardLayoutSettingsRepository,
    { get: 0, setRowOrder: 1, setHiddenRowIds: 1 },
  ],
  [
    'ForecastSettingsRepository',
    ForecastSettingsRepository,
    {
      get: 0,
      setLookbackMonths: 1,
      setBasis: 1,
      setSafetyNetAmount: 1,
      setMode: 1,
      setScopeAccountIds: 1,
    },
  ],
  [
    'AppSettingsRepository',
    AppSettingsRepository,
    {
      get: 0,
      setPrimaryColor: 1,
      setCurrencySymbol: 1,
      setCurrencySymbolPosition: 1,
      setLocale: 1,
      setExcludedIncomeCategoryIds: 1,
      setHeatmapExcludedCategoryIds: 1,
      setCareerStartDate: 1,
      setSmoothedBonusCategoryIds: 1,
      setGrossColor: 1,
      setMainIncomeCategoryId: 1,
      setPrivacyMode: 1,
      setFiscalYearStartMonth: 1,
      setRecentRanges: 1,
    },
  ],
  [
    'DataManagementRepository',
    DataManagementRepository,
    {
      exportAll: 0,
      importAll: 2,
      deleteAll: 0,
      localMigrationState: 0,
      migrateLocalDatabase: 2,
    },
  ],
];

const methodsOf = (repository: object): Arities =>
  Object.fromEntries(
    Object.entries(repository)
      .filter(([, member]) => typeof member === 'function')
      .map(([name, member]) => [name, (member as (...args: never[]) => unknown).length]),
  );

describe('the repository layer keeps the surface every caller was written against', () => {
  withApiTesting();

  it('has the same method names, parameters and return types it had against Dexie', () => {
    // The assertion is the two types above: neither tuple compiles unless each repository's public
    // surface is *identical* to the one pinned for it. This line is what makes that a spec.
    const pins: Pins = [true, true, true, true, true, true, true, true, true, true, true, true];
    const settingsPins: SettingsPins = [true, true, true, true, true, true];

    expect([...pins, ...settingsPins]).toHaveLength(ARITIES.length);
  });

  it.each(ARITIES)('%s', (_name, repository, expected) => {
    expect(methodsOf(TestBed.inject(repository))).toEqual(expected);
  });
});
