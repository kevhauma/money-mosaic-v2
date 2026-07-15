---
name: data-model
description: Dexie/IndexedDB schema reference for MoneyMosaicVibe — entities, tables, indexes, versioning rules, seed data, and the repository layer. Use when adding/changing entities, writing queries, or planning a schema migration.
---

# Data Model (Dexie.js / IndexedDB)

Everything lives in `src/app/core/data-access/`. The single source of truth is [app-db.ts](../../../src/app/core/data-access/app-db.ts): the `AppDb` Dexie subclass (db name `money-mosaic`), all entity `type` definitions, seed data, and version blocks. `export const appDb = new AppDb()` is the singleton; `app.config.ts` opens it and hydrates all stores in `provideAppInitializer` before render.

## Entities (all defined in app-db.ts)

| Entity | Table | Indexes | Notes |
|---|---|---|---|
| `Account` | `accounts` | `++id, name, type, archived` | type: checking/savings/joint/invest; currency fixed `'EUR'`; openingBalance + openingBalanceDate anchor balance math; `ownershipShare` (my fraction of a joint account, default 1); `coOwners: JointOwner[]` (name + IBANs + optional share for others on a joint account, TICKET-ACC-03); `sortOrder` for manual display ordering (TICKET-ACC-04) |
| `Transaction` | `transactions` | `++id, accountId, bookingDate, categoryId, transferId, fingerprint, importBatchId, attributionOverride.reimbursementTransferId` | `fingerprint` = dedupe hash (`shared/utils/fingerprint.ts`); `categoryManual: true` ⇒ rules must never overwrite the category (FR-TXN-2, FR-CAT-3); `rawLine`/`rawRow` retain the original CSV row (TICKET-TXN-06); `attributionOverride` reweights a single transaction's contribution to net worth/income-expense for joint-account edge cases (TICKET-TXN-03); `nullified: true` excludes it from income/expense/savings-rate/category-breakdown while still counting toward balance (TICKET-TXN-04) |
| `Transfer` | `transfers` | `++id, fromTransactionId, toTransactionId` | method: auto-iban / auto-amountdate / manual; confidence: high / medium / manual |
| `TransferSettings` | `transferSettings` | `id` (singleton, id=1) | matchWindowDays (default 3), autoLinkMediumConfidence (default true) |
| `Category` | `categories` | `++id, name, kind, archived` | kind: expense/income/**neutral** (neutral counts toward balance/net worth but is excluded from income/expense/savings-rate/breakdown — e.g. a partner's contribution, TICKET-CAT-02); `isSystem` marks seeded defaults; `sortOrder` for manual ordering (TICKET-CAT-03) |
| `Rule` | `rules` | `++id, priority, enabled` | conditions[] (field/operator/value) + action `{ setCategoryId }`; `continueOnMatch`; `conditionMatch: 'all' \| 'any'` — AND vs OR across conditions (FR-CAT-2), absent/undefined on pre-v5 rules ⇒ treated as `'all'` |
| `MappingProfile` | `mappingProfiles` | `++id, name, bankPreset, defaultAccountId` | CSV column mapping; `headerSignature` auto-detects bank templates; `columns.ownIban` auto-detects which account a file belongs to |
| `ImportBatch` | `importBatches` | `++id, accountId, importedAt` | per-import audit: rowsRead/rowsAdded/rowsDuplicate, date range |
| `CategoryModelArtifact` | `categoryModel` | `id` (singleton, id=1) | trained auto-categoriser weights/metadata (ML-04); written by `category-model.worker.ts`, read by `CategoryModelStore`/`CategoryModelService` in `feature-categories/` |
| `CategoryModelSettings` | `categoryModelSettings` | `id` (singleton, id=1) | training-window preset (`trainingWindowYears`, TICKET-ML-17); repository falls back to `DEFAULT_CATEGORY_MODEL_SETTINGS` when unwritten |
| `CategoryComparisonSettings` | `categoryComparisonSettings` | `id` (singleton, id=1) | optional category exclusion list for the dashboard's category period-comparison panel |
| `DashboardLayoutSettings` | `dashboardLayoutSettings` | `id` (singleton, id=1) | customizable dashboard row order + per-row visibility (TICKET-STAT-14) |

## Versioning rules (critical)

- Current schema version: **11**. History: v2 added `transferSettings`; v3 backfilled `columns.ownIban` on seeded KBC/Belfius profiles; v4 backfilled fingerprint occurrence suffixes; v5 backfilled `Rule.conditionMatch`; v6 seeded the "Partner contribution" neutral category; v7 added `categoryModel`; v8 added `categoryComparisonSettings`; v9 added `dashboardLayoutSettings`; v10 added `categoryModelSettings`; v11 indexed `transactions.importBatchId` and `transactions.attributionOverride.reimbursementTransferId`.
- **Only additive changes**: add `.version(n + 1).stores({...})` and an `.upgrade(async (tx) => ...)` block if existing data needs transforming. Never edit a shipped version block in place. A brand-new, empty singleton-settings table needs no `.upgrade()` at all if its repository's `get()` falls back to a `DEFAULT_*` constant (the established pattern — see `categoryModel`/`categoryComparisonSettings`/`dashboardLayoutSettings`/`categoryModelSettings`).
- **Minimal declaration (from `.version(11)` onward)**: a new `.stores({...})` call lists only the tables that are new or have an index change — Dexie carries forward the schema of every table you omit. Versions 1–10 predate this convention and repeat the full table map each time; they are shipped and stay as-is (never rewritten retroactively — see the hard rule above). Add a one-line comment above each new block naming what changed and why. Example:
  ```ts
  // Adds importBatchId index for undo-import lookups (TICKET-PERF-03).
  this.version(11).stores({
    transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint, importBatchId',
  });
  ```
- `this.on('populate')` seeds first-run data only: KBC + Belfius mapping-profile templates, ~10 default categories, default transfer settings. `populate` does NOT run for existing users — they need an `.upgrade()` block.

## Repository layer

One thin repository per entity in `core/data-access/` (`accounts.repository.ts`, `transactions.repository.ts`, `transfers.repository.ts`, `transfer-settings.repository.ts`, `categories.repository.ts`, `rules.repository.ts`, `mapping-profiles.repository.ts`, `import-batches.repository.ts`, `category-model.repository.ts` (covers both `categoryModel` and `categoryModelSettings`), `category-comparison-settings.repository.ts`, `dashboard-layout-settings.repository.ts`), exported through `core/data-access/index.ts`.

- Components and signal stores **never** touch `appDb.<table>` directly — always via a repository.
- All repository methods are `async`; stores call them from methods/effects, never from templates.
- Multi-table writes (e.g. import insert + dedupe check) go inside `appDb.transaction('rw', [...tables], async () => ...)`.

## Data flow

- **Import**: CSV file → `core/import/csv-parse.worker.ts` (PapaParse in Web Worker) → `csv-row-mapper.ts` (via MappingProfile) → fingerprint dedupe → `import.service.ts` writes Transactions + ImportBatch → `core/categorisation/rules-engine.service.ts` assigns categories → `core/transfers/transfer-matching.service.ts` auto-links transfers → signal stores hydrate/mirror state ↔ IndexedDB.
- **Auto-categorisation**: `feature-categories/category-model.store.ts` trains via `core/ml/category-model.worker.ts` (off main thread) over transactions bounded by `core/ml/training-window.ts`; results (`categoryModel` artifact) drive per-transaction suggestions surfaced in `feature-transactions` and reviewed on `/learning`; `core/ml/rule-proposal-mining.ts` mines confident predictions into candidate `Rule`s for the rule-proposal inbox.
- **Joint accounts**: a transaction on a `joint` account is weighted by `core/stats/classify-joint-leg.ts`/`joint-account-stake.ts` using the account's `ownershipShare`/`coOwners`, unless overridden per-transaction by `Transaction.attributionOverride`; `core/categorisation/co-owner-contribution.ts` attributes a leg to a specific co-owner by IBAN.
