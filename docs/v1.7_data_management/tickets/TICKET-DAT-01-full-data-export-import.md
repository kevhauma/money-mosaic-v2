# TICKET-DAT-01 — Full data export & import (JSON backup / restore)

- **Area:** Data Management
- **Type:** Feature
- **Traceability:** FR-DAT-1, FR-DAT-2, NFR-STORE-1

## User story

As a privacy-conscious user, I want to export all my data to a single JSON file and import it back (with a clear replace-vs-merge choice), so I have a portable backup that never touches a server and can move my data to another browser or device.

## Description

The app is local-first with no backend — everything lives in one browser's IndexedDB, which means a cleared browser profile, a new device, or a different browser is total data loss today. This ticket adds the single most important safety net for that model: a full-database export to one JSON file, and an import path that restores it, either replacing everything or merging into existing data.

## Current situation (as-is)

- No full-database export/import exists anywhere in the codebase (confirmed: no `exportAll`/`importAll`/backup-related code in `src/`). The only "import" feature is [feature-import](../../../src/app/feature-import/), which parses bank CSV statements into `transactions` — an unrelated pipeline (Web Worker CSV parsing, column mapping, dedupe-by-fingerprint) that has nothing to do with a full-database dump.
- `appDb` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) is currently at schema `.version(9)` and declares these tables: `accounts`, `transactions`, `transfers`, `categories`, `rules`, `mappingProfiles`, `importBatches`, `transferSettings`, `categoryModel`, `categoryComparisonSettings`, `dashboardLayoutSettings`. Any export must enumerate all of them (plus whatever future tickets add) rather than hardcoding a subset that will silently go stale.
- `core/data-access/index.ts` exports one repository per table but has no repository-agnostic "dump everything" helper — each repository only knows its own table.
- This was already spec'd as FR-DAT-1/FR-DAT-2 in [finance-app-spec.md:109-110](../../v1.0_foundation/finance-app-spec.md) and restated as user stories in this version's [data_management.md](../data_management.md), but never broken into a ticket or built — the feature is a documented gap, not a new idea.

## Desired result (to-be)

- A `DataManagementRepository` (or `data-export.service.ts` in `core/data-access/`) exposes `exportAll(): Promise<AppDataExport>`, which reads every table in `appDb` inside a single `db.transaction('r', appDb.tables, ...)` and returns a JSON-serializable object: `{ schemaVersion: number, exportedAt: string, tables: { accounts: Account[], transactions: Transaction[], ... } }`. `schemaVersion` is `appDb.verno` at export time (NFR-STORE-1 — every export records its schema version).
- `importAll(data: AppDataExport, mode: 'replace' | 'merge'): Promise<void>` runs inside a single `db.transaction('rw', appDb.tables, ...)`:
  - **Replace**: clears every table, then bulk-adds the imported rows, preserving their original auto-increment IDs (`bulkPut`, not `bulkAdd`, so cross-table foreign keys like `Transaction.categoryId`/`Transaction.transferId`/`Transaction.accountId` stay valid).
  - **Merge**: bulk-`put`s imported rows into existing tables without clearing first, so imported rows with colliding IDs overwrite in place and non-colliding rows add alongside what's already there.
  - If `data.schemaVersion` is newer than the running app's `appDb.verno`, the import is rejected with a clear error (an old app build can't safely interpret a newer schema) rather than silently corrupting data.
- A new **Data Management** section (route `/settings/data`, part of the Settings shell from TICKET-SET-01 if that ticket has landed, otherwise its own minimal routed page — see Notes) offers "Export data" (triggers a browser download of the JSON file, filename `money-mosaic-backup-YYYY-MM-DD.json`) and "Import data" (file picker + a `mm-confirm-dialog`-style choice between Replace and Merge, with the Replace option calling out that it's destructive).
- Import is transactional per NFR-RESIL-1: any failure (malformed JSON, a table write throwing) leaves the database completely unchanged — Dexie's `db.transaction('rw', ...)` already guarantees this as long as every write happens inside the one transaction and nothing is awaited outside it.
- After a successful import, all hydrated stores (the same list `app.config.ts` hydrates on boot: `TransactionsStore`, `TransfersStore`, `TransferSettingsStore`, `CategoriesStore`, `RulesStore`, `AccountsStore`, `MappingProfilesStore`, `ImportBatchesStore`, `CategoryComparisonSettingsStore`, `DashboardLayoutSettingsStore`, `CategoryModelStore`, plus any settings stores later tickets add) re-hydrate from the now-updated DB rather than requiring a manual page reload — or, more simply and robustly, the UI prompts the user to reload the page after a successful import (see Notes for the trade-off).

## Acceptance criteria

- [ ] `AppDataExport` type defined in `core/data-access/` covering every current `appDb` table.
- [ ] `exportAll()` reads all tables inside one read transaction and returns an object including `schemaVersion` (`appDb.verno`) and `exportedAt` (ISO timestamp).
- [ ] "Export data" downloads a `.json` file client-side (no network request) containing the full export.
- [ ] `importAll(data, 'replace')` clears and repopulates every table inside one write transaction, preserving original IDs so foreign keys (`accountId`, `categoryId`, `transferId`, `fromTransactionId`/`toTransactionId`) stay valid.
- [ ] `importAll(data, 'merge')` upserts rows into existing tables without clearing, inside one write transaction.
- [ ] Import UI requires an explicit Replace-vs-Merge choice before proceeding, with Replace visually flagged as destructive (matches the existing `mm-confirm-dialog` pattern).
- [ ] Importing a file whose `schemaVersion` exceeds the running app's `appDb.verno` is rejected with a clear error message and no data is touched.
- [ ] A write failure partway through import leaves every table exactly as it was before the import started (verified by forcing a failure on a later table in a test and asserting earlier tables are unchanged).
- [ ] Components/stores never touch `appDb.<table>` directly for export/import — all reads/writes go through the new repository/service.
- [ ] Unit tests cover: `exportAll()` round-trips into `importAll(..., 'replace')` producing an identical database snapshot; `merge` mode preserves pre-existing non-colliding rows; a newer-schema-version import is rejected before any write; a forced mid-import failure leaves all tables unchanged.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: export a database with real seeded data, wipe IndexedDB via devtools, import the file back in Replace mode, confirm the app renders identically; separately verify Merge mode adds imported accounts alongside existing ones without deleting them.

## Notes

- Whether this ticket's UI lives under a `/settings/data` route depends on whether TICKET-SET-01 (Settings page shell) has already landed. If it hasn't, ship a minimal standalone route (e.g. `/data`) with its own nav entry for now — moving it under Settings later is a small routing change, not a rework of the export/import logic itself, so don't block on ticket ordering across versions.
- Re-hydrating every store in place after import is the ideal UX but touches a lot of call sites for a first version; a simpler, still-correct v1 is "import succeeds, then prompt the user to reload the page" (a real page reload re-runs `app.config.ts`'s hydration exactly as on first load, guaranteeing consistency). Pick the reload prompt unless re-hydration turns out to be cheap once implementation starts.
- This ticket is the natural prerequisite for [TICKET-PUB-04](../../v2/tickets/TICKET-PUB-04-local-data-migration-messaging.md) (v2's "your data never leaves the browser, here's how to move it" messaging) — that ticket links to this one's Export/Import UI rather than re-describing the mechanism.
- Large datasets (10k+ transactions per NFR-PERF-1) should still export/import without freezing the UI for an unreasonable time; if `JSON.stringify`/`parse` on the full dataset proves slow in practice, consider a progress indicator rather than moving parsing to a Web Worker — full-DB export/import is a rare, user-initiated action, not a hot path like CSV import.
