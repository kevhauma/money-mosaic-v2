import Dexie, { type Table } from 'dexie';
// Deep import (not the barrel) keeps this framework-agnostic Dexie module free of the Angular/ngrx
// code the shared/utils barrel also re-exports.
import { computeFingerprint } from '@/shared/utils/fingerprint';
import type {
  Account,
  AppSettings,
  Category,
  CategoryComparisonSettings,
  CategoryModelArtifact,
  CategoryModelSettings,
  CsvEncoding,
  DashboardLayoutSettings,
  DateFormat,
  ForecastSettings,
  ImportBatch,
  Loan,
  MappingProfile,
  RecurringOverride,
  Rule,
  SalaryMetadata,
  SavingsGoal,
  SignConvention,
  Transaction,
  Transfer,
  TransferSettings,
} from './entities';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_MAPPING_PROFILE_TEMPLATES,
  DEFAULT_TRANSFER_SETTINGS,
  PARTNER_CONTRIBUTION_CATEGORY_NAME,
} from './seed-data';

// The entity shapes and the first-run seed data moved to the repo-root `shared/` workspace
// (TICKET-SRV-02) so the backend can read the same definitions without either workspace importing
// the other. They are re-exported here, unchanged, so every existing `from './app-db'` and
// `from '@/core/data-access'` import keeps resolving exactly as it did.
export * from './entities';
export * from './seed-data';
// `DEFAULT_APP_SETTINGS` and the other four singleton fallbacks moved to `shared/seed-data.ts`
// alongside `DEFAULT_TRANSFER_SETTINGS` (TICKET-SRV-03), so the server answers an unwritten
// singleton with the same object this app falls back to. The re-export above is what keeps every
// existing import of them resolving from here.

/**
 * The option lists behind three of those unions. They stay in the Angular workspace because only
 * the import wizard's dropdowns iterate them; `satisfies` ties each list to the shared union, so
 * adding a value in one place without the other stops compiling.
 */
export const SIGN_CONVENTIONS = [
  'as-is',
  'debit-negative',
  'credit-negative',
] as const satisfies readonly SignConvention[];

export const SUPPORTED_DATE_FORMATS = [
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
] as const satisfies readonly DateFormat[];

export const SUPPORTED_ENCODINGS = [
  'utf-8',
  'windows-1252',
] as const satisfies readonly CsvEncoding[];

/** True when no seeded "Partner contribution" category exists yet — keeps the `.version(6)` upgrade a no-op on re-run or for a user who already has one. */
export const needsPartnerContributionSeed = (
  categories: Pick<Category, 'isSystem' | 'name'>[],
): boolean =>
  !categories.some(
    (category) => category.isSystem && category.name === PARTNER_CONTRIBUTION_CATEGORY_NAME,
  );

