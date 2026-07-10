# Code Review 2 — Developer Experience, Maintainability & SOLID

Full-codebase review (2026-07-07) of `src/app` plus the project's docs/tooling, focused on **developer experience, maintainability, and coding conventions (SOLID)**. Sibling to the first review ([../code-review-optimizations.md](../code-review-optimizations.md), 2026-07-04), which covered correctness, performance, and bundle size — items already tracked there (CR-\*) or in the [code-review overview](../code-review/overview.md) (NG-\*) are cross-referenced, not re-raised. Section 6 adds a Fallow 3.2.0 static-analysis pass (dead code, duplication, complexity, hotspots) run against the manual findings, with every machine finding grep-verified before inclusion.

**Overall**: the codebase holds its own conventions remarkably well. Spot checks found *zero* violations of the mechanical rules — no `@Input()`/`*ngIf`/`interface`/`styleUrls`, no component or store touching `appDb` outside `core/`, no deep cross-feature imports outside the two documented exceptions, `OnPush` + signals everywhere, strict TS + `strictTemplates` on, and pure logic (`csv-row-mapper`, `rule-matching`, `transfer-matching`, `core/stats`) consistently extracted and spec-covered without `TestBed`. The items below are about the places where duplication, type erosion, and doc drift will start taxing future changes — not about broken code today.

Item IDs are `CR2-<section>.<n>` for traceability from [overview.md](./overview.md) and [tickets/](./tickets/).

---

## 1. Developer experience — docs & repo hygiene

### 1.2 Commit messages describe work that didn't happen

Recent history misleads `git log`/`git blame` archaeology:

- `80af6be` — *"feat: Add in-browser neural-net transaction categorizer with TensorFlow.js integration"* — the diff is one markdown file (`docs/v1.2_auto_categorise/auto-categorise.md`). There is no TensorFlow.js anywhere in `package.json` or `src/`.
- `1d97d49` — *"feat: Implement neutral category kind for partner contributions in joint accounts"* (plus four more "Implemented/Introduced/Enhanced" bullets) — the diff is folder renames and two link tweaks. None of the described behaviour exists in code.
- `ed99f72`, `ff99da6`, `ce1dd4c` — docs-only changes typed as `feat:`.

Anyone bisecting for "when did neutral categories land" or auditing bundle history will be sent down false trails. The repo already runs husky + lint-staged, so enforcing this is cheap: add commitlint (or at minimum agree that docs-only changes use `docs:` and message bodies describe the diff, not the aspiration). → story CR2-1.2

### 1.3 Version-folder naming drifted mid-scheme

`docs/` now mixes `v1.0_foundation`, `v1.1_joint_accounts`, `v1.2_auto_categorise` with plain `v2`, and review output lives in both `code-review/` and (now) `coding-review-2/`. Minor, but worth picking one scheme before v1.3 arrives — renames are exactly what caused 1.1. → folded into story CR2-1.2

---

## 2. Single Responsibility

### 2.1 `TransactionsOverviewComponent` is the app's one god component

[transactions-overview.component.ts](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) (366 lines + 243-line template) owns six distinct jobs: filter form + URL-param intake, debounced/structural filter pipeline, pagination wiring, row view-model join, multi-row selection + bulk category assignment, transfer link/unlink, and edit-dialog orchestration. It's the file every transactions-page change touches, and its spec has to stand up the whole world to test any one concern.

The internals are individually clean (the CR-2.x computeds are well-factored), so this is a seam extraction, not a rewrite:

- **Filter bar** → `app-transaction-filters` owning the form, debounce, and structural/text split, emitting one typed `TransactionFilters` value. The parent keeps only `filteredTransactions`.
- **Selection + bulk actions** → either an `app-transaction-bulk-bar` component or a small `createSelectionModel()` utility in `shared/utils` (the pattern `Set<number>` + toggle/all/clear/indeterminate is generic and will recur — e.g. rules or accounts bulk ops).

Coordinate with [TICKET-NG-02](../code-review/tickets/TICKET-NG-02-overview-input-binding.md) (query-param intake via `input()`), which shrinks the same file — do NG-02 first or together. → [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md)

### 2.2 `ImportWizardComponent` hand-rolls an async pipeline the framework already provides

