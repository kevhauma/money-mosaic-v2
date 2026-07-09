# TICKET-INC-10 — Monthly gross wage entry

- **Area:** Income
- **Type:** Feature
- **Traceability:** adds FR-INC-10 (new)
- **Source story:** user-stories.md §9 — *"As a user, I want to attach a gross wage amount to each month (manual entry, editable/deletable), so I have a gross figure to compare against what actually lands in my account — something no bank CSV will ever tell me."*

## Description

Lets the user attach a gross wage figure to a given month, since bank CSVs only ever contain what actually lands in the account (net) and gross pay can't be derived from that.

## Current situation (as-is)

- No entity for this exists. [app-db.ts](../../../src/app/core/data-access/app-db.ts) is at schema **v6** (categories.kind widened to include `neutral` + backfill). The `MappingProfile`/`ImportBatch` repository-per-entity pattern (many rows, one per import/profile) is the closest precedent — closer than `TransferSettings`'s singleton-row pattern, since this needs one row per month.

## Desired result (to-be)

- New `GrossWageEntry` type in `app-db.ts`: `{ id?: number; yearMonth: string /* 'YYYY-MM' */; grossAmount: number; note?: string }`.
- `this.version(7).stores({ ...all 8 existing tables verbatim..., grossWageEntries: '++id, &yearMonth' })` — `&yearMonth` as a **unique** index, since only one gross entry makes sense per month. No `.upgrade()` needed (new empty table, matching the `categoryModel` v6 precedent noted in [../v1.2_auto_categorise/auto-categorise.md](../../v1.2_auto_categorise/auto-categorise.md)).
- New `core/data-access/gross-wage.repository.ts` (`getAll`, `upsert(entry)`, `remove(id)`), exported via `core/data-access/index.ts`, following the one-repository-per-entity convention.
- `IncomeStore` gains `grossWageEntries` state (hydrated on init, like every other entity-backed store) and `setGrossWage(yearMonth, grossAmount)` / `removeGrossWage(id)` methods that call the repository then patch state — never touching `appDb.grossWageEntries` directly from a component.
- New component `components/gross-wage-entry/gross-wage-entry.component.{ts,html}` — a simple month-picker + amount `mm-input`, editable inline per month, mounted on the Income page.

## Acceptance criteria

- [ ] `grossWageEntries` table enforces one entry per `yearMonth` (unique index) — attempting to add a second entry for the same month updates the existing one instead of creating a duplicate (`upsert` semantics).
- [ ] Schema version is **7**, table map in `.stores()` repeats the complete existing table list (not just the new table), matching every prior version block's convention.
- [ ] `IncomeStore` never lets a component call `appDb.grossWageEntries` directly — all access via `GrossWageRepository`.
- [ ] A gross entry can be edited and deleted; deletion removes it from `IncomeStore`'s state immediately.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified live in the browser: add a gross wage for the current month, reload the page, confirm it persisted (IndexedDB-backed, not lost on refresh).

## Notes

- `grossAmount` is a plain number (no currency field) — matches the app's existing single-currency (`'EUR'`) assumption used throughout `Account`/`Transaction`.
- No link to a specific `Account`/category — gross wage is a household-level monthly fact the user enters once, independent of which account the net salary happened to land in.
