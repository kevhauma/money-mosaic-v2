# TICKET-INC-10 — Monthly gross wage entry

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-10 (new)

## User story

As a user, I want to attach a gross wage amount to each month (manual entry, editable/deletable), so I have a gross figure to compare against what actually lands in my account — something no bank CSV will ever tell me.

## Description

Lets the user attach a gross wage figure to a given month, since bank CSVs only ever contain what actually lands in the account (net) and gross pay can't be derived from that.

## Current situation (as-is)

- No entity for this exists. [app-db.ts](../../../src/app/core/data-access/app-db.ts) is at schema **v12** (13 tables; v12 added the `appSettings` singleton row for TICKET-SET-05) — not v6 as this ticket originally assumed. The `MappingProfile`/`ImportBatch` repository-per-entity pattern (many rows, one per import/profile) is still the closest precedent — closer than `TransferSettings`/`appSettings`'s singleton-row pattern, since this needs one row per month.
- **The `.stores()` convention changed at v11.** Versions 1–10 repeat the full table map and are frozen; from `.version(11)` onward each block declares **only** the tables that are new or have an index change, since Dexie carries forward everything omitted. `.version(12)`'s block is literally `{ appSettings: 'id' }`.
- Export/import (v1.4) iterates `appDb.tables` generically ([data-management.repository.ts](../../../src/app/core/data-access/data-management.repository.ts)), so a new table is picked up automatically — but the export records `schemaVersion: appDb.verno`, and `importAll` rejects a backup whose version is *newer* than the running app. A pre-v1.6 backup imports fine (the new table just has no rows).

## Desired result (to-be)

- New `GrossWageEntry` type in `app-db.ts`: `{ id?: number; yearMonth: string /* 'YYYY-MM' */; grossAmount: number; note?: string }`, plus a `grossWageEntries!: Table<GrossWageEntry, number>` field on `AppDb`.
- `this.version(13).stores({ grossWageEntries: '++id, &yearMonth' })` — **only** the new table in the block, per the v11+ minimal-declaration convention; `&yearMonth` is a **unique** index, since only one gross entry makes sense per month. No `.upgrade()` needed (new empty table, same as `appSettings` at v12 and `categoryModel` before it).
- New `core/data-access/gross-wage.repository.ts` (`getAll`, `upsert(entry)`, `remove(id)`), exported via `core/data-access/index.ts`, following the one-repository-per-entity convention.
- `IncomeStore` gains `grossWageEntries` state (hydrated on init, like every other entity-backed store) and `setGrossWage(yearMonth, grossAmount)` / `removeGrossWage(id)` methods that call the repository then patch state — never touching `appDb.grossWageEntries` directly from a component.
- New component `components/gross-wage-entry/gross-wage-entry.component.{ts,html}` — a simple month-picker + amount `mm-input`, editable inline per month, mounted on the Income page.

## Acceptance criteria

- [ ] `grossWageEntries` table enforces one entry per `yearMonth` (unique index) — attempting to add a second entry for the same month updates the existing one instead of creating a duplicate (`upsert` semantics).
- [ ] Schema version is **13**, and its `.stores()` block declares **only** `grossWageEntries` — the v11+ minimal-declaration convention, *not* the full-table-map style of the frozen v1–v10 blocks. No shipped version block is edited.
- [ ] Data-management export includes the new table and a round-trip (export → clear → import) restores gross entries; an older backup (schemaVersion < 13) still imports without error.
- [ ] `IncomeStore` never lets a component call `appDb.grossWageEntries` directly — all access via `GrossWageRepository`.
- [ ] A gross entry can be edited and deleted; deletion removes it from `IncomeStore`'s state immediately.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: add a gross wage for the current month, reload the page, confirm it persisted (IndexedDB-backed, not lost on refresh).

## Notes

- `grossAmount` is a plain number (no currency field) — the app still has no currency *conversion*; TICKET-SET-03 made the symbol and its position a display-only user setting, so a stored amount is just a number and every rendering of it goes through `formatCurrency()` ([currency-format.ts](../../../src/app/shared/utils/currency-format.ts)). The original "single-currency `'EUR'`" phrasing predates that setting.
- The amount input must be an `mm-input` (a `ControlValueAccessor` wrapper that replicates `NumberValueAccessor`'s coercion) rather than a raw `<input type="number">`, so the form value stays a `number`.
- No link to a specific `Account`/category — gross wage is a household-level monthly fact the user enters once, independent of which account the net salary happened to land in.