[import-wizard.component.ts:81-115](../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) coordinates re-parsing with three manual mechanisms at once: a `parseToken` counter for staleness, a `reparseTimer` (`setTimeout`) for debounce, and an `effect()` that must remember to clear both plus reset four signals. The same four-signal reset appears (in overlapping subsets) in the effect's invalid branch (lines 96–103), `runCommit`'s next-file branch (184–188), and `startNewImport` (202–211) — three sites that can drift.

This is exactly the boundary the conventions call out for RxJS: `toObservable(fileAndMapping) → debounceTime → switchMap(parse) → toSignal` gets staleness (switchMap cancels), debounce, and the "parsing" flag declaratively, deleting the token/timer plumbing. Extract a single `resetParseState()` used by all three call sites either way. → [TICKET-SOLID-04](./tickets/TICKET-SOLID-04-wizard-declarative-reparse.md)

### 2.3 `ImportBatchesStore.commitImport` inlines data munging into orchestration

[import-batches.store.ts:40-59](../../src/app/feature-import/import-batches.store.ts) — the categoryId-merge (build map, re-map transactions) is a pure transform living inside the one method that also sequences three services/stores. Extract `applyCategoryUpdates(transactions, updates)` (trivially spec-able without TestBed). Minor; fold into the CR2-5.1 spec work. → story CR2-2.3

---

## 3. Open/Closed & type safety — the import domain is stringly-typed

### 3.1 `MappingProfile` erases its own unions, forcing casts downstream

[app-db.ts:113-118](../../src/app/core/data-access/app-db.ts) declares `signConvention: string`, `encoding: string`, `dateFormat: string`, `delimiter: string` — but the real domain is closed: `csv-row-mapper` defines `signConvention: 'as-is' | 'debit-negative' | 'credit-negative'` ([csv-row-mapper.ts:12-16](../../src/app/core/import/csv-row-mapper.ts)), and `parseDate` supports exactly three formats. The erosion shows up as casts at every hand-off:

- [csv-import.service.ts:19](../../src/app/core/import/csv-import.service.ts) — `mappingProfile.signConvention as CsvParseRequest['signConvention']`
- [import-wizard.component.ts:109](../../src/app/feature-import/components/import-wizard/import-wizard.component.ts) — `mapResult.mappingProfile as MappingProfile` (papering over `Omit<MappingProfile, 'id'>`; `CsvImportService.parse` never reads `id`, so per ISP it should just accept the `Omit` type)

