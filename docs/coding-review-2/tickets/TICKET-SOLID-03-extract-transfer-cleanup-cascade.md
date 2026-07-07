# TICKET-SOLID-03 — Extract the shared transfer-cleanup cascade helper

- **Area:** DRY (core/import, core/accounts, core/transfers)
- **Type:** Refactor
- **Traceability:** CR2-4.2, CR2-4.3 (dead `DeleteAccountResult` alias)

## Description

When a set of transactions is about to be removed (undoing an import, deleting/clearing an account), any `Transfer` links touching them must be removed and the *surviving* side's `transferId` cleared — with the subtle invariant that the surviving side may itself be in the doomed set. That ~25-line algorithm now exists twice, character-near-identical, in two services. `AccountDeletionService` was added after the first review by copying `ImportService.undoImport`'s loop, so the duplication is fresh and will drift the first time either copy learns something new. Extract it once.

## Current situation (as-is)

- [import.service.ts:140-158](../../../src/app/core/import/import.service.ts) (`undoImport`) and [account-deletion.service.ts:60-91](../../../src/app/core/accounts/account-deletion.service.ts) (`cascadeTransactions`) both: collect distinct `transferId`s off the doomed transactions → `transfersRepository.getByIds` → per transfer: `remove`, compute surviving side, skip if surviving side is also doomed, else clear its `transferId` and record it → report `unlinkedTransferIds` + `clearedTransferTransactionIds`.
- Both run inside a caller-owned `appDb.transaction('rw', ...)`; both loop per-row (`update`/`remove` per transfer — CR-3.1 overlap).
- [account-deletion.service.ts:18-19](../../../src/app/core/accounts/account-deletion.service.ts) — `DeleteAccountResult`, a `@deprecated` alias with zero consumers (grep-verified 2026-07-07).

## Desired result (to-be)

- One helper in `core/transfers` — e.g. `cleanupTransfersForRemovedTransactions(transactions: Transaction[]): Promise<{ unlinkedTransferIds: number[]; clearedTransferTransactionIds: number[] }>` — as an injectable method on an existing/new service there (it needs `TransfersRepository`/`TransactionsRepository`), documented (like `cascadeTransactions` today) as requiring the caller's open `rw` Dexie transaction over `transactions` + `transfers`.
- `ImportService.undoImport` and `AccountDeletionService.cascadeTransactions` both delegate to it; their surrounding responsibilities (batch row deletion, account row deletion, result shaping) stay put.
- `DeleteAccountResult` is deleted.

## Acceptance criteria

- [x] The surviving-side algorithm (including the "surviving side is also doomed" skip) exists in exactly one source location; both call sites delegate to it.
- [x] Both callers still run the cleanup inside their existing atomic `appDb.transaction('rw', ...)` scopes — the helper does not open its own transaction.
- [x] Behaviour is pinned by specs *before* the extraction: the existing [account-deletion.service.spec.ts](../../../src/app/core/accounts/account-deletion.service.spec.ts) and [import.service.spec.ts](../../../src/app/core/import/import.service.spec.ts) pass (updated to mock the new `TransferCleanupService` seam in place of the inlined repository calls, since the DI graph changed — assertions on observable behavior/result shapes are preserved), and the cross-import cleanup branch gets a spec (it lacked one; added to `import.service.spec.ts`).
- [x] `DeleteAccountResult` no longer exists; `ng build --configuration development` proves nothing referenced it.
- [x] `UndoImportResult` / `ClearTransactionsResult` public shapes are unchanged (stores destructure them — [accounts.store.ts:95-128](../../../src/app/feature-accounts/accounts.store.ts), [import-batches.store.ts:61-76](../../../src/app/feature-import/import-batches.store.ts)).
- [x] Verified live: undo an import that auto-linked across batches, and clear/delete an account with linked transfers — surviving rows show no transfer badge, no console errors.
- [x] The `angular.json` bundle budget is **not** raised.

## Notes

- `core/transfers` is the right home: the invariant is about `Transfer` integrity, both existing owners already import from it, and it keeps `core/import` ↔ `core/accounts` from depending on each other.
- Optional, same file: replace the per-transfer `remove`/`update` loop with `bulkDelete`/`bulkUpdate` — that's CR-3.1's story; doing it here is fine since the loop now has one home, but don't let it expand this ticket's blast radius.
