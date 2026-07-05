# TICKET-ACC-01 — Clear an account's transactions without deleting the account

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** extends FR-ACC-2 (edit/archive/delete account) and supports FR-IMP re-import; spec §"Data Model" (transactions/transfers cascade)
- **Source story:** user-stories.md §1 — *"As a user, I want to clear a bank account of its transactions (e.g. to re-import if something's wrong) without deleting the full account, so I can start its history fresh while keeping the account, its settings, and mapping profiles."*

## Description

Add an account-level "Clear transactions" action that removes **all** of an account's transactions (and cleans up any transfer links touching them) while keeping the account row itself — its name, type, IBAN, opening balance, colour/icon, and any saved mapping profiles — intact, so the user can re-import a corrected export onto a clean slate.

## Current situation (as-is)

- The only way to wipe an account's transactions today is to delete the whole account: [AccountsDetailComponent.deleteConfirmed](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.ts) → `AccountsStore.removeAccount` → [AccountDeletionService.deleteAccount](../../../src/app/core/accounts/account-deletion.service.ts).
- `deleteAccount()` already does exactly the cascade we want — atomic `rw` transaction over `accounts`/`transactions`/`transfers`, removing the account's transactions, deleting transfer records that touch them, and un-linking the surviving cross-account side — **but it also removes the account row** ([account-deletion.service.ts:58](../../../src/app/core/accounts/account-deletion.service.ts)) and the entity from the store ([accounts.store.ts:98](../../../src/app/feature-accounts/accounts.store.ts)).
- So a user who imported a bad CSV must either delete-and-recreate the account (losing its settings and mapping profiles) or undo import batches one at a time via FR-IMP-7 (`ImportService.undoImport`), which doesn't help when the transactions came from several batches or the batch records are gone.
- There is no repository/store method to bulk-remove transactions by account short of the full-account teardown; `TransactionsRepository.bulkRemove` takes explicit ids and `getByAccount` returns the account's rows ([transactions.repository.ts:8,36](../../../src/app/core/data-access/transactions.repository.ts)).

## Desired result (to-be)

- The account detail page offers a distinct **Clear transactions** action (separate from Delete account and Archive), enabled only when the account has ≥1 transaction.
- Confirming it removes every transaction belonging to that account and cleans up transfer links exactly as the delete cascade does, but leaves the account row and all its metadata untouched; the app returns to the account detail view (not the accounts list), now showing a zero/opening-balance state.
- After clearing, the account's derived balance falls back to its opening balance and its transaction count reads 0, all via the existing computed signals — no stale rows anywhere.

## Acceptance criteria

- [x] A new `clearTransactions(accountId)` operation removes all of the account's transactions and performs the same transfer cleanup as `deleteAccount` (delete transfer records touching removed transactions; un-link the surviving cross-account side by clearing its `transferId`) **without** removing the account row.
- [x] The work runs in a single atomic Dexie `rw` transaction over `transactions` + `transfers` (mirroring `AccountDeletionService`), so a failure leaves the account's data untouched — no half-cleared state.
- [x] Persistence goes through the repository/store layer (`TransactionsRepository` / `TransfersRepository` and the transactions/transfers stores), never direct `appDb` table writes from a component; the account entity itself is **not** mutated or removed.
- [x] The transactions and transfers stores are updated in memory (`removeMany` the cleared ids, `patchMany` the `transferId: undefined` survivors, `removeLocal` the deleted transfers) so `balancesById`, `netWorth`, and `transactionCountById` recompute immediately (FR-STAT-5).
- [x] The account keeps its name, type, IBAN, opening balance/date, colour/icon, and any saved mapping profiles after clearing; its balance reverts to the opening balance and its transaction count shows 0.
- [x] The detail page exposes a **Clear transactions** control, visually and functionally distinct from **Delete account**, disabled/hidden when the account has 0 transactions, and guarded by a confirmation dialog stating the exact count and that it cannot be undone (reuse `ConfirmDialogComponent`).
- [x] Unit tests cover: clearing removes all of the target account's transactions but leaves other accounts' transactions untouched; the account row survives with metadata intact; a transfer linking this account to a *different* account leaves the other side un-linked (transferId cleared) rather than dangling; and clearing an account with 0 transactions is a safe no-op.
- [x] Verified live in the browser: import into an account, clear its transactions, confirm the account remains with opening-balance and count 0, and a fresh re-import lands cleanly.

## Notes

- Prefer refactoring `AccountDeletionService` so the transactions/transfers cascade is shared and `deleteAccount` becomes "clearTransactions + remove account row" — avoids duplicating the cross-account un-link logic and keeps the two paths from drifting.
- Consider whether the cleared account's import batch records ([ImportBatchesRepository](../../../src/app/core/data-access/import-batches.repository.ts)) should also be pruned, since their `rows added/skipped` summaries and undo affordance become meaningless once the transactions are gone — flag as a design decision, not necessarily in scope for v1 close.
- Related: [TICKET-TRF-01](./TICKET-TRF-01-clear-category-on-link.md) (transfer-link cleanup semantics) and FR-IMP-7 batch undo (the narrower existing recovery path this complements).
