# TICKET-ML-13 — Dedicated suggestions table on the Learning page

- **Area:** Auto-categorisation
- **Type:** Feature (replaces part of FR-ML-8's UI)
- **Traceability:** supersedes the transactions-table part of FR-ML-8; adds FR-ML-13 (new)

## User story

As a user reviewing what the model has guessed, I want a dedicated table of every uncategorised transaction
with a suggestion — not a small chip buried in the transactions table — so I can quickly work through all of
them, correcting any wrong guess with the same category picker I already know.

## Description

Adds a suggestions table to the Learning page (ML-11): one row per uncategorised transaction with a
suggestion, showing the same columns as the transactions table plus the suggested category and confidence,
an Accept action, and a category `<select>` to override a wrong guess. Removes the ghost-suggestion chip and
Accept button from the transactions table, per the feedback that they aren't clear there.

## Current situation (as-is)

- [transactions-overview.component.html](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html)
  lines 96-121: the category `<td>` renders a `<select>` (row category) and, when `row.suggestion` is set,
  a dimmed `mm-badge` ("Suggested: {name} ({confidence}%)") plus an `mm-button` "Accept" (lines 109-120).
- [transactions-overview.component.ts](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts):
  `TransactionRow` (lines 61-69) carries a `suggestion` field; `resolveSuggestion()` (lines 208-222) joins it
  in per-row, only for still-uncategorised transactions; `acceptSuggestion()` (lines 265-268) delegates to
  `CategoryModelStore.acceptSuggestion`; the component injects `CategoryModelStore` (line 104) solely for
  this.
- `CategoryModelStore.suggestions` ([category-model.store.ts:30](../../../src/app/feature-categories/category-model.store.ts#L30))
  is a `Map<transactionId, {categoryId, confidence}>`; `acceptSuggestion(transactionId)` (lines 200-209) sets
  the category via `TransactionsStore.bulkAssignCategory` and removes the entry; `dismissSuggestion`
  (lines 224-228) removes it locally without setting a category.
- No standalone reusable transactions-table component exists — the row/table markup is inline in
  `transactions-overview.component.html`, owned solely by `TransactionsOverviewComponent`. Building a second
  table for suggestions means writing new markup, not extracting a shared one (no existing component to
  reuse for this ticket).
- `dismissSuggestion` exists on the store but nothing calls it today — no UI dismiss action.

## Desired result (to-be)

- New `feature-learning/components/suggestions-table/suggestions-table.component.{ts,html,spec.ts}`:
  - Injects `CategoryModelStore`, `TransactionsStore`, `CategoriesStore`, `AccountsStore` (same set
    `TransactionsOverviewComponent` uses today, all via their feature barrels).
  - Builds rows from `CategoryModelStore.suggestions()` joined against
    `TransactionsStore.uncategorisedTransactions()` — one row per transaction with a live suggestion (a
    transaction can only have a suggestion while it's uncategorised, so this join is a strict subset,
    mirroring `resolveSuggestion`'s existing invariant).
  - Table columns: date, description, counterparty, account, amount (reuse `SignedAmountPipe`), suggested
    category + confidence (`mm-badge`), a category `<select>` pre-populated with the suggested category
    (same markup/behaviour as the transactions table's select — `onCategoryChange` sets `categoryManual:
    true` and clears the suggestion via the transaction going categorised), Accept (`mm-button`, calls
    `acceptSuggestion`), Dismiss (`mm-button`, calls `dismissSuggestion` — the first UI caller of this
    existing store method).
  - Renders `mm-empty-state` when there are no live suggestions (e.g. before training, or once the queue is
    cleared).
  - Component → store direction only, same as ML-08's original rule.
- Mounted on `learning-overview.component.html` (ML-11), added to its `imports` array and to
  `feature-learning/components/index.ts`.
- `transactions-overview.component.html` loses the suggestion `mm-badge` + Accept button block (lines
  109-120) — the category `<td>` reverts to just the `<select>`, unchanged from before ML-08.
- `transactions-overview.component.ts` loses `TransactionRow.suggestion`, `resolveSuggestion()`,
  `acceptSuggestion()`, and its `CategoryModelStore` injection — nothing in this component depends on the
  model anymore.

## Acceptance criteria

- [x] The suggestions table shows exactly one row per transaction present in `CategoryModelStore.suggestions()`
      (and still uncategorised), with correct category name and confidence rounded to a whole percent.
- [x] Changing the row's category `<select>` calls `TransactionsStore.updateTransaction` with
      `categoryManual: true` (mirroring the transactions table's existing `onCategoryChange`) — a corrected
      row drops out of the table once the transaction is categorised (`suggestions` no longer has an entry,
      since `acceptSuggestion`/manual set both lead to a categorised transaction).
- [x] Clicking Accept calls `CategoryModelStore.acceptSuggestion(transactionId)` exactly once; the row
      disappears once the store settles.
- [x] Clicking Dismiss calls `CategoryModelStore.dismissSuggestion(transactionId)` exactly once; the row
      disappears without setting any category.
- [x] No live suggestions renders `mm-empty-state`, not an empty table shell.
- [x] `transactions-overview.component.html`/`.ts` no longer reference `CategoryModelStore`, `suggestion`,
      or `acceptSuggestion` anywhere — `grep -n "CategoryModelStore\|suggestion" src/app/feature-transactions/components/transactions-overview` returns no matches.
- [x] `TransactionsOverviewComponent`'s existing unit tests for row mapping/Accept are removed or updated to
      no longer assert suggestion behaviour (moved to this ticket's new spec instead).
- [x] Only `BadgeComponent`/`ButtonComponent`/`EmptyStateComponent` (or other existing shared UI primitives)
      are used — no raw daisyUI/Tailwind classes duplicating what those components provide.
- [x] Unit tests for the new component cover: row derivation from `suggestions()` ∩ uncategorised
      transactions, category-select override calling `updateTransaction` with `categoryManual: true`,
      Accept delegating to `acceptSuggestion`, Dismiss delegating to `dismissSuggestion`, empty state when
      there are no suggestions.
- [x] Verified live in the browser: after training, `/learning` lists every uncategorised transaction with a
      suggestion; correcting one via the select changes its category and removes it from the list; Accept
      and Dismiss each remove the row via their own path; the transactions table no longer shows any
      suggestion chip.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Needs ML-11 (the `/learning` shell to mount into). Independent of ML-12/ML-14 — all relocate/build
  distinct pieces of `/learning`'s content and can ship in parallel once ML-11 lands.
- This ticket **removes** the transactions-table ghost chip rather than keeping both surfaces — confirmed
  scope decision, since duplicating the same accept action in two places directly contradicts the feedback
  that the in-table version "is not clear."
- No change to `CategoryModelStore` itself — `dismissSuggestion` already existed (ML-07) but had no caller
  until this ticket.
- **Post-merge follow-up feedback**, addressed in the same working tree: the category `<select>` used to be
  pre-filled with the suggested category, which made an untouched row visually read as "already
  categorised" — it now always starts at "Uncategorised". The suggestion badge and the select were split
  into two separate table columns ("Suggested" / "Category") instead of stacked in one. The table is now
  paged via the shared `createPagination`/`mm-paginator` (`PAGE_SIZE = 50`, matching the transactions
  table).
