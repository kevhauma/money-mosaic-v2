# TICKET-ML-07 — `CategoryModelStore`: status machine, train/predict/accept flows

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-7 (new); reuses FR-CAT-2 (`createRuleFromCounterparty`) and the existing `bulkAssignCategory`

## User story

As a user, I want to see which of my uncategorised transactions the app has a suggestion for, train or
retrain the model when I want to, and accept a suggestion or a proposed rule in one click, so getting to
"fully categorised" takes far less manual work.

## Description

The `@ngrx/signals` root store that ties everything together: it hydrates a previously trained model on
app start, exposes `train()`/`refreshSuggestions()`/`acceptSuggestion()`/`acceptProposal()`/dismiss actions,
and tracks a small status machine (`untrained | not-enough-data | training | ready | stale | error`). It
never writes to `appDb` directly and never sets a category itself — accepting always delegates to the
existing `TransactionsStore`/`RulesStore` methods.

## Current situation (as-is)

- [transactions.store.ts](../../../src/app/feature-transactions/transactions.store.ts) already exposes
  `uncategorisedTransactions`/`uncategorisedCount` (computed signals) and `bulkAssignCategory(ids,
  categoryId)` (line 102) — sets the category and, per FR-CAT rules, marks it manually assigned.
- [rules.store.ts](../../../src/app/feature-categories/rules.store.ts) already exposes
  `createRuleFromCounterparty` (line 87) — this ticket's `acceptProposal` calls it directly rather than
  building rules itself.
- [categories.store.ts](../../../src/app/feature-categories/categories.store.ts) exposes the active
  category list this ticket's `taxonomySignature` (ML-01) call needs.
- No `CategoryModelStore` exists yet; no app-start initializer hydrates a persisted model.

## Desired result (to-be)

- New `feature-categories/category-model.store.ts` (`@ngrx/signals`, `providedIn: 'root'`), injecting
  `CategoryModelService` (ML-06), `CategoryModelRepository` (ML-04), `TransactionsStore`, `CategoriesStore`,
  `RulesStore`.
- State: `status: 'untrained' | 'not-enough-data' | 'training' | 'ready' | 'stale' | 'error'`, `metrics`,
  `lastTrainedAt`, `categoryIdByIndex`, `suggestions: Map<number, { categoryId: number; confidence: number }>`
  (keyed by transaction id), `ruleProposals: RuleProposal[]`.
- `hydrate()` (called from an app-start initializer, e.g. `app.config.ts`'s `provideAppInitializer`):
  loads the persisted artifact via the repository; no row ⇒ `status = 'untrained'`; a row exists ⇒ compare
  its `taxonomySignature` against `taxonomySignature(activeCategories())` (ML-01) — match ⇒ `'ready'`,
  mismatch ⇒ `'stale'`; either way calls `service.init(artifacts, featureConfig)`, and if `'ready'`, calls
  `refreshSuggestions()`.
- `train()`: builds labeled samples from `TransactionsStore`'s categorised transactions restricted to
  active categories; **cold-start guard** — fewer than `MIN_TRAINING_LABELS` labels or fewer than
  `MIN_CATEGORIES` active categories (both from ML-01) ⇒ sets `status = 'not-enough-data'` and returns
  without calling the worker; otherwise `status = 'training'` → `service.train(...)` → on success, persists
  the returned artifacts via the repository (including the current `taxonomySignature`) → `status =
  'ready'` → `refreshSuggestions()`; on failure, `status = 'error'`.
- `refreshSuggestions()` (no-op unless `status === 'ready'`): calls `service.predict(...)` over
  `TransactionsStore.uncategorisedTransactions()`, maps each result's index back to a `categoryId` via
  `categoryIdByIndex`, populates `suggestions`; then calls `mineRuleProposals` (ML-03) with those
  predictions, the transaction map, and `RulesStore`'s enabled rules, populating `ruleProposals`.
- `acceptSuggestion(transactionId)`: calls `TransactionsStore.bulkAssignCategory([transactionId],
  suggestion.categoryId)`, then removes that id from `suggestions`.
- `acceptProposal(proposal)`: calls `RulesStore.createRuleFromCounterparty(sampleTransaction, categoryId)`,
  then removes the proposal from `ruleProposals` and re-runs rule matching implicitly on the next
  `refreshSuggestions()`.
- `dismissSuggestion(transactionId)` / `dismissProposal(proposal)`: local-only removal from the respective
  signal, no persistence.
- Retraining is **user-initiated only** (a "Train model"/"Retrain" action the UI, ML-10, calls) — no
  automatic retrain-on-N-labels in this ticket (see version overview's deferred list).
- Store exported through [feature-categories/index.ts](../../../src/app/feature-categories/index.ts).

## Acceptance criteria

- [x] `hydrate()` sets `'untrained'` when no artifact is persisted, `'ready'` when the persisted signature matches the current active categories, `'stale'` when it doesn't — and calls `refreshSuggestions()` only in the `'ready'` case.
- [x] `train()` sets `'not-enough-data'` (without invoking `service.train`) when labeled samples are below `MIN_TRAINING_LABELS` or active categories are below `MIN_CATEGORIES`.
- [x] A successful `train()` persists artifacts via `CategoryModelRepository`, transitions `training → ready`, and triggers `refreshSuggestions()`.
- [x] A failed `train()` (service rejects) transitions to `'error'` without leaving `status` stuck at `'training'`.
- [x] `refreshSuggestions()` is a no-op (does not call `service.predict`) when `status !== 'ready'`.
- [x] `acceptSuggestion` calls `TransactionsStore.bulkAssignCategory` with exactly `[transactionId]` and the suggested `categoryId`, and never calls `appDb` or any repository directly.
- [x] `acceptProposal` calls `RulesStore.createRuleFromCounterparty` with the proposal's sample transaction and category, and never constructs a `Rule` object itself.
- [x] `dismissSuggestion`/`dismissProposal` mutate only local store state — no repository or worker call.
- [x] The store never calls `TransactionsStore.bulkAssignCategory` or any category-setting method except in direct response to `acceptSuggestion`/`acceptProposal` — no automatic/silent category assignment anywhere.
- [x] Unit tests use a **fake `CategoryModelService`** (canned `init`/`train`/`predict` responses, no real tfjs) and a fake/in-memory `CategoryModelRepository`, covering: hydrate's three branches, the cold-start guard, the training success/failure transitions, suggestion mapping via `categoryIdByIndex`, and that accept/dismiss flows delegate correctly and never touch `appDb`.
- [x] No TestBed dependency on `@tensorflow/*` anywhere in this ticket's tests — the worker is fully faked.
- [x] `CategoryModelStore` is never imported back by `TransactionsStore`, `CategoriesStore`, or `RulesStore` (one-directional dependency, checked via the fallow skill's boundary check).
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- The **suggest-only, never-auto-apply** rule lives entirely in this ticket's accept flows: a suggestion or
  proposal only ever changes state after an explicit `acceptSuggestion`/`acceptProposal` call, both of which
  route through the same existing, already-audited category-assignment paths
  (`bulkAssignCategory`/`createRuleFromCounterparty`) — no new category-writing code path is introduced.
- `hydrate()`'s app-start wiring (`provideAppInitializer` in `app.config.ts`) is part of this ticket, not a
  separate one, since the store is useless without it.
