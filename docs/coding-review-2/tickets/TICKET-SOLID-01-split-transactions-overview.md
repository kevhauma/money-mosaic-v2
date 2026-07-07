# TICKET-SOLID-01 — Split `TransactionsOverviewComponent` into filter bar + selection model

- **Area:** SRP (feature-transactions)
- **Type:** Refactor
- **Traceability:** CR2-2.1 + CR2-6.2 (sequence with [TICKET-NG-02](../../code-review/tickets/TICKET-NG-02-overview-input-binding.md))
- **Fallow evidence (2026-07-07):** #1 hotspot in the codebase (score 63.6, 10 commits — nearly double the runner-up); the `filteredTransactions` filter callback is the app's only *critical* complexity finding (cyclomatic 34, cognitive 45)

## Description

The transactions overview is the app's one god component: 366 lines of TS plus a 243-line template owning the filter form + URL intake, the debounced/structural filter pipeline, pagination, the row view-model join, multi-row selection with bulk category assignment, transfer link/unlink, and edit-dialog orchestration. Every transactions-page change touches this file, and its spec must stand up the entire world to test any single concern. Extract the two seams that carry the most self-contained state — the filter bar and the selection model — leaving the parent as a thin coordinator over `filteredTransactions` + `rows`.

## Current situation (as-is)

- [transactions-overview.component.ts](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) holds:
  - Filter form, query-param intake, `structuralFilters` (`toSignal` + `distinctUntilChanged`), `debouncedText`, `filterKey` (lines 120–213).
  - Selection state: `selectedIds`, `selectedTransactions`, `canLinkSelection`, `selectionCount`, `allFilteredSelected`, `someFilteredSelected`, plus `toggleSelected`/`selectAllFiltered`/`clearSelection`/`toggleSelectAllFiltered` (lines 215–331) — a generic set-selection pattern hardcoded to this component.
  - Bulk category, transfer link/unlink, edit-dialog handling, row view-model.
- The template mirrors this: filter form (lines 21–89), bulk-action bar (91–127), table, paginator, edit dialog.

## Desired result (to-be)

- An `mm-transaction-filters` child component (own folder under `components/`) owning the form, the structural/text split, and debounce; it exposes the current filters as a single typed output/model (e.g. `TransactionFilters`), plus the `showUncategorisedOnly`/`clearFilters` affordances. The parent consumes one signal, not seven form controls.
- An `mm-transaction-filters` child component (own folder under `components/`) owning the form, the structural/text split, and debounce; it exposes the current filters as a single typed output/model (e.g. `TransactionFilters`), plus the `showUncategorisedOnly`/`clearFilters` affordances. The parent consumes one signal, not seven form controls.
- The filter *decision logic* — the callback inside `filteredTransactions` (cyclomatic 34 / cognitive 45, the app's only critical complexity finding) — extracted as a pure `matchesTransactionFilters(transaction, filters, ownSavingsIbans)` function beside the component (or in the feature root), spec-covered without TestBed per the pure-logic testing convention. The component's `computed()` becomes a one-line `.filter(...)` + sort.
- A generic `createSelectionModel<Id>()` utility in `shared/utils` (signal-based, mirroring the `createPagination` precedent): `selectedIds`, `count`, `toggle`, `selectAll(ids)`, `clear`, `allSelected(ids)`, `someSelected(ids)`. The overview (and any future bulk UI) consumes it; the bulk-action bar markup may stay in the parent template or move to an `mm-transaction-bulk-bar` child — implementer's call, but the selection *state* must live in the utility.
- `TransactionsOverviewComponent` retains: `filteredTransactions`, pagination, `rows` view-model, and thin handlers delegating to stores.

## Acceptance criteria

- [ ] `transactions-overview.component.ts` drops below ~200 lines and no longer contains form-control declarations or raw `Set<number>` selection bookkeeping. (366 → 242 lines. The form-control/raw-`Set` bookkeeping is fully gone — filter form moved to `app-transaction-filters`, selection moved to `createSelectionModel`, bulk-category form moved to `app-transaction-bulk-bar` — but 242 is still above the ~200 target. The remainder is exactly what the "Desired result" section says should stay: `filteredTransactions`, pagination, the `rows` view-model join, `likelyTransferIds`, and thin store-delegating handlers. Further extraction would mean pulling transfer-linking or the row view-model out of the component, which goes beyond this ticket's scope.)
- [x] `mm-transaction-filters` follows the component-folder convention, is `OnPush`, uses `input()`/`output()`/`model()`, and owns `debouncedTextSignal` + the `distinctUntilChanged` structural pipeline unchanged in behaviour. (Implemented as `app-transaction-filters`, not `mm-transaction-filters` — this repo's convention reserves the `mm-` prefix for `shared/ui` primitives; feature components are `app-`-prefixed. Same for the optional bulk-bar extraction below: `app-transaction-bulk-bar`.)
- [x] `createSelectionModel` lives in `shared/utils` with a TestBed-free spec covering toggle, select-all, clear, all-selected, and the indeterminate (some-selected) predicate.
- [x] A pure `matchesTransactionFilters(...)` function exists with a TestBed-free spec table covering each filter axis (account, date range, category incl. `uncategorised` + savings-movement exclusion, text, amount min/max) and their combination; the component `computed()` no longer contains multi-branch filter logic. A follow-up `fallow health --complexity` run no longer reports a critical finding in this file.
- [x] Filter behaviour is preserved: structural filters apply immediately, text applies after debounce, page resets to 1 on any filter change, "Show them" pre-selects Uncategorised, Clear resets everything.
- [x] Selection behaviour is preserved: header checkbox tristate, select-all targets the *filtered* set (not just the page), bulk category apply clears the selection, link-as-transfer appears at exactly 2 selected.
- [x] Existing `transactions-overview.component.spec.ts` scenarios still pass (updated for the new structure, not weakened — filter-form scenarios moved to `transaction-filters.component.spec.ts` where that behaviour now lives; a new `transaction-bulk-bar.component.spec.ts` was added for the extracted bulk bar).
- [ ] Verified live in the browser: filtering, paging, selecting across pages, bulk assign, link/unlink, and edit all work; no console errors. (Filtering, bulk assign, link/unlink, and edit verified live with no console errors. Paging and cross-page selection could **not** be verified live — the seeded dev dataset only has 2–6 transactions, never enough to span a second page — but are covered by `transactions-overview.component.spec.ts`'s 60-item "select-all covers the whole filtered set, not just the visible page" test.)
- [x] The `angular.json` bundle budget is **not** raised.

## Notes

- Do [TICKET-NG-02](../../code-review/tickets/TICKET-NG-02-overview-input-binding.md) (query params via `input()`) first or in the same change — it determines whether the filter bar receives initial values via `input()`s from the route or reads them itself. Per the routing conventions, param intake stays in the route entry component and flows *down* into the filter bar.
- Keep the CR-2.x performance work intact: row view-model join over the paged slice only, debounced text, `filterKey`-driven page reset.
