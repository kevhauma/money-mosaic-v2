# TICKET-TEST-01 — Spec the four untested orchestrator stores

- **Area:** Testing (feature-import, feature-categories, feature-transactions)
- **Type:** Test
- **Traceability:** CR2-5.1 (enables SOLID-01/03/04 to land safely)

## User story

As a developer, I want specs pinning the four untested orchestrator stores — `ImportBatchesStore.commitImport` sequencing, `CategoriesStore.removeCategory` cascade, `RulesStore.moveRule` (including the equal-priority no-op edge), and `TransfersStore` link/unlink mirroring — so the refactors elsewhere in this backlog land against a safety net.

## Description

Pure logic (`core/import`, `core/stats`, `rule-matching`, `transfer-matching`) and half the stores are well covered, but the four stores with the most *coordination* logic — where a wrong sequencing silently corrupts state across stores — have no specs at all. These are also exactly the files other tickets in this backlog refactor. Pin their behaviour first.

## Current situation (as-is)

No spec file exists for:

- [import-batches.store.ts](../../../src/app/feature-import/import-batches.store.ts) — `commitImport` runs rules over the freshly added rows *before* patching them into `TransactionsStore` (so they land pre-categorised), then runs `runAutoLink` *after*; `undoImport` mirrors removals + cleared transferIds into two stores.
- [categories.store.ts](../../../src/app/feature-categories/categories.store.ts) — `removeCategory` clears `categoryId` **and** `categoryManual` off every referencing transaction before deleting the category row.
- [rules.store.ts](../../../src/app/feature-categories/rules.store.ts) — `moveRule` swaps priorities with the neighbour (note: if two rules share a priority, the swap is a values-equal no-op — pin whether that's accepted behaviour or should reindex); `createRuleFromCounterparty` appends at highest-priority+10 and backfills via `runRules`.
- [transfers.store.ts](../../../src/app/feature-transactions/transfers.store.ts) — `link`/`unlink`/`runAutoLink` must mirror `transferId` changes into `TransactionsStore.patchMany` so the table and stats stay consistent with Dexie.

(`transfer-settings.store` and `range-state.store` are near-trivial state holders — include them only if cheap.)

## Desired result (to-be)

- A `*.store.spec.ts` beside each of the four stores, following the house pattern already used by [accounts.store.spec.ts](../../../src/app/feature-accounts/accounts.store.spec.ts) / [transactions.store.spec.ts](../../../src/app/feature-transactions/transactions.store.spec.ts) (TestBed with faked repositories/services injected per the DIP convention; assert on signal/computed output directly).

## Acceptance criteria

- [x] `ImportBatchesStore.commitImport`: given a fake `ImportService` result and a rule that matches one added row, the store receives that row already carrying the rule's categoryId; `runAutoLink` is invoked after `addMany`; the returned result's `addedTransactions` reflect the merged categories.
- [x] `ImportBatchesStore.undoImport`: batch entity removed; `TransactionsStore` loses exactly the batch's rows; surviving cross-import partners get `transferId: undefined`; `TransfersStore.removeLocal` called with the severed ids.
- [x] `CategoriesStore.removeCategory`: referencing transactions end with `categoryId: undefined` **and** `categoryManual: false`, persisted via the repository *and* mirrored in `TransactionsStore`; non-referencing transactions untouched; category entity removed.
- [x] `RulesStore.moveRule`: up/down swaps priorities in both the repository and the store; first-row-up / last-row-down are no-ops; the equal-priority case is asserted with a comment recording the chosen semantics.
- [x] `RulesStore.createRuleFromCounterparty`: skips blank counterparty; created rule uses `equals` on the trimmed name, priority = max+10; matching uncategorised transactions get categorised while `categoryManual` rows are untouched.
- [x] `TransfersStore`: `link` adds the transfer and patches both transactions' `transferId`; `unlink` clears both sides; `runAutoLink` patches every linked pair and returns the count; unknown `transferId` on `unlink` is a safe no-op.
- [x] All specs are deterministic (no real Dexie / IndexedDB — fake the repositories and services), and `ng lint` + `ng test` + `ng build --configuration development` pass.

## Notes

- These specs intentionally overlap the first review's CR-9 items (`undoImport` cross-import branch, `removeAccount` cascade) — tick those boxes in [../../code-review/overview.md](../../code-review/overview.md) if this ticket covers them.
- Resist "fixing" anything found while pinning (e.g. the equal-priority no-op): record it in the spec and file a follow-up — this ticket is the safety net, not the surgery.
