# TICKET-TXN-01 — Bulk-assign a category to selected rows

- **Area:** Transactions
- **Traceability:** ui-layout-spec.md §4.3
- **Source story:** user-stories.md §3 — *"As a user, I want to select multiple transactions and assign one category to all of them via a bulk-action bar, so clearing a backlog doesn't mean editing one row at a time."*

## Description

Let the user select any number of transactions and apply a single category to all of them at once from a bulk-action bar, instead of editing one row at a time.

## Current situation (as-is)

- [TransactionsOverviewComponent](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) tracks a `selectedIds` set, but selection is only wired for **transfer linking**: `canLinkSelection` is `selectedIds().size === 2`, and `linkSelection()` is the only multi-row action.
- There is effectively a 2-row cap on useful selection; there is no bulk category action and no bulk-action bar.
- Category is set one row at a time via the edit form (`openEdit` → `saveEdit` → `transactionsStore.updateTransaction`).

## Desired result (to-be)

- Selecting 1..N rows reveals a bulk-action bar showing the selection count and a category picker.
- Choosing a category assigns it to every selected transaction in one action and marks each as a manual category (so rules won't overwrite it — FR-TXN-2 / FR-CAT-3).

## Acceptance criteria

- [ ] Rows can be multi-selected beyond two (no artificial cap); a bulk-action bar appears when ≥1 (or ≥2, per design) rows are selected and shows the count.
- [ ] The bulk-action bar has a category selector; applying it assigns that category to **all** selected transactions.
- [ ] Bulk assignment sets `categoryManual = true` on each affected transaction, so a later rules re-run does not overwrite it (per Hard rules: rules never overwrite a user-set category).
- [ ] The change persists through the store/repository (not direct table writes) and all dependent computed stats/badges update immediately (FR-STAT-5).
- [ ] Selection clears after a successful bulk apply.
- [ ] The existing transfer-linking action still works: it activates only at exactly 2 selected rows and is visually/functionally distinct from bulk categorise.
- [ ] A "select all (filtered)" / "clear selection" affordance is available and operates over the current filtered set (not just the visible page).
- [ ] Bulk apply is efficient for large selections (single batched write, not N sequential awaits) and keeps the paginated table responsive.
- [ ] Unit tests cover: bulk assign to N rows sets category + manual flag, selection clears, transfer-link path unaffected, and select-all-filtered scope.

## Notes

- Interacts with pagination ([createPagination](../../../src/app/shared/utils)) — "select all" must mean the filtered result set, not only `pagedItems()`.
- Consider undo/confirmation for large bulk changes (nice-to-have, not required for v1 close).
