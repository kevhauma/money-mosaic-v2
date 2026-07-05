# TICKET-DEV-01 — Seed sample dev data on a fresh browser in dev mode

- **Area:** Dev Tooling
- **Type:** Feature
- **Traceability:** supports §0 Foundation (bootstrap hydration) and NFR-testability; no production FR — dev-only affordance
- **Source story:** user-stories.md §0 — *"As a developer, I want a set of sample accounts and transactions auto-seeded on dev-server startup when the database is empty, so I can test features on a fresh browser without importing a CSV first."*

## Description

Give the dev server a one-time, dev-only data seed: when the app boots in development mode and the database holds no accounts/transactions, populate a small realistic dataset (a couple of accounts and a spread of categorised transactions) so the dashboard, transactions table, categorisation, transfers, and stats all have something to render immediately. In production the app must behave exactly as today.

## Current situation (as-is)

- Bootstrap opens the DB and hydrates every store, but seeds **nothing** transactional: [appConfig `provideAppInitializer`](../../../src/app/app.config.ts) calls `appDb.open()` then hydrates the accounts/transactions/transfers/categories/rules/mapping-profiles/import-batches stores from IndexedDB.
- The only data seeded on a fresh DB is reference data, via Dexie's populate hook: [`AppDb.on('populate')`](../../../src/app/core/data-access/app-db.ts) adds `DEFAULT_MAPPING_PROFILE_TEMPLATES`, `DEFAULT_CATEGORIES`, and `DEFAULT_TRANSFER_SETTINGS` — **no accounts and no transactions**.
- So on a fresh browser (new profile, cleared storage, incognito) the dashboard, transactions list, and stats are all empty until the developer manually walks the CSV import wizard, which is slow and repetitive when testing UI changes.
- There is no `src/environments/` split and no existing dev/prod gate in the seed path — `on('populate')` runs identically in every environment.

## Desired result (to-be)

- Starting the dev server (`npm run start` / launch config `dev` on port 4210) against an empty database auto-seeds a small sample dataset, so the app opens with populated accounts, transactions, categories, and visible stats — no manual import needed.
- Seeding is **idempotent and non-destructive**: it runs only when there is no existing account/transaction data, so an existing local dataset (real test data the developer built up) is never touched, duplicated, or overwritten.
- Seeding is **dev-only**: a production build never seeds sample data, and the dataset adds nothing to the production bundle.
- The seeded data is realistic enough to exercise the main features — at least two accounts, a date-spread of income/expense transactions across several categories, and at least one inter-account transfer pair so transfer linking and the transfers/stats views have something to show.

## Acceptance criteria

- [ ] On dev-mode bootstrap, if the database has zero accounts **and** zero transactions, a sample dataset is written; if either already has rows, seeding is skipped entirely (idempotent, non-destructive).
- [ ] The seed writes through the repository/store layer (`AccountsStore`/`TransactionsStore` and their repositories in `core/data-access`), never via direct `appDb` table writes from the initializer — consistent with the "components/stores never touch tables directly" rule, and so hydrated stores reflect the seeded rows without a reload.
- [ ] Seeding is gated to development only (e.g. `isDevMode()` from `@angular/core`): a `ng build` production bundle neither runs the seed nor includes the sample-data payload (verify the dataset is tree-shaken / not referenced from the prod path).
- [ ] The seeded dataset contains ≥2 accounts, a date-spread of ≥20 transactions across several of the `DEFAULT_CATEGORIES`, and ≥1 linked own-account transfer pair, so dashboard stats, category breakdown, and the transfers view all render non-empty.
- [ ] Seeded transactions carry a valid deterministic `fingerprint` and required fields (accountId, bookingDate, signed amount, rawDescription) so they pass the same invariants as imported rows and don't collide on a later real import.
- [ ] No new Dexie schema version is introduced (seeding is data, not schema); if any migration is unavoidable it is additive per CLAUDE.md, and the `on('populate')` reference-data hook is left unchanged.
- [ ] Unit tests cover: seeding runs and writes the dataset when the DB is empty; seeding is a no-op when accounts already exist; seeding is a no-op when transactions already exist; and the seed path is not invoked when dev mode is off.
- [ ] Verified live in the browser: clear IndexedDB, reload the dev server, and confirm the dashboard/transactions/stats render populated from the seed; then reload again and confirm no duplication.

## Notes

- Keep the seed generator in a clearly dev-scoped location (e.g. a `dev-seed` module invoked from the app initializer behind the `isDevMode()` guard) so it's obvious it's not production code and stays easy to tree-shake.
- Prefer generating transactions relative to "today" (e.g. spanning the last few months) so the default current-month stats range always has data, rather than hard-coded calendar dates that age out.
- Seeding after `on('populate')` means `DEFAULT_CATEGORIES` already exist, so seeded transactions can reference real category ids — resolve them from the hydrated `CategoriesStore` rather than hard-coding numeric ids.
- Out of scope: any user-facing "load sample data" button — that overlaps the v2 Data Management stories ([../v2/requirements.md](../../v2/requirements.md) FR-DAT); this ticket is strictly a dev-server convenience.
