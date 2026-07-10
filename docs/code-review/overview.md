# Money Mosaic — Code Review Backlog (Overview)

Derived from [../code-review-optimizations.md](../code-review-optimizations.md) (full-codebase review, 2026-07-04). Sibling to the [v1 build checklist](../v1.0_foundation/overview.md): those stories deliver features; these are the refinements, correctness fixes, and performance work the review surfaced. The review's item numbers (e.g. CR-1.1) are kept in parentheses for traceability back to the review doc. Most items here were fixed directly (no separate ticket file — the review item number plus the code link is the record); only four items got full tickets. Each ticketed line links to a `tickets/TICKET-*.md` file carrying its own user story, description, as-is/to-be, and acceptance criteria.

The list below is in build/recommended order, not grouped by review section: correctness first ("fix before optimizing"), then rendering performance and the Angular-patterns cleanups (all shipped), then the remaining open work ordered by size/dependency.

- [x] Cascade account deletion to its transactions and transfer links, atomically (CR-1.1, [accounts.store.ts:84](../../src/app/feature-accounts/accounts.store.ts))
- [x] Consistent duplicate detection within one file and across re-imports (occurrence counter on the fingerprint key) (CR-1.2, [import.service.ts:36](../../src/app/core/import/import.service.ts))
- [x] Widen transaction fingerprints to 64 bits with a Dexie `.upgrade()` migration (CR-1.3, [fingerprint.ts:22](../../src/app/shared/utils/fingerprint.ts))
- [x] Header auto-detection honours each preset's declared encoding (e.g. `windows-1252`) (CR-1.4, [import-map-step.component.ts:81](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts))
- [x] Map-step detection effect reacts to the file reference itself, not a one-shot guard (CR-1.5, [import-map-step.component.ts:70](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts))
- [x] Remembered mapping upserts one profile per bank+account (CR-1.6, [import-wizard.component.ts:115](../../src/app/feature-import/components/import-wizard/import-wizard.component.ts))
- [x] Stop rendering every filtered row at once — pagination or CDK virtual scroll (CR-2.1, [transactions-overview.component.html:111](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html); overlaps v1 NFR-PERF-1)
- [x] Bucket transfer matching by absolute amount (near-linear), computed lazily only when visible (CR-2.2, [transfer-review.component.ts:34](../../src/app/feature-transactions/components/transfer-review/transfer-review.component.ts), [transfer-matching.ts:89](../../src/app/core/transfers/transfer-matching.ts))
- [x] Row view-model computed joins account/category/transfer/selected once per data change (CR-2.3, [transactions-overview.component.ts:203](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts))
- [x] Debounce the free-text transaction filter (~150ms) (CR-2.4, [transactions-overview.component.ts:79](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts))
- [x] Category-breakdown chart joins name/colour in a computed, not per-entry template methods (CR-2.5, [category-breakdown-panel.component.ts:39](../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts))
- [x] [TICKET-NG-01](./tickets/TICKET-NG-01-shared-mm-modal.md) — Extract a shared `mm-modal` component for the repeated dialog open/close effect (CR-7.1; Fallow `dup:871c39b0`/`dup:5bb3d5e1`)
- [x] [TICKET-NG-02](./tickets/TICKET-NG-02-overview-input-binding.md) — Bind transactions filters via `input()` instead of route snapshot (CR-7.2)
- [x] [TICKET-NG-03](./tickets/TICKET-NG-03-url-mirror-skip-noop.md) — Skip redundant navigations in the URL-mirroring effect (CR-7.3)
- [x] [TICKET-NG-04](./tickets/TICKET-NG-04-finish-with-archivable.md) — Finish `withArchivable` — drop dead `setArchived` or fold the flow in (CR-7.4)
- [ ] Sort rules and compile regexes once per "run rules" pass, not per transaction (CR-3.2, [rule-matching.ts:63](../../src/app/core/categorisation/rule-matching.ts)) — small, independent
- [ ] Index `importBatchId` on transactions (new Dexie `version(4)`) so undo-import isn't a full-table scan (CR-3.3, [transactions.repository.ts:21](../../src/app/core/data-access/transactions.repository.ts)) — small, independent
- [ ] Remove confirmed-unused repository methods (CR-6.2, [transactions.repository.ts](../../src/app/core/data-access/transactions.repository.ts), [mapping-profiles.repository.ts:8](../../src/app/core/data-access/mapping-profiles.repository.ts)) — small, independent — **[Corrected 2026-07-07, see TICKET-CLEANUP-01 in the coding-review-2 backlog]:** `getByAccount` is no longer unused, do not remove it
- [ ] Un-export unused exports — `AppDb` class, `RangeState` type (CR-6.3) — small, independent
- [ ] Dexie version declarations only re-declare the tables they change (CR-6.4, [app-db.ts:308](../../src/app/core/data-access/app-db.ts)) — small, independent
- [ ] Transaction row-selection checkboxes need an accessible name (CR-8, [transactions-overview.component.html:114](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html)) — small, independent
- [ ] Batch hot write paths into single bulk transactions — rules persistence, transfer auto-linking, category removal (CR-3.1, [rules-engine.service.ts:33](../../src/app/core/categorisation/rules-engine.service.ts), [transfer-matching.service.ts:29](../../src/app/core/transfers/transfer-matching.service.ts), [categories.store.ts:71](../../src/app/feature-categories/categories.store.ts))
- [ ] Decode the file once — slice to the first ~64KB for header/preview, cache per `(File, encoding)` (CR-4.1, [csv-import.service.ts](../../src/app/core/import/csv-import.service.ts))
- [ ] Spec the `ImportService.undoImport` cross-import transfer-cleanup branch (CR-9, [import.service.spec.ts](../../src/app/core/import/import.service.spec.ts)) — test-only, can land any time
- [ ] Spec pinning the `AccountsStore.removeAccount` cascade now that CR-1.1 has shipped (CR-9) — test-only, can land any time
- [ ] Encode the chosen `partitionByFingerprint` within-file duplicate semantics (CR-1.2) as a test (CR-9) — test-only, can land any time
- [ ] Add new date formats to the `csv-row-mapper` `parseDate`/`resolveAmount` spec tables test-first (CR-9) — test-only, can land any time
- [ ] Hydrate only what the landing route needs; stream transactions/transfers behind a `hydrated` signal (CR-3.4, [app.config.ts:24](../../src/app/app.config.ts))
- [ ] Hydrate feature stores on first injection rather than from a central initializer (CR-5.1, builds on CR-3.4, [app.config.ts](../../src/app/app.config.ts)) — needs CR-3.4
- [ ] Transfer raw bytes to the worker and decode there, off the main thread (CR-4.2, [csv-import.service.ts:8](../../src/app/core/import/csv-import.service.ts))
- [ ] Worker keys rows by column index rather than header name (CR-4.3, low priority, [csv-parse.worker.ts:19](../../src/app/core/import/csv-parse.worker.ts))
- [ ] Keep existing bundle wins intact — tree-shaken ECharts, non-barrel import in `app.ts`, per-component `provideIcons` (CR-5.2)
- [ ] Wrap below-fold dashboard panels in `@defer (on viewport)` (CR-5.3, minor)
- [ ] Promote app-wide entity stores to `core/state/` (or a `shared/data-access` tier); `feature-*` holds only components/routes (CR-6.1, [app.routes.ts:14](../../src/app/app.routes.ts)) — largest remaining item, do last so the smaller store-touching items above aren't rebased on top of a store relocation mid-flight
- [ ] Extracted `mm-modal` wires `aria-labelledby` to the dialog title and restores focus to the trigger on close (CR-8, depends on CR-7.1 which has shipped)
- [ ] Trend chart's key numbers exposed in DOM text (even a visually-hidden table) (CR-8)

---

## Quick wins summary

Carried over from the review's effort table for triage:

| Effort | Stories |
| --- | --- |
| ~10 lines | Debounce text filter (CR-2.4); sort rules once (CR-3.2); index `importBatchId` (CR-3.3); delete dead repo methods (CR-6.2); checkbox aria-labels (CR-8) |
| Small | Row view-model + `accountsById` map (CR-2.3); bulk writes (CR-3.1); slice-based CSV preview (CR-4.1); trim Dexie versions (CR-6.4) |
| Medium | Account-delete cascade (CR-1.1); 64-bit fingerprint + migration (CR-1.3); pagination/virtual scroll (CR-2.1); amount-bucketed transfer matching (CR-2.2); `mm-modal` extraction (CR-7.1); profile upsert (CR-1.6) |
| Larger | Hydrate-on-demand stores + bundle slimming (CR-3.4 / CR-5.1); stores to `core/state` (CR-6.1) |

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. Dexie schema changes stay additive; the production bundle budget in `angular.json` is never raised.
