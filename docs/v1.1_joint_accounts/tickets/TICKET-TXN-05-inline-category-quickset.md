# TICKET-TXN-05 — Inline category quick-set on transaction rows

- **Area:** Transactions
- **Type:** Feature
- **Traceability:** extends FR-TXN-2

## User story

As a user, I want to set a transaction's category directly from the transaction list, without opening the edit modal, so clearing a backlog of uncategorised transactions doesn't take four clicks each.

## Description

Categorising a single transaction today requires opening a modal for what is, in the common case, a one-field change. Add a category picker directly in the transaction row so the common path is a single inline change, while keeping the full edit-form modal available for notes/other fields.

## Current situation (as-is)

Row-level category change today, in `src/app/feature-transactions/components/transactions-overview/`:

1. Click the pencil icon (`ariaLabel="Edit transaction"`, `transactions-overview.component.html:123-131`) → `openEdit(transaction)` opens the `app-transaction-edit-form` modal.
2. Click the `mm-select formControlName="categoryId"` dropdown to open it (`transaction-edit-form.component.html:10-15`).
3. Click a category option (from `categoriesStore.activeCategories()`).
4. Click "Save changes" (`transaction-edit-form.component.html:39`) → `saveEdit()` → `transactionsStore.updateTransaction(id, result)`.

That's four clicks (edit icon → open select → pick option → save) for a single-field change. No inline-edit cell exists in the table today. The closest existing precedent is `transaction-bulk-bar` ([transaction-bulk-bar.component.ts/html](../../../src/app/feature-transactions/components/transaction-bulk-bar/)) — select rows, pick a category from an inline dropdown, and it applies to all selected rows in one write (`applyBulkCategory`) with no modal or separate save click, proving the store already supports a single-field category write without the full edit form.

## Desired result (to-be)

- Each transaction row's category cell gets an inline `mm-select` (or a compact variant) showing the current category or an "Uncategorised" placeholder.
- Selecting a category writes immediately — `transactionsStore.updateTransaction(id, { categoryId, categoryManual: true })` — no modal, no separate save click. Two clicks total (open select, pick category).
- The pencil-icon edit-form modal remains for notes/other fields; this adds a faster path for the single most common edit, it doesn't replace the modal.
- Respects FR-TXN-2: an inline change always sets `categoryManual: true`, exactly like the modal path, so rules never silently overwrite a category the user just picked.
- A savings movement (`isSavingsMovement`, TICKET-TRF-02) still never needs a category — the inline select shouldn't nag rows that are already excluded from the "needs a category" surfaces.

## Acceptance criteria

- [x] Each transaction row's category column shows a select control with the row's current category (or an "Uncategorised" placeholder), independent of the edit-form modal.
- [x] Changing the inline select persists immediately via `TransactionsStore.updateTransaction`, setting `categoryManual: true`, with no additional confirm/save step.
- [x] The change is reflected instantly in the row and in every dependent aggregate (dashboard stats, uncategorised counters) via existing computed signals — no manual refresh.
- [x] The pencil-icon edit-form modal still works unchanged for notes/other fields.
- [x] Virtualized table performance ([TICKET-TXN-02](../../v1.0_foundation/tickets/TICKET-TXN-02-virtualized-table.md)) is not regressed — the inline select renders cheaply per row (reuse `mm-select`, not a new heavy component).
- [x] Keyboard-accessible: the inline select can be focused and changed without a mouse.
- [x] Unit tests cover the new inline-change path setting `categoryManual` correctly.
- [x] Verified live in the browser: picking a category inline on a transaction row updates the row and the dashboard's uncategorised count without opening the modal.

## Notes

- Mirrors `transaction-bulk-bar`'s existing "pick from inline dropdown, write immediately" pattern — reuse that write path rather than inventing a new one.
- The virtualized table renders many rows at once; confirm this doesn't introduce expensive per-row change detection (OnPush + `trackBy` should already cover it, but worth double-checking during implementation).
- **Implementation deviation:** used a plain native `<select>` bound via `[value]`/`(change)` instead of `mm-select`, because `mm-select` only binds through `ControlValueAccessor` (`[formControl]`/`ngModel`) — this codebase has no `ngModel` precedent (Reactive Forms only) and no precedent for per-row `FormControl`s in a virtualized table, which would churn 50 control instances on every unrelated signal change (e.g. a selection-checkbox toggle). The row's own selection `<input type="checkbox">` in this same table already uses a plain native control for the same reason, so this stays consistent with that existing precedent and satisfies the criterion's actual intent ("not a new heavy component").
