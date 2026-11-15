# TICKET-CAT-12 — Deleting a category no longer orphans its rules or clears transactions it then fails to delete

- **Area:** Categories
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-CAT-1 / FR-CAT-2; found while designing TICKET-MCP-04

## User story

As someone deleting a category, I want the app to stop me while rules still point at it, and to leave my transactions alone when the delete is refused, so a delete never leaves rules aiming at nothing or wipes categories for nothing.

## Description

Deleting a category has two bugs. Rules targeting the category survive it and keep pointing at an id that no longer exists. And when the server refuses the delete (a loan tracks the category), the UI has **already** cleared that category from every transaction. This ticket moves the whole delete into one server operation: refuse while a loan **or rule** targets the category, otherwise clear its transactions and delete it, all atomically. The UI then does nothing until the server has said yes.

## Current situation (as-is)

- **Dangling rules.** [`DELETE /api/categories/:id`](../../../server/src/routes/categories.ts) checks loans (`assertNoLoanTracks`), clears the category from its transactions and deletes the row, in one `db.transaction`. A rule's `action.setCategoryId` is JSON with no foreign key ([schema/rules.ts](../../../server/src/schema/rules.ts)), so rules targeting the category survive and point at a missing id.
- **Root cause of the lost categories:**
  - [`CategoriesStore.removeCategory`](../../../src/app/core/state/categories.store.ts) calls `transactionsStore.bulkClearCategory(affectedIds)`, which **persists** the clear through `PATCH /api/transactions/bulk`, **before** `categoriesRepository.remove(id)`.
  - When the server answers 409 for a loan, the transactions have already lost their category.
  - The rejection is then dropped: [`categories-overview.component.ts`](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts) `deleteConfirmed` calls `void this.categoriesStore.removeCategory(...)`, so the user never sees the server's message.
- The server's own delete already clears the transactions, so the client's earlier clear is redundant even when the delete succeeds.

## Desired result (to-be)

- **Server operation:**
  - The body of the delete route moves into an operation in `server/src/operations/` (for example `deleteCategory(tx, userId, id)`). TICKET-MCP-04's `delete_category` will reuse it.
  - It refuses with 409 while a loan **or a rule** targets the category. The message names the blocking loans and rules, in the existing loan wording style.
  - Otherwise it clears `categoryId` and `categoryManual` from the category's transactions and deletes the row, all in one transaction.
- **`CategoriesStore.removeCategory`:**
  - calls the repository delete **first**;
  - only once that succeeds, updates its local state: it removes the category and patches the affected transactions in the transactions store's memory, with no second API call.
- **Refusals reach the user:** a refused delete shows the server's message as an inline daisyUI alert on the categories page, and leaves the category and every transaction unchanged. The categories feature has no error display today, and the app has no toast service; don't add one for this.
- `server/README.md`'s endpoint list mentions the new 409 reason.

## Acceptance criteria

- [x] The server delete answers 409 while any of the user's rules targets the category. The message names those rules, and nothing changes. (`server/src/routes/categories.spec.ts` "refuses with a 409 naming the rules that assign the category, even disabled ones, and changes nothing")
- [x] Another user's rule targeting the same id doesn't block the delete (ids are per table, but ownership is still checked). (`server/src/routes/categories.spec.ts` "isn't blocked by another user's rule aiming at the same id")
- [x] The loan check, the rule check, the transaction clear and the delete run in one transaction, through the new operation, which the route uses. (`server/src/operations/category-delete.ts` `deleteCategory(tx, userId, id)`, called by the route inside `db.transaction`; `categoryDeleteBlockers` is exported for MCP-04's preview)
- [x] In the UI, a refused delete (loan or rule) leaves every transaction's category exactly as it was. A store spec asserts that no `PATCH /api/transactions/bulk` is sent before the delete succeeds. (`CategoriesStore.removeCategory` now calls the repository delete first; `src/app/core/state/categories.store.spec.ts` "on a refusal, rejects with the server message and changes nothing" asserts `bulkUpdate` is never called. `TransactionsStore.bulkClearCategory` had no other caller and was removed with its spec)
- [x] A refused delete shows the server's message to the user, so the rejection isn't swallowed. (`categories-overview` renders it in an inline `mm-alert` with `role="alert"`; `categories-overview.component.spec.ts` "shows the server’s reason when a delete is refused, and keeps the category")
- [x] A successful delete still clears the category from its transactions in the list, without a reload and without an extra request. (`src/app/core/state/categories.store.spec.ts` "on success, clears the category off its transactions in memory with no request of its own" — `patchMany` only, no `update`/`bulkUpdate`)
- [x] Unit tests cover: blocked by a rule; blocked by a loan; a successful delete clears transactions; the store doesn't call the API before the delete succeeds; another user's rule doesn't block. (rule block, loan block and other-user rule in `server/src/routes/categories.spec.ts` — the loan cases already existed; successful clear in `server/src/routes/categories.spec.ts` "clears categoryManual off its transactions…" and the store spec; no API call before success in `src/app/core/state/categories.store.spec.ts`)
- [x] `ng lint`, `ng test` and `ng build --configuration development` pass, as do `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server`. Verified via the fallow skill and the coding-conventions skill. (ng lint clean; ng test 349 files / 3976 tests; ng build dev OK; server lint, typecheck and 475 tests green; fallow dead-code + health exit 0)
- [x] Browser check: deleting a category a rule targets shows the refusal and changes nothing; after deleting the rule, the category deletes and its transactions show as uncategorised. (2026-11-15, Orca browser on a scratch DB: deleting Groceries while the "Delhaize" rule targeted it showed the inline alert "This category cannot be deleted while the rule \"Delhaize\" assigns it…", and the API still had the category and both rows on it; after deleting the rule from the Rules page, the category deleted with no alert and the Transactions page listed both Delhaize rows as "Uncategorised")

## Notes

- **Refuse, don't cascade.** Deleting or disabling the rules automatically would remove work the user never saw go. This matches the loan precedent, and the MCP decision from 2026-11-14 (Q12).
- Existing databases may already contain rules pointing at deleted categories. Cleaning them up isn't in scope. Those rules simply stop applying, because no such category exists. A follow-up could flag them on the Rules page.