class AppDb extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  transfers!: Table<Transfer, number>;
  categories!: Table<Category, number>;
  rules!: Table<Rule, number>;
  mappingProfiles!: Table<MappingProfile, number>;
  importBatches!: Table<ImportBatch, number>;
  transferSettings!: Table<TransferSettings, number>;
  categoryModel!: Table<CategoryModelArtifact, 1>;
  categoryComparisonSettings!: Table<CategoryComparisonSettings, number>;
  dashboardLayoutSettings!: Table<DashboardLayoutSettings, number>;
  categoryModelSettings!: Table<CategoryModelSettings, number>;
  appSettings!: Table<AppSettings, number>;
  salaryMetadata!: Table<SalaryMetadata, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  forecastSettings!: Table<ForecastSettings, number>;
  loans!: Table<Loan, number>;
  recurringOverrides!: Table<RecurringOverride, number>;

  constructor() {
    super('money-mosaic');

    this.version(1).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
    });

    this.version(2)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('transferSettings').add(DEFAULT_TRANSFER_SETTINGS);
      });

    // Backfills `ownIban` onto already-seeded KBC/Belfius profiles so multi-file import
    // auto-detection works without requiring users to delete and re-seed their mapping profiles.
    this.version(3)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const ownIbanHeaderByPreset: Record<string, string> = {
          kbc: 'Rekeningnummer',
          belfius: 'Rekening',
        };
        const profiles = await tx.table<MappingProfile, number>('mappingProfiles').toArray();
        for (const profile of profiles) {
          const ownIbanHeader = profile.bankPreset && ownIbanHeaderByPreset[profile.bankPreset];
          if (ownIbanHeader && !profile.columns?.ownIban) {
            await tx
              .table('mappingProfiles')
              .update(profile.id!, { columns: { ...profile.columns, ownIban: ownIbanHeader } });
          }
        }
      });

    // Rewrites stored transaction fingerprints into the new format: 64-bit base hash (CR-1.3) plus a
    // `|<occurrence>` suffix per identical base within an account (CR-1.2). Recomputed from the row's
    // own fields — the same inputs `commitImport` uses — so future imports of already-imported data
    // still dedupe instead of silently duplicating.
    this.version(4)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Transaction, number>('transactions');
        const transactions = await table.toArray();
        // Stable order so a base fingerprint's occurrence suffixes are assigned deterministically.
        transactions.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        const occurrenceByBase = new Map<string, number>();
        for (const transaction of transactions) {
          const base = computeFingerprint({
            accountId: transaction.accountId,
            bookingDate: transaction.bookingDate,
            amount: transaction.amount,
            description: transaction.rawDescription,
            counterpartyIban: transaction.counterpartyIban,
          });
          const occurrence = (occurrenceByBase.get(base) ?? 0) + 1;
          occurrenceByBase.set(base, occurrence);
          await table.update(transaction.id!, { fingerprint: `${base}|${occurrence}` });
        }
      });

    // Backfills the new `conditionMatch` combinator onto existing rules so they keep their
    // original AND semantics (TICKET-CAT-01). No index change — `conditionMatch` isn't queried.
    this.version(5)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Rule, number>('rules')
          .toCollection()
          .modify((rule) => {
            rule.conditionMatch ??= 'all';
          });
      });

    // Backfills the seeded "Partner contribution" (`neutral`-kind) system category for existing
    // users, since `populate` only runs for a fresh DB (TICKET-CAT-02). Idempotent: checks for an
    // existing system category with the same name before adding, so re-running it (or a user who
    // already has one) never duplicates it. No index change — `kind` widening an already-indexed
    // field needs no migration of stored values.
    this.version(6)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const categories = tx.table<Category, number>('categories');
        const existing = await categories.toArray();
        if (needsPartnerContributionSeed(existing)) {
          await categories.add({
            name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
            kind: 'neutral',
            group: 'Contributions',
            color: '#94A3B8',
            icon: 'users',
            archived: false,
            isSystem: true,
          });
        }
      });

    // Adds the `categoryModel` singleton-row table for the trained auto-categoriser (ML-04). Purely
    // additive — a brand-new, empty table — so no `.upgrade()` is needed.
    this.version(7).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
    });

    // Adds the `categoryComparisonSettings` singleton-row table for the category period comparison
    // panel's optional category exclusion list (TICKET-STAT-04 follow-up). Purely additive — a
    // brand-new, empty table — so no `.upgrade()` is needed; the repository's `get()` falls back to
    // `DEFAULT_CATEGORY_COMPARISON_SETTINGS` when the row hasn't been written yet, same as `categoryModel`.
    this.version(8).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
    });

    // Adds the `dashboardLayoutSettings` singleton-row table for the Dashboard's customizable
    // row order/visibility (TICKET-STAT-14). Purely additive — a brand-new, empty table — so no
    // `.upgrade()` is needed; the repository's `get()` falls back to
    // `DEFAULT_DASHBOARD_LAYOUT_SETTINGS` when the row hasn't been written yet, same as `categoryModel`.
    this.version(9).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
      dashboardLayoutSettings: 'id',
    });

    // Adds the `categoryModelSettings` singleton-row table for the training-window preset
    // (TICKET-ML-17). Purely additive — a brand-new, empty table — so no `.upgrade()` is needed;
    // the repository's `getSettings()` falls back to `DEFAULT_CATEGORY_MODEL_SETTINGS` when the
    // row hasn't been written yet, same as `categoryComparisonSettings`/`dashboardLayoutSettings`.
    this.version(10).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
      dashboardLayoutSettings: 'id',
      categoryModelSettings: 'id',
    });

    // Versions 1-10 above are shipped and must never be edited (Dexie replays every user's
    // upgrade chain from their current version forward). They predate the minimal-declaration
    // convention below and stay as full table-map copies for that reason alone.
    //
    // From .version(11) onward: declare only the tables that are new or have an index change.
    // Dexie carries forward the schema of every table you omit — you do not need to repeat it.

    // Indexes `importBatchId` (undo-import lookup) and the dotted keypath
    // `attributionOverride.reimbursementTransferId` (reimbursement-leg lookup) on `transactions` —
    // both were full-table filter scans (TICKET-PERF-03). Purely additive index changes on an
    // existing table; no `.upgrade()` needed, Dexie backfills indexes from existing row data.
    this.version(11).stores({
      transactions:
        '++id, accountId, bookingDate, categoryId, transferId, fingerprint, importBatchId, attributionOverride.reimbursementTransferId',
    });

    // Adds the `appSettings` singleton-row table for app-wide portable settings (currency, locale,
    // privacy default, etc.) — the shared foundation SET-02/SET-03/SET-04/PRIV-01 each add their own
    // field to (TICKET-SET-05). Purely additive — a brand-new, empty table — so no `.upgrade()` is
    // needed; the repository's `get()` falls back to `DEFAULT_APP_SETTINGS` when the row hasn't been
    // written yet, same as `categoryModel`/`categoryComparisonSettings`.
    this.version(12).stores({
      appSettings: 'id',
    });

    // Adds the `salaryMetadata` table — one manually-entered row per month for gross wage and an
    // embedded bonus (TICKET-INC-10). `&yearMonth` is a **unique** index: a second row for the same
    // month is never meaningful, so the constraint lives in the schema rather than in the
    // repository's `upsert`. Purely additive — a brand-new, empty table — so no `.upgrade()` is
    // needed, same as `appSettings` at v12.
    this.version(13).stores({
      salaryMetadata: '++id, &yearMonth',
    });

    // Adds the two tables v2.2's goals & forecast need (TICKET-FUT-02): `savingsGoals`, an entity
    // table indexed on `sortOrder` because that order *is* the funding order every ETA reads, and
    // `forecastSettings`, the usual `id: 1` singleton row. Purely additive — both are brand-new and
    // empty — so no `.upgrade()` is needed, same as `appSettings` at v12 and `salaryMetadata` at
    // v13. Only the non-indexed fields of `ForecastSettings` grow after this (`mode` for FUT-09,
    // `scopeAccountIds` for FUT-08), so neither of those tickets bumps the version again.
    this.version(14).stores({
      savingsGoals: '++id, sortOrder',
      forecastSettings: 'id',
    });

    // Adds the `loans` table for v1.7's loan tracker (TICKET-LOAN-01) — indexed on `categoryId`
    // (linked-category lookups), `loanType` (badge/filter display), and `archived` (active/archived
    // split), mirroring `savingsGoals`. Purely additive — a brand-new, empty table — so no
    // `.upgrade()` is needed, same as `savingsGoals`/`forecastSettings` at v14.
    this.version(15).stores({
      loans: '++id, categoryId, loanType, archived',
    });

    // Adds `recurringOverrides` for TICKET-REC-11's dismiss/merge corrections — indexed on
    // `anchorTransactionId`, which is how a stored override is matched back to a freshly detected
    // series, and on `kind` so the dismissals and the merges can be read apart. Purely additive — a
    // brand-new, empty table — so no `.upgrade()` is needed, same as `loans` at v15.
    this.version(16).stores({
      recurringOverrides: '++id, anchorTransactionId, kind',
    });

    this.on('populate', () => {
      this.mappingProfiles.bulkAdd(DEFAULT_MAPPING_PROFILE_TEMPLATES);
      this.categories.bulkAdd(DEFAULT_CATEGORIES);
      this.transferSettings.add(DEFAULT_TRANSFER_SETTINGS);
    });
  }
}

// Referenced by exactly one module in the app (TICKET-SRV-07):
// `core/local-migration/local-database.ts`, which opens this database once to upload a dataset
// already sitting in somebody's browser and is loaded by a dynamic `import()` so Dexie and this
// schema history stay out of every other chunk. Nothing else has touched it since TICKET-SRV-06
// took `appDb.open()` out of `provideAppInitializer`, and `dexie-boundary.spec.ts` keeps it that
// way for this folder. TICKET-SRV-08 deletes the whole apparatus, both sides, once the migration
// has had its release to run in.
export const appDb = new AppDb();
