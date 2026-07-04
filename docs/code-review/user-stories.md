# Money Mosaic — Code Review Backlog (User Stories)

Derived from [../code-review-optimizations.md](../code-review-optimizations.md) (full-codebase review, 2026-07-04). Sibling to the [v1 build checklist](../v1/user-stories.md): those stories deliver features; these are the refinements, correctness fixes, and performance work the review surfaced. Ordered most-impactful-first within each section. The review's item numbers (e.g. CR-1.1) are kept in parentheses for traceability back to the review doc.

## 1. Correctness (fix before optimizing)

- [ ] As a user, I want deleting an account to also remove its transactions and any transfer links touching them (in one atomic transaction, mirrored into the stores), so the delete does what the confirmation promises and no orphaned rows keep skewing my stats and net worth (CR-1.1, [accounts.store.ts:84](../../src/app/feature-accounts/accounts.store.ts))
- [ ] As a user, I want duplicate detection to behave consistently within a single file and across re-imports (via an occurrence counter on the fingerprint key), so genuine same-day duplicates are kept once and never silently dropped on a later overlapping import (CR-1.2, [import.service.ts:36](../../src/app/core/import/import.service.ts))
- [ ] As a user, I want transaction fingerprints widened to 64 bits (with a Dexie `.upgrade()` migration of stored values), so an import can't silently drop a real transaction as a "duplicate" via hash collision — the worst failure mode for a finance app (CR-1.3, [fingerprint.ts:22](../../src/app/shared/utils/fingerprint.ts))
- [ ] As a user, I want header auto-detection to honour each preset's declared encoding (e.g. `windows-1252`), so headers with accented characters still match and I'm not silently dropped to "Custom mapping" (CR-1.4, [import-map-step.component.ts:81](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts))
- [ ] As a developer, I want the map-step detection effect to react to the file reference itself rather than a one-shot `detectionStarted` guard, so re-detection still works if the wizard ever keeps the step component alive between files (CR-1.5, [import-map-step.component.ts:70](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts))
- [ ] As a user, I want a remembered mapping to upsert one profile per bank+account (and not persist at all when I didn't ask to remember it), so ten imports don't leave ten near-duplicate profile rows and my edits to a remembered mapping actually stick (CR-1.6, [import-wizard.component.ts:115](../../src/app/feature-import/components/import-wizard/import-wizard.component.ts))

## 2. Rendering performance

- [ ] As a user, I want the transactions table to stop rendering every filtered row at once — via pagination or CDK virtual scroll — so the screen stays smooth with years of data instead of rebuilding thousands of rows on each keystroke (CR-2.1, [transactions-overview.component.html:111](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html); overlaps v1 story §3 NFR-PERF-1)
- [ ] As a user, I want transfer matching bucketed by absolute amount (near-linear) instead of O(n²) pair scans inside a `computed()`, and computed lazily only when the review section is visible, so editing a transaction doesn't run millions of comparisons on the UI thread (CR-2.2, [transfer-review.component.ts:34](../../src/app/feature-transactions/components/transfer-review/transfer-review.component.ts), [transfer-matching.ts:89](../../src/app/core/transfers/transfer-matching.ts))
- [ ] As a developer, I want each table row's account name, category, transfer, and selected flag joined once per data change in a row view-model computed (backed by an `accountsById` map on `AccountsStore`), so the template stops calling `.find()`-based methods per row on every change-detection pass (CR-2.3, [transactions-overview.component.ts:203](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts))
- [ ] As a user, I want the free-text transaction filter debounced (~150ms) before it re-filters and re-renders, so typing in the search box doesn't re-run the whole pipeline on every keystroke (CR-2.4, [transactions-overview.component.ts:79](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts))
- [ ] As a developer, I want the category-breakdown chart to join category name/colour in a computed instead of per-entry template methods, so it stays method-free and consistent with the row view-model pattern (CR-2.5, [category-breakdown-panel.component.ts:39](../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts))

## 3. Data layer & algorithmic efficiency

- [ ] As a developer, I want hot write paths batched into single bulk transactions instead of one IndexedDB round-trip per row — rules persistence, transfer auto-linking, and category removal — so imports and "run rules" commit in O(1) transactions (CR-3.1, [rules-engine.service.ts:33](../../src/app/core/categorisation/rules-engine.service.ts), [transfer-matching.service.ts:29](../../src/app/core/transfers/transfer-matching.service.ts), [categories.store.ts:71](../../src/app/feature-categories/categories.store.ts))
- [ ] As a developer, I want rules sorted and regexes compiled once per "run rules" pass rather than per transaction, so `applyToTransactions` stops re-sorting and re-allocating for every row (CR-3.2, [rule-matching.ts:63](../../src/app/core/categorisation/rule-matching.ts))
- [ ] As a developer, I want `importBatchId` added to the transactions index (new Dexie `version(4)`), so undo-import is an indexed lookup instead of a full-table scan (CR-3.3, [transactions.repository.ts:21](../../src/app/core/data-access/transactions.repository.ts))
- [ ] As a user, I want bootstrap to hydrate only what the landing route needs and stream transactions/transfers in the background behind a `hydrated` signal, so a large dataset doesn't leave me staring at a blank screen before first paint (CR-3.4, [app.config.ts:24](../../src/app/app.config.ts))
- [ ] As a developer, I want account totals and counts produced by one pass over transactions (a single `Map<accountId, {total, count}>` computed), so we don't walk the full transaction list twice for figures that always invalidate together (CR-3.5, [accounts.store.ts:27](../../src/app/feature-accounts/accounts.store.ts))

## 4. CSV import pipeline

- [ ] As a user, I want the import to decode the file once (slicing to the first ~64KB for header/preview paths and caching per `(File, encoding)`), so a single import doesn't read and decode the whole file up to four times (CR-4.1, [csv-import.service.ts](../../src/app/core/import/csv-import.service.ts))
- [ ] As a user, I want the raw bytes transferred to the worker and decoded there, instead of decoding the whole file on the main thread and cloning the string across, so the decode cost stays off the UI thread (CR-4.2, [csv-import.service.ts:8](../../src/app/core/import/csv-import.service.ts))
- [ ] As a developer, I want the worker to key rows by column index rather than header name, so a bank export that repeats a header column doesn't silently lose a column (CR-4.3, low priority, [csv-parse.worker.ts:19](../../src/app/core/import/csv-parse.worker.ts))

## 5. Bundle size & startup

- [ ] As a user, I want feature stores hydrated on first injection rather than referenced from a central initializer, so every store (and its repositories, import/rules/transfer code, entity adapters) stops landing in the initial bundle and lazy routes actually defer their own code (CR-5.1, builds on CR-3.4, [app.config.ts](../../src/app/app.config.ts))
- [ ] As a developer, I want the existing bundle wins kept intact — tree-shaken ECharts behind the lazy dashboard route, the deliberate non-barrel import in [app.ts:24](../../src/app/app.ts), per-component `provideIcons` — so refactors don't regress them (CR-5.2)
- [ ] As a user, I want below-fold dashboard panels wrapped in `@defer (on viewport)`, so ngx-echarts + echarts core leave the dashboard chunk's critical path (CR-5.3, minor)

## 6. Architecture & dead code

- [ ] As a developer, I want the app-wide entity stores promoted to `core/state/` (or a `shared/data-access` tier) with `feature-*` holding only components/routes, so cross-feature "upward" store coupling stops forcing per-case barrel-avoidance workarounds (CR-6.1, [app.routes.ts:14](../../src/app/app.routes.ts))
- [ ] As a developer, I want confirmed-unused repository methods removed (`TransactionsRepository.getByAccount`/`.add`/`.remove`, `MappingProfilesRepository.getByBankAndAccount`, and `.update`/`.remove` unless kept deliberately for the planned profiles UI), so the repository surface reflects what the app actually does (CR-6.2, [transactions.repository.ts](../../src/app/core/data-access/transactions.repository.ts), [mapping-profiles.repository.ts:8](../../src/app/core/data-access/mapping-profiles.repository.ts))
- [ ] As a developer, I want unused exports un-exported (`AppDb` class in [app-db.ts:285](../../src/app/core/data-access/app-db.ts), `RangeState` in [range-state.store.ts:4](../../src/app/core/stats/range-state.store.ts)), so the public surface only exposes what's consumed (CR-6.3)
- [ ] As a developer, I want Dexie version declarations to only re-declare the tables they change, so future schema diffs stay reviewable and no version accidentally alters a table while "copying" it (CR-6.4, [app-db.ts:308](../../src/app/core/data-access/app-db.ts))

## 7. Angular patterns

- [ ] As a developer, I want the repeated `<dialog>` open/close effect extracted into a shared `mm-modal` component (or a `syncDialogWithSignal` utility), so `account-form`, `category-form`, `rule-form`, and `transaction-edit-form` stop duplicating it and a11y (focus trap, `aria-modal`) lives in one place (CR-7.1, [with-archivable.ts](../../src/app/shared/utils/with-archivable.ts) area; Fallow `dup:871c39b0`/`dup:5bb3d5e1`)
- [ ] As a developer, I want `TransactionsOverviewComponent` to bind `from`/`to`/`categoryId`/`accountId` via `input()` instead of reading `route.snapshot.queryParamMap`, so it's less code and reacts to same-route navigations with new params (CR-7.2, [transactions-overview.component.ts:67](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts))
- [ ] As a developer, I want the URL-mirroring effect to skip navigating when params already match the current snapshot, so it can't ping-pong or schedule redundant navigations right after the initial read-in (CR-7.3, [app.ts:80](../../src/app/app.ts))
- [ ] As a developer, I want `withArchivable` finished — either drop the unused `setArchived` or move the persist-then-patch archive flow into the feature — so the two consuming stores stop duplicating their `archiveX`/`unarchiveX` pairs (CR-7.4, [with-archivable.ts](../../src/app/shared/utils/with-archivable.ts))

## 8. Accessibility

- [ ] As a screen-reader user, I want the transaction row-selection checkboxes to have an accessible name (e.g. `aria-label` including the transaction description), so I know which row each checkbox selects (CR-8, [transactions-overview.component.html:114](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html))
- [ ] As a screen-reader user, I want the extracted `mm-modal` to wire `aria-labelledby` to the dialog title and restore focus to the trigger on close, so dialogs are properly announced and focus isn't lost (CR-8, depends on CR-7.1)
- [ ] As a screen-reader user, I want the trend chart's key numbers exposed in DOM text (even a visually-hidden table), matching the top-5 list beside the donut, so the dashboard's data is reachable without the canvas (CR-8)

## 9. Testing gaps

- [ ] As a developer, I want the `ImportService.undoImport` cross-import transfer-cleanup branch covered by a spec, so the surviving side never keeps a dangling `transferId` without a regression test catching it (CR-9, [import.service.spec.ts](../../src/app/core/import/import.service.spec.ts))
- [ ] As a developer, I want a spec pinning the `AccountsStore.removeAccount` cascade once CR-1.1 lands, so the cascade can't silently regress (CR-9)
- [ ] As a developer, I want the chosen `partitionByFingerprint` within-file duplicate semantics (CR-1.2) encoded as a test, so the decision is documented and enforced (CR-9)
- [ ] As a developer, I want new date formats added to the `csv-row-mapper` `parseDate`/`resolveAmount` spec tables before the parsers, so the highest-complexity pure functions grow test-first (CR-9)

---

## Quick wins summary

Carried over from the review's effort table for triage:

| Effort | Stories |
| --- | --- |
| ~10 lines | Debounce text filter (CR-2.4); sort rules once (CR-3.2); index `importBatchId` (CR-3.3); delete dead repo methods (CR-6.2); checkbox aria-labels (CR-8) |
| Small | Row view-model + `accountsById` map (CR-2.3); bulk writes (CR-3.1); slice-based CSV preview (CR-4.1); trim Dexie versions (CR-6.4) |
| Medium | Account-delete cascade (CR-1.1); 64-bit fingerprint + migration (CR-1.3); pagination/virtual scroll (CR-2.1); amount-bucketed transfer matching (CR-2.2); `mm-modal` extraction (CR-7.1); profile upsert (CR-1.6) |
| Larger | Hydrate-on-demand stores + bundle slimming (CR-3.4 / CR-5.1); stores to `core/state` (CR-6.1) |
