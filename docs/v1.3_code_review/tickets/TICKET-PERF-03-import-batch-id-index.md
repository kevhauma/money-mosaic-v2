# TICKET-PERF-03 — Index `importBatchId` (and `attributionOverride.reimbursementTransferId`) on transactions

- **Area:** Performance (core/data-access, Dexie schema)
- **Type:** Refactor
- **Traceability:** CR-3.3 (carried over from the first review, still open)

## User story

As a user undoing an import on a large dataset, I want the batch's transactions found via an index instead of a full-table scan, so undo-import stays instant as history grows.

## Description

`TransactionsRepository.getByImportBatch` filters the entire transactions table in JS because `importBatchId` was added after v1 shipped without an index — the repository even carries a comment saying so. The same applies to `getByReimbursementTransferId`. One additive Dexie version adds both indexes.

## Current situation (as-is)

- [transactions.repository.ts:23-36](../../../src/app/core/data-access/transactions.repository.ts) — both methods use `.filter(...)` full-table scans, each with a comment documenting the missing index.
- [app-db.ts](../../../src/app/core/data-access/app-db.ts) — schema currently tops out at `.version(10)`; the `transactions` index list is `'++id, accountId, bookingDate, categoryId, transferId, fingerprint'`.

## Desired result (to-be)

- A new `.version(11).stores(...)` adding `importBatchId` and `attributionOverride.reimbursementTransferId` (Dexie dotted-keypath index) to the transactions index list. **Additive only — no shipped version block is edited** (CLAUDE.md hard rule). No `.upgrade()` needed; Dexie backfills indexes from existing row data.
- Both repository methods switch to `.where(...).equals(...)`; their apology comments are deleted.

## Acceptance criteria

- [ ] `getByImportBatch` and `getByReimbursementTransferId` use indexed `where` queries; no `.filter(` full-table scan remains in [transactions.repository.ts](../../../src/app/core/data-access/transactions.repository.ts).
- [ ] Schema change is a new `.version(11)` block only — `git diff` on `app-db.ts` shows no modification to versions 1–10.
- [ ] Undo-import works on a database created *before* the upgrade (open an existing seeded/dev DB, upgrade happens, undo an old batch) — verified live in the browser.
- [ ] Unit tests cover: `getByImportBatch` returns exactly the batch's rows post-upgrade (fake-indexeddb setup per the ML-04 pattern in `src/test-setup.ts`); reimbursement lookup returns the overriding transaction.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- If TICKET-CLEANUP-04 (minimal version declarations) lands first, `.version(11)` can declare only the `transactions` table — coordinate, don't block.
- `undoImport` currently also filters the in-memory store ([import-batches.store.ts:93-97](../../../src/app/feature-import/import-batches.store.ts)) — that in-memory filter is fine and out of scope; only the Dexie path changes.
