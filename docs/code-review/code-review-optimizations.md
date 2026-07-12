# Code Review — Optimizations & Improvements

Full-codebase review (2026-07-04) covering `src/app` — stores, repositories, core services, components, and build setup. Static analysis (Fallow: complexity, duplication, dead code) was run alongside a manual read-through. Items are grouped by topic; within each topic the most impactful items come first.

Overall the codebase is in very good shape: standalone components with `OnPush` everywhere, signal-first state, pure and well-documented aggregation functions in `core/stats`, atomic Dexie transactions for multi-table writes, and solid spec coverage for pure logic. The items below are refinements, not rescues.

---

## 1. Correctness issues (fix before optimizing)

### 1.1 Deleting an account orphans its transactions
`AccountsStore.removeAccount` ([accounts.store.ts:84](../src/app/feature-accounts/accounts.store.ts)) only deletes the account row. But both delete confirmations promise more:

> "This account has N transactions. **Deleting it removes them too.**" — [accounts-detail.component.ts:59](../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.ts), [accounts-overview.component.ts:69](../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts)

After deletion, the transactions stay in Dexie and in `TransactionsStore` with a dangling `accountId` — they keep contributing to period stats, category breakdowns, and net worth (which now silently loses the account's `openingBalance` but keeps its transaction history). Fix: cascade inside one `appDb.transaction('rw', ...)` — delete the account's transactions, clean up any `Transfer` rows touching them (same logic as `ImportService.undoImport`), then delete the account, and mirror all of it into the stores.

### 1.2 Duplicate detection misses duplicates within a single import
`partitionByFingerprint` ([import.service.ts:36](../src/app/core/import/import.service.ts)) checks each row against fingerprints already in the DB, but never adds accepted fingerprints to the set as it goes. Consequences are inconsistent:

- Import a file where the same fingerprint appears twice → both rows are added.
- Re-import an overlapping export later → *both* of those rows now match the single stored fingerprint and both are dropped as duplicates.

Decide the intended semantics (identical same-day rows *can* be two legitimate transactions) and make both paths agree. A common approach: add an occurrence counter to the fingerprint key (`key|1`, `key|2` for the n-th identical row within an account+day), which makes dedupe stable across re-imports in both directions.

### 1.3 32-bit fingerprints will eventually collide
`computeFingerprint` ([fingerprint.ts:22](../src/app/shared/utils/fingerprint.ts)) hashes to 32 bits (FNV-1a). By the birthday bound, a ~10k-transaction account has roughly a 1% chance of a collision — and a collision silently drops a *real* transaction as a "duplicate" during import, which is the worst possible failure mode for a finance app (money disappears with no error). Cheap fix that keeps the same call sites: hash twice with two seeds (or FNV-64 via `BigInt`) and concatenate for a 64-bit fingerprint; the risk drops to negligible. Existing stored fingerprints can be migrated in a Dexie `.upgrade()` pass since the inputs are all still on the row.

### 1.4 Header detection ignores the profile's encoding
`ImportMapStepComponent.detectAndPrefill` ([import-map-step.component.ts:81](../src/app/feature-import/components/import-map-step/import-map-step.component.ts)) and `ImportSelectStepComponent.detectAccountId` decode the sample with `utf-8` even though both seeded bank presets declare `windows-1252`. Any header containing an accented character (é, ü, …) decodes to replacement characters, so `matchTemplateForHeaders` fails and auto-detection silently degrades to "Custom mapping". Detect once per candidate encoding, or normalize headers with accents stripped before comparing.

### 1.5 `detectionStarted` guard makes re-detection impossible
The `effect` in `ImportMapStepComponent`'s constructor ([import-map-step.component.ts:70](../src/app/feature-import/components/import-map-step/import-map-step.component.ts)) sets `detectionStarted = true` after the first file. This only works because the wizard happens to destroy/recreate the step component between files; if the template ever changes to keep the component alive (e.g. swapping `@if` for `[hidden]`), file 2+ silently keeps file 1's mapping. Make the effect react to the file itself (track the last-detected `File` reference and re-run when it changes) so correctness doesn't depend on the parent's DOM structure.

### 1.6 Every committed import inserts a new mapping profile row
`ImportWizardComponent.runCommit` ([import-wizard.component.ts:115](../src/app/feature-import/components/import-wizard/import-wizard.component.ts)) unconditionally calls `mappingProfilesStore.addProfile(...)` per file. Ten imports = ten near-identical `mappingProfiles` rows, and `findForBankAndAccount` returns whichever `.find()` hits first, so edits to a remembered mapping may appear not to stick. Only persist when `rememberForAccount` is set, and *upsert* (update the existing bank+account profile if one exists) instead of always adding. For not-remembered imports, `ImportBatch.mappingProfileId` could reference the bank template that was used, or allow `undefined`.

---

## 2. Rendering performance

### 2.1 Transactions table renders every filtered row
[transactions-overview.component.html:111](../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html) `@for`s over the full `filteredTransactions()` — with a few years of data that's thousands of `<tr>`s with buttons, badges, and icons each, re-created on every filter keystroke. This is the single biggest UI perf lever in the app. Options, cheapest first:

- Paginate (daisyUI has join/pagination primitives; 50–100 rows per page).
- `CdkVirtualScrollViewport` (`@angular/cdk/scrolling`) if an unbroken scroll is preferred — note CDK would be a new dependency; it's tree-shakeable and lands only in this lazy route.

### 2.2 O(n²) transfer matching runs inside a `computed()` on the transactions page
`TransferReviewComponent.ambiguousCandidates` ([transfer-review.component.ts:34](../src/app/feature-transactions/components/transfer-review/transfer-review.component.ts)) calls `resolveTransferMatches` over *all* transactions on every transactions-store change — and `findMediumConfidenceMatches` ([transfer-matching.ts:89](../src/app/core/transfers/transfer-matching.ts)) builds candidate lists via `remaining.filter(...)` inside a map over `remaining`, i.e. O(n²) pair scans (10k unlinked transactions → 100M comparisons, on the UI thread, per edit). Two independent fixes:

- **Algorithmic:** bucket transactions by `Math.abs(amount)` in a `Map<number, Transaction[]>` first; candidate pairs can only come from the same bucket, which drops the practical cost to near-linear. Same trick applies to `findHighConfidenceMatches`.
- **Reactive:** the ambiguous-candidates list only changes when transactions/settings change *and* the section is visible — consider computing it lazily (behind an expand toggle) or in the existing worker if datasets grow.

### 2.3 Method calls in row templates
The transactions table calls `accountName(...)`, `categoryFor(...)`, and `isSelected(...)` per row on every change-detection pass ([transactions-overview.component.ts:203](../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)). `accountName` is worst — a linear `.find()` over accounts per row. Precompute a row view-model in the existing `filteredTransactions` computed (or a second computed over it) that joins account name, category, transfer, `isLikelyTransfer`, and `isSelected` once per data change:

```ts
protected readonly rows = computed(() => {
  const accountsById = this.accountsStore.accountsById(); // new Map computed
  const categoriesById = this.categoriesStore.categoriesById();
  const transferByTxId = this.transfersStore.transferByTransactionId();
  const selected = this.selectedIds();
  return this.filteredTransactions().map((t) => ({
    transaction: t,
    accountName: accountsById.get(t.accountId)?.name ?? '—',
    category: t.categoryId != null ? categoriesById.get(t.categoryId) : undefined,
    transfer: transferByTxId.get(t.id!),
    selected: selected.has(t.id!),
  }));
});
```

An `accountsById` Map computed on `AccountsStore` would also replace the `.find()` in `TransferReviewComponent.accountName` and `AccountsDetailComponent.account`.

### 2.4 Debounce the free-text filter
`filters` is `toSignal(this.filterForm.valueChanges)` ([transactions-overview.component.ts:79](../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)), so every keystroke in the search box re-filters and re-sorts the whole dataset and re-renders the table. Pipe `valueChanges` through `debounceTime(150)` (and keep `initialValue`) before `toSignal` — one line, large payoff together with 2.1.

### 2.5 `category-breakdown-panel` method calls feeding ECharts
`chartOption` calls `categoryName`/`categoryColor` per entry ([category-breakdown-panel.component.ts:39](../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts)) — fine at 20 categories, but the same join-in-a-computed pattern as 2.3 would keep the template method-free and consistent with the rest of the review.

---

## 3. Data-layer & algorithmic efficiency

### 3.1 N sequential writes where one bulk write would do
Several hot paths issue one IndexedDB round-trip per row:

- `RulesEngineService.runAndPersist` ([rules-engine.service.ts:33](../src/app/core/categorisation/rules-engine.service.ts)): `Promise.all` of individual `update()` calls — after an import or "run rules", this can be hundreds of writes. Dexie has `Table.bulkUpdate(keysAndChanges)`; alternatively wrap in one `appDb.transaction` so it's at least a single transaction commit.
- `TransferMatchingService.runAndPersist` ([transfer-matching.service.ts:29](../src/app/core/transfers/transfer-matching.service.ts)): awaits `linkAuto` in a loop — each link opens its own `rw` transaction (3 writes each). Batch all auto-links into a single transaction: `bulkAdd` the transfers (`allKeys: true`), then `bulkUpdate` the 2n transactions.
- `CategoriesStore.removeCategory` ([categories.store.ts:71](../src/app/feature-categories/categories.store.ts)): `Promise.all` of `updateTransaction` per affected row — each of which also triggers a separate store patch. One `bulkUpdate` + one `patchMany` keeps both the DB and signal-graph work O(1) in the number of writes.

### 3.2 `resolveCategoryForTransaction` re-sorts rules per transaction
[rule-matching.ts:63](../src/app/core/categorisation/rule-matching.ts) filters + sorts the rule list for *every* transaction, so `applyToTransactions` is O(t · r log r) and re-allocates two arrays per row. Sort once in the caller (or accept pre-sorted rules and let `RulesEngineService` prepare them). Same idea: `regex` conditions re-compile `new RegExp` per transaction — compiling once per rule evaluation run would help large "run rules" passes.

### 3.3 `getByImportBatch` is a full-table scan
Acknowledged in the comment at [transactions.repository.ts:21](../src/app/core/data-access/transactions.repository.ts). Schema changes are additive here, so add a `version(4)` with `importBatchId` in the transactions index list — undo-import then becomes an indexed lookup. (Dexie only needs the *changed* table re-declared in a new version, which also applies to 6.4 below.)

### 3.4 Blocking bootstrap on hydrating everything
`provideAppInitializer` ([app.config.ts:24](../src/app/app.config.ts)) awaits hydration of all eight stores — including the full transactions table — before first paint. Fine at 1k rows; at 50k the app shows a blank screen while Dexie streams megabytes into signals. Consider:

- Hydrate only the stores the landing route needs (accounts, settings, categories) in the initializer, and kick off transactions/transfers hydration *without* awaiting it, exposing a `hydrated` signal that data-heavy pages gate on (`@if (transactionsStore.hydrated()) { ... } @else { skeleton }`).
- This also unblocks 5.1 (bundle) — the initializer is the reason every store is in the initial chunk.

### 3.5 `AccountsStore` walks all transactions twice
`transactionTotalsByAccountId` and `transactionCountById` ([accounts.store.ts:27](../src/app/feature-accounts/accounts.store.ts)) each loop the full transaction list; they invalidate together, so one computed producing `Map<number, { total, count }>` halves the work and keeps one source of truth.

---

## 4. CSV import pipeline

### 4.1 The file is read and decoded up to four times
For a single import, `detectAccountId` (select step), `detectHeaders` + `previewRawRows` (map step), and `parse` (preview step) each call `file.arrayBuffer()` and decode the *entire* file — and `previewRawRows` decodes everything to look at 6 rows ([csv-import.service.ts](../src/app/core/import/csv-import.service.ts)). Improvements:

- For header/preview paths, decode only a slice (`file.slice(0, 64 * 1024)`) — Papa with `preview: n` never needs the rest.
- Cache the decoded text per `(File, encoding)` in the service for the duration of the wizard.

### 4.2 Ship the bytes, not the string, to the worker
`parse` decodes the whole file on the **main thread**, then `postMessage`s the string (structured clone of potentially many MB) to the worker ([csv-import.service.ts:8](../src/app/core/import/csv-import.service.ts)). Post the `ArrayBuffer` as a transferable (`worker.postMessage(request, [buffer])`) and run `TextDecoder` inside the worker — zero-copy handoff and the decode cost moves off the UI thread too.

### 4.3 Duplicate-row keying by header name loses duplicate columns
The worker builds `Record<string, string>` rows keyed by header ([csv-parse.worker.ts:19](../src/app/core/import/csv-parse.worker.ts)); if a bank export repeats a header name (it happens), the later column silently wins. Keying rows by column *index* internally (and letting the mapping store indices) would be more robust — low priority until a real bank file hits it.

---

## 5. Bundle size & startup

### 5.1 Lazy routes, eager feature code
Every feature store (and everything it imports — repositories, `ImportService`, `RulesEngineService`, transfer matching, the `@ngrx/signals` entity adapters) is imported by [app.config.ts](../src/app/app.config.ts), so it all lands in the **initial** bundle; the lazy `loadChildren` routes only defer templates/components. Given the standing constraint to solve size problems with lazy-loading rather than budget bumps, the structural fix is the one in 3.4: stop referencing all stores from the initializer. Stores are `providedIn: 'root'`, so each lazy route that injects one pulls it into *its* chunk automatically; hydration can move into the stores themselves (hydrate-on-first-injection via an `onInit` hook or a lazy `hydrated` promise) instead of a central list that hard-wires the world into `main.js`.

### 5.2 Wins already in place (keep them)
Tree-shaken ECharts registration behind the lazy dashboard route ([echarts-setup.ts](../src/app/feature-dashboard/echarts-setup.ts)), the deliberate non-barrel import in [app.ts:24](../src/app/app.ts) with its explanatory comment, and per-component `provideIcons` instead of a global icon registry are all exactly right.

### 5.3 Consider `@defer` for below-fold dashboard panels
The trend chart and category donut are below the header/strip on smaller screens; `@defer (on viewport)` around those panels would push ngx-echarts + echarts core out of the dashboard chunk's critical path. Minor, since the route is already lazy.

---

## 6. Architecture & dead code

### 6.1 Cross-feature store coupling runs "upward"
`AccountsStore` and `CategoriesStore` (features) inject `TransactionsStore` from *another* feature for balances/counts, which already forced the barrel-avoidance workaround documented in [app.routes.ts:14](../src/app/app.routes.ts). Since all these stores are effectively app-wide singletons hydrated at bootstrap, consider promoting the entity stores to `core/state/` (or a `shared/data-access` tier) and keeping `feature-*` for components/routes only. That dissolves the circular-import hazard class instead of dodging it per-case, and matches how `StatsStore` already had to justify its placement.

### 6.2 Dead repository methods
Confirmed unused (Fallow + grep):

- `TransactionsRepository.getByAccount`, `.add`, `.remove` ([transactions.repository.ts](../src/app/core/data-access/transactions.repository.ts))
- `MappingProfilesRepository.getByBankAndAccount` ([mapping-profiles.repository.ts:8](../src/app/core/data-access/mapping-profiles.repository.ts)) — superseded by the store-side `findForBankAndAccount`
- `MappingProfilesRepository.update` / `.remove` — no UI manages profiles yet; delete or keep deliberately for the planned mapping-profiles UI, but decide.

Deleting them is cheap and keeps the repository surface honest about what the app actually does.

### 6.3 Unused exports
`AppDb` (the class) is exported from [app-db.ts:285](../src/app/core/data-access/app-db.ts) but only the `appDb` instance is consumed — un-export the class. `RangeState` ([range-state.store.ts:4](../src/app/core/stats/range-state.store.ts)) is exported but only used in-file.

### 6.4 Dexie version declarations repeat the full schema
Versions 2 and 3 ([app-db.ts:308](../src/app/core/data-access/app-db.ts)) re-declare every table verbatim; Dexie carries unchanged tables forward, so each new version only needs the tables it changes (v2: just `transferSettings`; v3: none — an upgrade-only version can pass `{}`). Trimming keeps future diffs reviewable and removes the risk of a version accidentally *changing* a table while "copying" it.

---

## 7. Angular patterns

### 7.1 Extract the repeated `<dialog>` open/close effect
The same constructor effect (open → `resetForm()` + `showModal()`, close → `close()`) appears in `account-form`, `category-form`, `rule-form`, and `transaction-edit-form` (Fallow duplication groups `dup:871c39b0` / `dup:5bb3d5e1`). Extract a shared `mm-modal` component in `shared/ui` (owning the `<dialog>` element, a `model<boolean>('open')`, backdrop/Escape handling) or at minimum a `syncDialogWithSignal(dialogRef, open, onOpen)` utility in `shared/utils`. This also centralizes a11y (focus trap, `aria-modal`) in one place. The archived-toggle + delete-message block duplicated between `accounts-overview` and `categories-overview` (`dup:edd1ec44`) is a smaller candidate for the same treatment.

### 7.2 Bind query params via inputs instead of `ActivatedRoute` snapshots
`withComponentInputBinding()` is already enabled, but `TransactionsOverviewComponent` reads `route.snapshot.queryParamMap` manually ([transactions-overview.component.ts:67](../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)). `input()` bindings for `from`/`to`/`categoryId`/`accountId` would be less code and would also react if the app ever navigates to the same route with new params (the snapshot version silently won't).

### 7.3 URL-mirroring effect can ping-pong
The `effect` in [app.ts:80](../src/app/app.ts) navigates on every range change with `queryParamsHandling: 'merge'`. It works today because nothing routes back into `RangeStore` after init, but it will fire (and schedule a navigation) even when the params already match — e.g. right after the initial read-in. Cheap hardening: compare against `route.snapshot.queryParamMap` and skip the `navigate` when nothing changed.

### 7.4 `withArchivable` is a nice pattern — finish the job
The custom `signalStoreFeature` ([with-archivable.ts](../src/app/shared/utils/with-archivable.ts)) is well done, but its `setArchived` method is unused: both consuming stores implement archive/unarchive via `updateAccount`/`updateCategory` instead (which is *better*, since it persists). Either drop `setArchived` or move the persist-then-patch archive flow into the feature so both stores stop duplicating their `archiveX`/`unarchiveX` method pairs.

---

## 8. Accessibility

- The row-selection checkboxes in the transactions table have no accessible name ([transactions-overview.component.html:114](../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html)) — add `[attr.aria-label]="'Select transaction ' + transaction.rawDescription"` or a visually-hidden label.
- Native `<dialog>` via `showModal()` gives focus containment for free (good choice). When extracting `mm-modal` (7.1), add `aria-labelledby` wiring to the dialog title and restore focus to the trigger on close.
- Chart panels are canvas-only; the top-5 list next to the donut already covers the data in DOM text — do the same for the trend chart (even a visually-hidden table) so the dashboard's key numbers are screen-reader reachable.

---

## 9. Testing gaps

Pure-logic coverage (fingerprint, rule matching, date buckets, transfer matching, stats) is strong. The thinnest spots found:

- **`ImportService.undoImport`** — the cross-import transfer-cleanup branch (surviving side keeps no dangling `transferId`) is exactly the kind of logic that regresses silently; `import.service.spec.ts` exists but verify this path is covered.
- **`AccountsStore.removeAccount` cascade** — once 1.1 is fixed, pin it with a spec.
- **`partitionByFingerprint` within-file duplicates** — encode whichever semantics you choose in 1.2 as a test.
- **`csv-row-mapper` `parseDate`/`resolveAmount`** are the highest-complexity pure functions in the repo (Fallow: cyclomatic 16/12) — they have specs; when adding date formats, prefer extending the spec table before the parser.

---

## 10. Quick wins summary

| Effort | Item |
| --- | --- |
| ~10 lines | Debounce text filter (2.4); sort rules once (3.2); index `importBatchId` (3.3); delete dead repo methods (6.2); checkbox aria-labels (8) |
| Small | Row view-model computed + `accountsById` map (2.3); bulk writes in rules/transfer/category paths (3.1); slice-based CSV preview (4.1); trim Dexie version decls (6.4) |
| Medium | Account-delete cascade (1.1); 64-bit fingerprint + migration (1.3); pagination or virtual scroll (2.1); amount-bucketed transfer matching (2.2); `mm-modal` extraction (7.1); profile upsert instead of add-per-import (1.6) |
| Larger | Hydrate-on-demand stores + initial-bundle slimming (3.4 / 5.1); stores to `core/state` (6.1) |
