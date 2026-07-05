# TICKET-TRF-01 — Clear category when a transaction is linked as a transfer

- **Area:** Transfers
- **Traceability:** extends FR-TRF-1
- **Source story:** user-stories.md §5 — *"As a user, I want a transaction linked as a transfer to have no category and be excluded from income/expense on the dashboard, while still counting normally toward its account's balance, so a transfer never gets miscategorised as spending or income."*

## Description

When two transactions are linked as a transfer, clear any category on both sides so a transfer can never carry a spending/income category. Income/expense exclusion and balance inclusion already work via `transferId`; the gap is the surviving `categoryId`.

## Current situation (as-is)

- Linking sets `transferId` on both sides — see [transfer-linking.service.ts](../../../src/app/core/transfers/transfer-linking.service.ts) `performLink()` (`update(..., { transferId })`) and [transfers.store.ts](../../../src/app/feature-transactions/transfers.store.ts).
- Income/expense exclusion already keys off `transferId` (in `period-stats.ts` / `category-breakdown.ts`), and account balances already include transfers — those are correct.
- **Gap:** `categoryId` is **not** cleared on link. A rule-assigned or manually-set category survives on a linked transaction, so a transfer can still show a category (and would be miscategorised if the exclusion were ever keyed on category instead of `transferId`).
- `unlink()` clears `transferId` but has nothing to restore, since category was never cleared.

## Desired result (to-be)

- Linking a pair (manual or auto) clears `categoryId` on both transactions in the same atomic transaction that sets `transferId`.
- A linked transaction shows no category in the table and the edit form.
- Balance contribution and income/expense exclusion are unchanged (already correct).

## Acceptance criteria

- [ ] `performLink()` clears `categoryId` (and `categoryManual`, if set) on **both** transactions in the same `appDb.transaction('rw', ...)` that sets `transferId`, so the write stays atomic.
- [ ] Applies to all link paths: manual (`linkManually`), auto-IBAN high-confidence, and auto-amount/date medium-confidence (`linkAuto` / `runAutoLink`).
- [ ] The in-memory store update mirrors the DB: `TransfersStore.link` / `runAutoLink` patch `categoryId` (and manual flag) to cleared alongside `transferId`, so the UI updates immediately (FR-STAT-5) without a reload.
- [ ] A linked transaction renders with no category badge in the transactions table and shows no category in the edit form.
- [ ] Account balance still includes the transaction's amount (transfers are **not** excluded from balances) — verified unchanged.
- [ ] Income/expense/savings-rate and category breakdown still exclude linked transactions (unchanged `transferId` behaviour).
- [ ] Re-running the rules engine does not re-assign a category to a still-linked transaction.
- [ ] **Decision recorded** for unlink: whether unlinking leaves the category empty (simplest) or re-runs rules to re-suggest a category. Whichever is chosen, it is documented and tested. (No pre-link category is stored today, so exact restoration is out of scope unless we add that.)
- [ ] Unit tests cover: link clears category on both sides (manual + both auto paths), balance unchanged, income/expense still excluded, rules re-run doesn't recategorise, and the chosen unlink behaviour.

## Notes

- If "restore previous category on unlink" is desired, that requires persisting the pre-link category — call that out as a follow-up rather than silently implementing it.
