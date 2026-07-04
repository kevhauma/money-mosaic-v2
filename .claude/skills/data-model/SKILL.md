---
name: data-model
description: Dexie/IndexedDB schema reference for MoneyMosaicVibe — entities, tables, indexes, versioning rules, seed data, and the repository layer. Use when adding/changing entities, writing queries, or planning a schema migration.
---

# Data Model (Dexie.js / IndexedDB)

Everything lives in `src/app/core/data-access/`. The single source of truth is [app-db.ts](../../../src/app/core/data-access/app-db.ts): the `AppDb` Dexie subclass (db name `money-mosaic`), all entity `type` definitions, seed data, and version blocks. `export const appDb = new AppDb()` is the singleton; `app.config.ts` opens it and hydrates all stores in `provideAppInitializer` before render.

## Entities (all defined in app-db.ts)

| Entity | Table | Indexes | Notes |
|---|---|---|---|
| `Account` | `accounts` | `++id, name, type, archived` | type: checking/savings/joint/invest; currency fixed `'EUR'`; openingBalance + openingBalanceDate anchor balance math |
| `Transaction` | `transactions` | `++id, accountId, bookingDate, categoryId, transferId, fingerprint` | `fingerprint` = dedupe hash (`shared/utils/fingerprint.ts`); `categoryManual: true` ⇒ rules must never overwrite the category (FR-TXN-2, FR-CAT-3) |
| `Transfer` | `transfers` | `++id, fromTransactionId, toTransactionId` | method: auto-iban / auto-amountdate / manual; confidence: high / medium / manual |
| `TransferSettings` | `transferSettings` | `id` (singleton, id=1) | matchWindowDays (default 3), autoLinkMediumConfidence (default true) |
| `Category` | `categories` | `++id, name, kind, archived` | kind: expense/income; `isSystem` marks seeded defaults |
| `Rule` | `rules` | `++id, priority, enabled` | conditions[] (field/operator/value) + action `{ setCategoryId }`; `continueOnMatch` |
| `MappingProfile` | `mappingProfiles` | `++id, name, bankPreset, defaultAccountId` | CSV column mapping; `headerSignature` auto-detects bank templates; `columns.ownIban` auto-detects which account a file belongs to |
| `ImportBatch` | `importBatches` | `++id, accountId, importedAt` | per-import audit: rowsRead/rowsAdded/rowsDuplicate, date range |

## Versioning rules (critical)

- Current schema version: **3** (v2 added `transferSettings`; v3 backfilled `columns.ownIban` on seeded KBC/Belfius profiles).
- **Only additive changes**: add `.version(4).stores({ ...full table map... })` and an `.upgrade(async (tx) => ...)` block if existing data needs transforming. Never edit a shipped version block in place.
- Each `.stores()` call must repeat the **complete** table map, not just the changed table.
- `this.on('populate')` seeds first-run data only: KBC + Belfius mapping-profile templates, ~10 default categories, default transfer settings. `populate` does NOT run for existing users — they need an `.upgrade()` block.

## Repository layer

One thin repository per entity in `core/data-access/` (`accounts.repository.ts`, `transactions.repository.ts`, `transfers.repository.ts`, `transfer-settings.repository.ts`, `categories.repository.ts`, `rules.repository.ts`, `mapping-profiles.repository.ts`, `import-batches.repository.ts`), exported through `core/data-access/index.ts`.

- Components and signal stores **never** touch `appDb.<table>` directly — always via a repository.
- All repository methods are `async`; stores call them from methods/effects, never from templates.
- Multi-table writes (e.g. import insert + dedupe check) go inside `appDb.transaction('rw', [...tables], async () => ...)`.

## Data flow

CSV file → `core/import/csv-parse.worker.ts` (PapaParse in Web Worker) → `csv-row-mapper.ts` (via MappingProfile) → fingerprint dedupe → `import.service.ts` writes Transactions + ImportBatch → `core/categorisation/rules-engine.service.ts` assigns categories → `core/transfers/transfer-matching.service.ts` auto-links transfers → signal stores hydrate/mirror state ↔ IndexedDB.