Define the unions once (on the entity types in `app-db.ts`, since that's where `MappingProfile` lives) and let everything narrow from there. O/C payoff: adding a fourth sign convention becomes one union edit and the compiler finds every switch — today it's a grep-and-hope across `string`s, and a typo'd convention stored in Dexie fails silently as `as-is`.

### 3.2 Supported date formats live in two unlinked files

`DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']` in [import-map-step.component.ts:19](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) must stay manually in sync with `parseDate`'s `if/else` chain in [csv-row-mapper.ts:32-63](../../src/app/core/import/csv-row-mapper.ts). Add a format to the parser and the form won't offer it; add it to the form and every row silently parses to `null` (unparseable date). Same story for `ENCODINGS`. Export `SUPPORTED_DATE_FORMATS as const` from the mapper (derive the `DateFormat` type from it), have the form consume it, and turn `parseDate`'s chain into a lookup keyed by that union so an unknown format is a compile error rather than a silent `null`.

3.1 + 3.2 + the ISP fix are one small ticket. → [TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md)

### 3.3 Rule field/operator labels are declared twice in the same feature

[rule-form.component.ts:52-67](../../src/app/feature-categories/components/rule-form/rule-form.component.ts) (`fieldOptions`, `operatorLabels`) and [rule-summary.ts:3-18](../../src/app/feature-categories/rule-summary.ts) (`FIELD_LABELS`, `OPERATOR_LABELS`) each map the full `RuleCondition['field']`/`['operator']` unions to display strings. The field labels are character-identical duplicates; the operator labels have already drifted (`'matches regex'` vs `'matches'`, `'is greater than'` vs `'>'`) — possibly intentional (form verbosity vs summary compactness), but nothing records that intent. Centralise at least `FIELD_LABELS` in one feature-level module; if the operator split is deliberate, put both variants side by side in that module so the next editor sees them together. → story CR2-3.3

---

## 4. Dependency structure & duplication

### 4.1 The cross-feature store web is growing workarounds — new evidence for CR-6.1

The first review flagged the upward coupling (feature stores injecting other features' stores) as CR-6.1 ("promote entity stores to `core/state`"). Since then the cost has compounded:

- **DI-cycle dodge**: `AccountsStore` can't be injected by `TransactionsStore`, so TICKET-TRF-02 landed as a *push-down*: an `effect()` in `AccountsStore.onInit` ([accounts.store.ts:135-145](../../src/app/feature-accounts/accounts.store.ts)) feeding `TransactionsStore.setOwnSavingsIbans()` ([transactions.store.ts:56-58](../../src/app/feature-transactions/transactions.store.ts)) — manually re-implementing what a `computed()` would do if the dependency direction were allowed. Each future cross-store derivation on this axis needs another push-down pair.
- **Triplicated derivation**: `savingsAccountIbans(accounts)` is independently computed in that hook, in [transactions-overview.component.ts:159-161](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts), and in [stats.store.ts:38](../../src/app/feature-dashboard/stats.store.ts). One `ownSavingsIbans` computed on `AccountsStore` would serve the latter two today (they *can* inject it); the store-to-store copy only dies with CR-6.1.
- Two documented barrel exceptions already exist for this ([app.routes.ts:14](../../src/app/app.routes.ts), [feature-transactions/index.ts](../../src/app/feature-transactions/index.ts)), plus the uncommented deep imports in [app.config.ts:12-19](../../src/app/app.config.ts).

No new ticket — this review's recommendation is to **schedule CR-6.1** before the next cross-store feature, and as an interim one-liner add the `ownSavingsIbans` computed to `AccountsStore` for the two consumers that can reach it. → story CR2-4.1

### 4.2 The transfer-cleanup cascade is copy-pasted across two services

[import.service.ts:140-158](../../src/app/core/import/import.service.ts) (`undoImport`) and [account-deletion.service.ts:60-91](../../src/app/core/accounts/account-deletion.service.ts) (`cascadeTransactions`) contain the same ~25-line algorithm: collect `transferId`s off doomed transactions → fetch transfers → remove each → compute surviving side → clear its `transferId` → report `unlinkedTransferIds`/`clearedTransferTransactionIds`. `AccountDeletionService` was added *after* the first review, so this duplication is new — and it's the dangerous kind: subtle invariants (the "surviving side may also be doomed" check) that must stay identical in both copies. Extract one helper (e.g. `cleanupTransfersForRemovedTransactions(transactions)` in `core/transfers`, designed to run inside the caller's Dexie transaction, mirroring how `cascadeTransactions` documents that contract). Bonus: fixing CR-3.1's per-row writes then happens in one place. → [TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md)

### 4.3 Dead code: `DeleteAccountResult`

[account-deletion.service.ts:19](../../src/app/core/accounts/account-deletion.service.ts) — the `@deprecated` alias has zero consumers (grep-verified). Delete it; `git log` is the archive. → folded into TICKET-SOLID-03

### 4.4 Entity-store CRUD boilerplate — an *optional* consolidation

Five stores repeat the identical persist-then-patch quartet (`hydrate`/`addX`/`updateX`/`removeX`): accounts, categories, rules, mapping-profiles, import-batches. A `withPersistedCrud(repository, entityConfig)` signal-store feature (following the existing `withArchivable` precedent) would collapse ~30 lines per store and make "every write goes repo-first, then patchState" structurally enforced rather than conventional. **Trade-off, per the conventions' own warning against letter-satisfying boilerplate**: it adds a generic indirection to read through, and [TICKET-NG-04](../code-review/tickets/TICKET-NG-04-finish-with-archivable.md) shows a half-adopted store feature is worse than none. Recommendation: only do this if NG-04 lands cleanly and a sixth entity store appears; recorded here so the option is a decision, not a rediscovery. → story CR2-4.4

---

## 5. Testing gaps (DX: confidence to refactor)

### 5.1 The untested stores are exactly the orchestrators

Pure logic and half the stores are well covered, but the stores with the most coordination logic have no specs:

| Store | Untested behaviour that would hurt |
|---|---|
| [import-batches.store.ts](../../src/app/feature-import/import-batches.store.ts) | `commitImport` sequencing: rules run *before* rows land in the store; auto-link runs *after*; returned transactions carry merged categoryIds |
| [categories.store.ts](../../src/app/feature-categories/categories.store.ts) | `removeCategory` clears `categoryId` + `categoryManual` off affected transactions before deleting |
| [rules.store.ts](../../src/app/feature-categories/rules.store.ts) | `moveRule` priority swap (including the equal-priority edge: swapping two rules that share a priority is a silent no-op — pin whether that's intended), `createRuleFromCounterparty` backfill |
| [transfers.store.ts](../../src/app/feature-transactions/transfers.store.ts) | `link`/`unlink`/`runAutoLink` mirroring into `TransactionsStore.patchMany` |

These are precisely the files SOLID tickets in this review will touch — specs first makes every other item here safer. → [TICKET-TEST-01](./tickets/TICKET-TEST-01-orchestrator-store-specs.md)

---

## 6. Fallow static analysis — verification & new findings

Fallow 3.2.0 (`dead-code`, `dupes`, `health --hotspots --targets`, 2026-07-07) run over `src/app` (195 files, ~12.2k LOC). Headline vitals are healthy and corroborate the overall assessment: **0 unused files, 0 circular dependencies, 2.0% duplication, average maintainability 92.9, dead-export rate 2.1%**. Every finding below was manually verified (grep / read) before inclusion — the raw tool output contains a significant false-positive family, documented in 6.5 so future runs don't re-litigate it.

### 6.1 Fallow independently confirms three manual findings

- **`dup:bf6204a7`** — the transfer-cleanup cascade clone, [account-deletion.service.ts:61-84](../../src/app/core/accounts/account-deletion.service.ts) ↔ [import.service.ts:134-160](../../src/app/core/import/import.service.ts) = CR2-4.2, exactly the extraction scoped in [TICKET-SOLID-03](./tickets/TICKET-SOLID-03-extract-transfer-cleanup-cascade.md).
- **`dup:871c39b0` / `dup:5bb3d5e1` / `dup:9a2fd13a`** — the `<dialog>` open/close effect across the four form components = [TICKET-NG-01](../code-review/tickets/TICKET-NG-01-shared-mm-modal.md) (fingerprints already cited there).
- **Hotspots** (complexity × churn): [transactions-overview.component.ts](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) is the #1 hotspot at nearly double the runner-up (score 63.6, 10 commits; next: transactions.store 44.3, import-wizard 34.5) — hard churn evidence behind CR2-2.1 / [TICKET-SOLID-01](./tickets/TICKET-SOLID-01-split-transactions-overview.md)'s priority.

### 6.2 The app's most complex function is the transactions filter predicate

`health --complexity` ranks the filter callback inside `filteredTransactions` ([transactions-overview.component.ts:173](../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts)) **critical: cyclomatic 34, cognitive 45** — the only critical finding in the codebase, sitting inside the #1 hotspot. It's also pure decision logic (seven independent filter axes) trapped in a component `computed()`, i.e. untestable without TestBed. Extract a pure `matchesTransactionFilters(transaction, filters, ownSavingsIbans)` predicate — this has been added to TICKET-SOLID-01's acceptance criteria. The remaining high findings map onto existing items:

| Severity | Location | What / where it's already tracked |
|---|---|---|
| high (cyc 27 / cog 26) | [rule-form.component.ts:154](../../src/app/feature-categories/components/rule-form/rule-form.component.ts) | `resetForm`/patch region — shrinks naturally under NG-01's form-reset consolidation; no separate ticket |
| high (cyc 23 / cog 35) | [import-map-step.component.ts:144](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) | `updateResult`'s `\|\| undefined` column-mapping chains — becomes data-driven under [TICKET-SOLID-02](./tickets/TICKET-SOLID-02-type-import-domain.md) |
| high (cyc 16) | [csv-row-mapper.ts:32](../../src/app/core/import/csv-row-mapper.ts) | `parseDate`'s format `if/else` chain — the exact lookup-table refactor CR2-3.2 prescribes |
| high (cog 26 / cog 25) | transactions-overview + import-map-step **templates** | Template complexity; both shrink under SOLID-01 / SOLID-02 decompositions |

Refactoring targets agree: `csv-row-mapper.ts` (5 dependents) and `rule-matching.ts` (3 dependents) rank as "split high-impact" — consistent with keeping their pure functions small and closed (CR2-3.1/3.2).

### 6.3 New duplication finding: delete-confirm scaffolding (`dup:edd1ec44`)

[accounts-overview.component.ts:65-76](../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts) ↔ [categories-overview.component.ts:66-77](../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts): both hand-roll the same confirm-to-delete state machine around `mm-confirm-dialog` — `deleteConfirmOpen` + `deleteTarget` signals plus a `deleteMessage` computed (only the message copy differs). A third delete-with-confirmation (rules? transfers?) will clone it again. Extract a `createConfirmState<T>()` utility in `shared/utils` (same signal-utility precedent as `createPagination`/the planned `createSelectionModel`): `open`, `target`, `request(target)`, `confirm()`, `cancel()`, with the message staying a per-component computed over `target`. Small; grouped into [TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md)'s sibling story CR2-6.3 rather than its own ticket. → story CR2-6.3

### 6.4 Grep-verified dead code — and a stale item in the *first* review

Fallow flagged 33 raw issues; after manual verification the true positives are:

- **Un-export (used same-file, never imported):** `describeCondition` ([rule-summary.ts:20](../../src/app/feature-categories/rule-summary.ts)), `DEFAULT_TEXT_DEBOUNCE_MS` ([debounced-text.ts:7](../../src/app/shared/utils/debounced-text.ts)) — new; plus the already-tracked `AppDb` class and `RangeState` type (CR-6.3).
- **Delete (zero call sites):** `TransactionsRepository.add` / `.remove` ([transactions.repository.ts:13,22](../../src/app/core/data-access/transactions.repository.ts)), `MappingProfilesRepository.getByBankAndAccount` / `.remove` ([mapping-profiles.repository.ts:8,23](../../src/app/core/data-access/mapping-profiles.repository.ts)).
- **⚠️ Stale first-review item:** CR-6.2 lists `TransactionsRepository.getByAccount` as confirmed-unused, but it's now load-bearing — `AccountDeletionService.cascadeTransactions` ([account-deletion.service.ts:61](../../src/app/core/accounts/account-deletion.service.ts)) calls it. Whoever works CR-6.2 must **not** delete it; the CR-6.2 story text should be corrected.

→ [TICKET-CLEANUP-01](./tickets/TICKET-CLEANUP-01-fallow-verified-dead-code.md)

### 6.5 Known false positives (so the next Fallow run doesn't re-litigate them)

- **16 of 20 `unused-class-member` findings are wrong**: repository methods declared as arrow-function class properties and invoked through `inject(SomeRepository)` inside `signalStore(withMethods(...))` closures (e.g. `CategoriesRepository.getAll` — plainly called at [categories.store.ts:50](../../src/app/feature-categories/categories.store.ts)). Fallow's member tracking doesn't follow that pattern. Only the four members listed in 6.4 are genuinely dead.
- **`tailwindcss` flagged as dev-dependency-in-production**: triggered by the CSS `@import 'tailwindcss'`; it's a build-time PostCSS input, correctly a devDependency for an Angular app — no action.
- **8 `unused-component-input`/`output` findings** all point at the stub components inside [import-wizard.component.spec.ts](../../src/app/feature-import/components/import-wizard/import-wizard.component.spec.ts) — intentional test doubles; run with `--production` to exclude spec files.

If Fallow becomes a recurring verification step (the conventions' `SKILL.md` already lists it), a minimal `.fallowrc.json` codifying these (ignore spec stubs via `--production` usage, `ignoreDependencies: ["tailwindcss"]`) plus an identity baseline (`--save-baseline`) would make future runs report only *new* findings. Decision for the maintainer, not applied here.

---

## Effort / impact triage

| Effort | Items |
| --- | --- |
| ~10 lines | Fix stale doc paths (CR2-1.1); delete `DeleteAccountResult` (CR2-4.3); Fallow-verified dead code + correct stale CR-6.2 (CR2-6.4); `ownSavingsIbans` computed on AccountsStore (CR2-4.1 interim); centralise field labels (CR2-3.3) |
| Small | Type the import domain — unions + derived form options (CR2-3.1/3.2); extract transfer-cleanup helper (CR2-4.2); `createConfirmState` for delete-confirm scaffolding (CR2-6.3); commitlint (CR2-1.2); `applyCategoryUpdates` extraction (CR2-2.3) |
| Medium | Orchestrator store specs (CR2-5.1); declarative wizard reparse (CR2-2.2); split transactions overview incl. pure filter predicate (CR2-2.1 + CR2-6.2, after/with NG-02) |
| Decision, not work | Schedule CR-6.1 (CR2-4.1); `withPersistedCrud` yes/no (CR2-4.4); docs version-naming scheme (CR2-1.3); Fallow config + baseline for recurring runs (CR2-6.5) |
