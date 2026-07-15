# TICKET-CLEANUP-03 — Fold the residual verified clones (structural-filters block, deletion-cascade glue)

- **Area:** Cleanup (shared/utils, core services)
- **Type:** Refactor
- **Traceability:** CR3-2.5; extends TICKET-SOLID-03's cascade extraction and the `debouncedTextSignal` utility
- **Fallow evidence (2026-07-14):** `dup:f868aa89` (rule-filters vs. transaction-filters), `dup:99b7c535`/`dup:dc1fd0b3` (deletion-cascade glue in three services)

## User story

As a developer, I want the two remaining small clone families absorbed into their existing homes, so the fallow dupes report stays short enough that a *new* clone is immediately visible.

## Description

Two low-priority, verified-real leftovers. First: the filter components already share `debouncedTextSignal`, but each still hand-rolls the identical `structuralFilters` `toSignal` + `distinctUntilChanged` block. Second: after TICKET-SOLID-03 extracted the transfer-cleanup cascade core, three call sites still repeat the same seven lines of glue ("collect ids → `cleanupTransfersForRemovedTransactions` → `bulkRemove`").

## Current situation (as-is)

- [transaction-filters.component.ts:103-117](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.ts) and [rule-filters.component.ts](../../../src/app/feature-categories/components/rule-filters/rule-filters.component.ts) — duplicated structural-filters signal bridge.
- [account-deletion.service.ts:53-60](../../../src/app/core/accounts/account-deletion.service.ts), [import.service.ts:168-174](../../../src/app/core/import/import.service.ts), [transaction-deletion.service.ts:21-32](../../../src/app/core/transactions/transaction-deletion.service.ts) — the cascade glue trio.

## Desired result (to-be)

- A `structuralFiltersSignal(form, pick, equals)` helper (or equivalent) in the same `shared/utils` family as `debouncedTextSignal`; both filter components consume it.
- A `removeTransactionsWithTransferCleanup(transactions)` method on `TransferCleanupService` (runs inside the caller's existing `rw` transaction scope, same contract as the current cleanup method) absorbing the three glue sites.
- `dup:f868aa89`, `dup:99b7c535`, and `dup:dc1fd0b3` gone from the dupes report.

## Acceptance criteria

- [x] Filter behaviour unchanged on both pages (structural filters apply immediately, text stays debounced, clear-filters resets) — existing component specs pass.
- [x] Deletion/undo flows unchanged: account clear/delete, transaction delete, import undo all still remove transfer links atomically — existing service specs pass; the new helper's spec covers the returned `unlinkedTransferIds`/`clearedTransferTransactionIds` shape.
- [x] The helper never opens its own Dexie transaction (caller-scope contract, documented — matches the existing `cleanupTransfersForRemovedTransactions` doc comment).
- [x] The three fingerprints above no longer appear in `fallow dupes`.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Explicitly low priority — the review marked these "only if the files are touched anyway"; batching them as one small ticket keeps them from lingering as perpetual backlog dust.
- `dup:d9247208` and `dup:fbfaad2e` stay accepted (under 15 lines, different domains) — do not chase them.
- `dup:f6d16225` (accounts-overview vs. categories-overview `deleteMessage` computed, surfaced 2026-07-15 by TICKET-NG-07's `createConfirmState` extraction) is accepted for the same reason: 11 lines, 2 instances, the count-based ternary shape is shared but the message text is domain-specific wording, not logic. Do not chase it either.
