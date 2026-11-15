# TICKET-TXN-14 — Bulk actions never hit rows hidden by filters or already deleted

- **Area:** Transactions
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-11 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-TXN-3 (filter), FR-TXN-4 (link as transfer); TICKET-TXN-01 (bulk category assign)

## User story

As someone working through filtered transactions, I want bulk actions to act only on the rows I can see selected, so that "Delete 2" never deletes 42, and "Link as transfer" never does nothing because one of my two selected rows is already gone.

## Description

The selection is a set of ids that outlives everything that should shrink it. Changing the filter keeps rows selected that are now off screen, and deleting a row from its edit dialog leaves its id selected. The bulk bar's count and actions then include rows the user can't see.

## Current situation (as-is)

- [`TransactionsOverviewComponent`](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) holds `selection = createSelectionModel<number>()` (line 157), a plain id set ([selection-model.ts](../../../src/app/shared/utils/selection-model.ts)).
- Nothing prunes it. `selectAllFiltered` (line 319) fills it from `filteredIds`, and a filter change doesn't touch it. "Select all 40", change the filter, tick 2 visible rows → the bulk bar ([template](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html) line 21-23, `selection.count()`) says 42, and `deleteSelection` (lines 372-378) deletes all 42.
- `deleteEditingTransaction` (lines 364-369) deletes a row but leaves its id in the selection. `selectedTransactions` (lines 159-163) drops it (it filters store rows), but `selection.count()` and `canLinkSelection` (`count() === 2`, line 165) don't. So the bar says "2 selected", Link is enabled, and `linkSelection` returns silently on the missing second row. `applyBulkCategory` (lines 333-339) sends the stale id too.
- **Root cause:** the count and the actions read the raw selected-id set instead of its intersection with the rows that exist and pass the current filter.

## Desired result (to-be)

- The selection is pruned to `filteredIds` whenever the filtered set changes (a filter change or a deletion). The count, `canLinkSelection` and every bulk action then only ever cover visible-filter rows that still exist.
- After a delete from the edit dialog, the deleted id is gone from the selection.

## Acceptance criteria

- [ ] Select all under filter A, switch to filter B, tick 2 rows: the bar says 2, and Delete deletes exactly those 2.
- [ ] Select 2 rows, delete one from its edit dialog: the bar says 1, and Link as transfer is disabled.
- [ ] Bulk category assign never sends an id that's deleted or outside the current filter.
- [ ] Rows still selected and still visible stay selected after a filter change that keeps them.
- [ ] Unit tests in `transactions-overview.component.spec.ts` cover: filter change prunes hidden ids; edit-dialog delete prunes its id; the bulk delete and bulk assign calls receive only visible ids.
- [ ] Live browser check of the "select all, refilter, delete" path.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Two equal-size fixes: prune the stored set when `filteredIds` changes (like `createPagination`'s `resetOn`), or keep the set and derive `effectiveSelection = selected ∩ filteredIds` for the count and every action. Pruning is the clearer contract (what the header checkbox shows is what's selected). The derived form brings old selections back when the filter is reverted, which looks like a bug.
- `rules-overview.component.ts` uses the same `createSelectionModel`. Check it for the same issue, but it's out of scope here.
