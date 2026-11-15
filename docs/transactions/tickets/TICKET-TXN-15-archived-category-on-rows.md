# TICKET-TXN-15 — Rows keep showing their archived category

- **Area:** Transactions
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-22 ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-TXN-2 (manual category), FR-CAT-1 (manage categories); TICKET-TXN-05 (inline quick-set), TICKET-CAT-11 (applicability windows, the "(ended)" case)

## User story

As someone who archived a category I no longer use, I want old transactions to keep showing it, so that the table doesn't call them "Uncategorised" and the edit form doesn't show a blank category I might save over.

## Description

Both the table's inline category select and the edit form build their options from active categories only. A row assigned to an archived category has no matching option, so the table's select falls back to its first option, "Uncategorised", and the edit form shows blank. The "(ended)" case for date-limited categories already keeps the assigned category in the list. Archived needs the same treatment.

## Current situation (as-is)

- [`TransactionsOverviewComponent.categoryOptions`](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) (lines 211-232) starts from `categoriesStore.activeCategories()`. Its "keep any category a visible row is assigned to" rule (`assignedIds`) only filters that active list, so it can't bring an archived one back. `rows` (lines 260-263) still sets the row's `categoryId` from `categoriesById` (which includes archived), so the select's value has no option.
- [`TransactionEditFormComponent.categoryOptions`](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.ts) (lines 152-171) also starts from `activeCategories()`, and looks up `assigned` (line 162) in that same list, so the "(ended)" append never fires for an archived category.
- **Root cause:** both "keep the assigned category" fallbacks search `activeCategories()` instead of `categoriesById()`. In the table, the select shows "Uncategorised", and choosing "Uncategorised" fires no change event because the browser thinks it is already selected. In the edit form, the select is blank.

## Desired result (to-be)

- A row whose category is archived shows that category, labelled so it reads as retired (for example "Rent (archived)"), in both the table select and the edit form.
- Archived categories are still not offered to rows that aren't assigned to them.
- Choosing "Uncategorised" on such a row clears the category (sets `categoryManual: true`, as any manual change does).

## Acceptance criteria

- [ ] Table: a visible row assigned to an archived category shows it, with the archived label. Other rows' selects don't offer it.
- [ ] Edit form: opening that row shows its archived category selected. Saving without touching it keeps it.
- [ ] Choosing "Uncategorised" in the table on such a row writes the change through `TransactionsStore.updateTransaction` with `categoryManual: true`.
- [ ] The "(ended)" behaviour from TICKET-CAT-11 is unchanged.
- [ ] Unit tests cover: overview `categoryOptions` includes an assigned archived category and excludes an unassigned one; edit form `categoryOptions` appends the assigned archived category; label text.
- [ ] Live browser check: archive a used category, then check a row in the table and its edit form.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The bulk bar's category picker should keep offering active categories only. Bulk-assigning an archived category isn't a use case.
- Pick one label suffix and put it beside `withEndedSuffix` in [category-applicability.ts](../../../src/app/core/categorisation/category-applicability.ts), so both components share it.
