# TICKET-MCP-02 — `assign_categories`: categorise transactions in bulk from an agent

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** FR-TXN-2 / FR-CAT-3 (manual categories are never overwritten by rules); needs TICKET-MCP-01

## User story

As someone tidying up a month of transactions with an agent, I want it to assign categories to many transactions in one go, with a preview first, so recategorising is quick, deliberate and reversible.

## Description

This adds one write tool, `assign_categories`. It takes a mixed list of `{transactionId, categoryId | null}`, previews the change unless called with `confirm: true`, and applies the whole list in one database transaction. An assignment counts as **manual**: set by a person or agent, not by a rule.

## Current situation (as-is)

- [`PATCH /api/transactions/bulk`](../../../server/src/routes/transactions.ts) already applies a list of `{id, changes}` in one `db.transaction`, through `updateOwnedRow`, checking every row and reference belongs to the user.
- The UI assigns with `categoryManual: true`, both in bulk ([transactions.store.ts](../../../src/app/core/state/transactions.store.ts) `bulkAssignCategory`) and for a single row (the transaction edit form). Clearing a category sets `categoryManual: false` (`bulkClearCategory`).
- [`RulesEngineService`](../../../src/app/core/categorisation/rules-engine.service.ts) skips manual rows **and** transfer-linked rows. Linking a transfer clears its category on purpose (TICKET-TRF-01).
- Category pickers only offer categories that apply on the transaction's date (TICKET-CAT-11, `activeFrom`/`activeUntil`), and never archived ones.

## Desired result (to-be)

- **Input:**
  - `assignments: [{transactionId, categoryId | null}]`, between 1 and 500 items. Duplicate `transactionId`s are an error.
  - `confirm?: boolean`.
- **Assigning** a category sets `categoryId` and `categoryManual: true`. **`null`** clears the category and sets `categoryManual: false`, so rules can categorise the row again.
- **Skipped rows.** These are reported, and the rest of the batch still applies:
  - transfer-linked rows (`transferId != null`), reason "linked transfer";
  - a category that is archived, or doesn't apply on the row's `bookingDate`, reason given;
  - assignments that would change nothing, reason "unchanged".
- **Hard errors.** These refuse the whole call:
  - a transaction or category the user doesn't own, or that doesn't exist (the tool doesn't say which);
  - more than 500 items.
- **Without `confirm`:**
  - nothing is written;
  - the tool returns `{wouldChange: [...], skipped: [...]}`, each row with date, amount, counterparty, current category (name, plus whether it's manual) and new category name.
- **With `confirm: true`:**
  - the tool re-validates (the data may have changed since the preview) and applies in one transaction;
  - it returns `{changed: [...], skipped: [...]}`, where every changed row carries its **previous** `categoryId` and `categoryManual`, so the agent can put them back.
- The tool is marked destructive (`destructiveHint`) and its description explains the preview and confirm flow.

## Acceptance criteria

> **Implementation note (2026-11-15):** each assignment also takes an optional `manual` flag (default `true`). Without it, restoring a **rule-assigned** row from the confirm result (`previousCategoryManual: false`) would make it manual, so "feeding those back restores the original state" could not hold. The result's fields are named `previousCategoryId` / `previousCategoryManual`.

- [x] Assigning sets `categoryManual: true`. Clearing with `null` sets `categoryId: null, categoryManual: false`. (`server/src/mcp/assign-categories.spec.ts` "assigns as manual, and clearing with null sets categoryManual false")
- [x] Without `confirm`, nothing is written: the database is unchanged after the call. (`server/src/mcp/assign-categories.spec.ts` "writes nothing without confirm…" compares a full snapshot before/after)
- [x] With `confirm`, every non-skipped row changes in one transaction. A spec forces a failure partway through and shows nothing was written. (`server/src/mcp/assign-categories.spec.ts` "applies all or nothing when a write fails partway through" — a trigger aborts the second row's UPDATE; the first row is unchanged)
- [x] Transfer-linked rows are skipped with reason "linked transfer", and the other rows still apply. (`server/src/mcp/assign-categories.spec.ts` "skips transfer-linked rows and still applies the rest")
- [x] Archived categories, and categories outside their `activeFrom`/`activeUntil` on the row's date, are skipped with a reason. (`server/src/mcp/assign-categories.spec.ts` "skips archived categories and ones outside their active window, with a reason")
- [x] Another user's transaction or category refuses the whole call, and the error doesn't reveal whether that row exists. (`server/src/mcp/assign-categories.spec.ts` "refuses the whole call for another user's transaction or category, without saying which" — foreign row, foreign category and a missing id all get the same message)
- [x] 501 items, or a repeated `transactionId`, is a tool error. (`server/src/mcp/assign-categories.spec.ts` "refuses 501 items and a repeated transactionId")
- [x] The confirm result carries each changed row's previous `categoryId` and `categoryManual`, and feeding those back restores the original state (covered by a spec). (`server/src/mcp/assign-categories.spec.ts` "returns previous values that put every row back when fed in again" — covers a rule-set and a manual row; see the `manual` note above)
- [x] A row that was already manual can be reassigned; the preview shows that its current category is manual. (`server/src/mcp/assign-categories.spec.ts` "reassigns a row that was already manual, and the preview says it was")
- [x] `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` pass. Verified via the fallow skill and the coding-conventions skill. (lint, typecheck and 466 server tests green; fallow dead-code + health gates exit 0; server-only change, coding-conventions **Backend** section applies)

## Notes

- **Manual means "not set by a rule"**, decided 2026-11-14. An agent's assignment survives the next rule run, the same as a click in the UI.
- **Skip, don't fail, for transfers and inapplicable categories.** A month-wide batch shouldn't be thrown out because one row turned out to be a transfer leg. Ownership problems still fail the whole call: they mean the agent has the wrong IDs, not a borderline row.
- **No preview token.** Confirm just re-checks everything, so a row that became a transfer between preview and confirm is skipped rather than overwritten.
- Reuse the bulk route's single-transaction, per-item validation pattern. Pull out a small shared helper only if it actually removes duplication.
