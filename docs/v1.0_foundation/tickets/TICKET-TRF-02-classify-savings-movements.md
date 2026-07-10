# TICKET-TRF-02 — Classify money moved into savings as "savings", not "expense"

- **Area:** Transfers
- **Type:** Feature
- **Traceability:** extends FR-TRF-1 (§5 Aggregation rules); touches FR-STAT-2 / FR-STAT-3 / FR-CAT-5

## User story

As a saver, I want money I move into a savings account reported as 'savings' rather than 'expense', and never requiring a category, so putting money aside doesn't look like spending or nag me for a category.

## Description

Money that leaves a spending account and lands in one of my own **savings** accounts should be reported on the dashboard as a distinct **savings** figure, not folded into expenses — and such a movement should never need a category. Today a movement to savings is only kept out of expenses when it happens to be linked as a transfer; an unlinked one-sided movement toward a savings account still counts as spending and still shows up as uncategorised.

## Current situation (as-is)

- The dashboard excludes a movement from income/expense **only** when it is a linked transfer: both [period-stats.ts](../../../src/app/core/stats/period-stats.ts) (`if (transaction.transferId != null) continue;`) and [category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts) skip on `transferId != null`. There is no separate "savings" bucket — a linked savings deposit simply disappears from the numbers.
- A **one-sided** movement toward an own savings account is recognised as a likely transfer by [transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts) `isLikelyTransfer()`, but that flag has **no effect on the stats**: while `transferId` is still null the negative amount is counted as **expense** in `computePeriodStats()` and bucketed into `expenseByCategory` (by `amount < 0`) in `computeCategoryBreakdown()`.
- Account type already distinguishes savings: `Account.type === 'savings'` in [app-db.ts](../../../src/app/core/data-access/app-db.ts).
- Because a savings movement is treated like any other spend, it is **surfaced as uncategorised** (it has no `categoryId`), nagging the user to categorise it in three places, all of which key purely off `categoryId == null`:
  - the **"still need a category" counter** — [transactions.store.ts](../../../src/app/feature-transactions/transactions.store.ts) `uncategorisedTransactions` / `uncategorisedCount` (`entities().filter(t => t.categoryId == null)`);
  - the **"uncategorised" transactions filter** — [transactions-overview.component.ts](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.ts) (`filters.categoryId === 'uncategorised'`, sentinel `UNCATEGORISED_SENTINEL` in [search-params.ts](../../../src/app/shared/utils/search-params.ts));
  - the dashboard action queue / backlog ([action-queue-panel.component.ts](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts)).

## Desired result (to-be)

- A transaction that represents money moving **into an own savings account** is classified as a **savings movement** and is:
  - excluded from **expense** (and from `expenseByCategory`),
  - reported under a distinct **savings** total on the dashboard,
  - **never** flagged as uncategorised and never requiring a category.
- A savings movement is detected whether or not its counterpart has been imported/linked:
  - **linked** transfer whose counterpart transaction sits in a `savings`-type account, **or**
  - **one-sided** movement (`isLikelyTransfer`) whose counterparty IBAN belongs to an own `savings`-type account.
- Money moving **out of** savings back into a spending account is not counted as income (mirror treatment), so round-trips don't distort the numbers.
- Balances are unchanged — a savings movement still counts toward both accounts' balances (FR-ACC-3).

## Acceptance criteria

- [x] A single shared helper (e.g. `isSavingsMovement(transaction, accountsById, ownSavingsIbans)` in `core/stats` or `core/transfers`) decides savings classification for both the linked and one-sided cases; the stats functions and the uncategorised surfacing all call it (no duplicated logic).
- [x] `computePeriodStats()` adds a `savings` figure and excludes savings movements from `expense` (and from `income` on the reverse leg); `net`/`savingsRate` are recomputed consistently and the meaning of `savingsRate` is documented against the new figure.
- [x] `computeCategoryBreakdown()` excludes savings movements from `expenseByCategory` / `incomeBySource` so they never appear as an (uncategorised) expense entry.
- [x] A savings movement is **excluded from every "needs a category" surface**, all of which currently key off `categoryId == null`:
  - the **"still need a category" counter** (`uncategorisedCount` / `uncategorisedTransactions` in `transactions.store.ts`) no longer counts savings movements;
  - the **"uncategorised" transactions filter** (`categoryId === 'uncategorised'`) no longer lists savings movements;
  - the dashboard action queue / backlog no longer presents them as needing a category.
  Exclusion goes through the shared `isSavingsMovement` helper, not a second `categoryId == null` check, so the counter, filter, and backlog stay in agreement.
- [x] Detection covers both paths: (a) linked transfer with a `savings`-type counterpart account, and (b) unlinked one-sided movement to an own `savings`-account IBAN (`isLikelyTransfer` + counterparty resolves to a savings account).
- [x] Account balances still include savings movements on both sides (transfers/savings are **not** excluded from balances) — verified unchanged.
- [x] No Dexie schema change is required; if one is unavoidable it is **additive** (new `.version(n+1)`), and any persistence goes through the store/repository, never a direct table write.
- [x] `categoryManual` handling is preserved: if the user *did* manually set a category, that is respected and not stripped (a manual category simply isn't required).
- [x] Unit tests cover: linked-to-savings excluded from expense and reported as savings; one-sided likely-transfer-to-savings excluded from expense (before any pair arrives); reverse leg (savings → checking) not counted as income; a normal expense to a non-savings account still counts as expense; savings movement absent from `uncategorisedCount`/`uncategorisedTransactions` and from the `'uncategorised'` filter results (while a genuinely uncategorised spend still appears in both); balances unchanged.
- [x] Verified live in the browser: a movement to a savings account shows under the savings figure (not expense) on the dashboard, is not counted by the "still need a category" counter, and does not appear when the transactions "uncategorised" filter is applied.

## Notes

- Scope is **classification/reporting**, not a new stored field — prefer deriving savings-ness from `Account.type` + IBAN/transfer links over persisting a flag on `Transaction`.
- Related: [TICKET-TRF-01](./TICKET-TRF-01-clear-category-on-link.md) clears a category when a pair is *linked*; this ticket goes further by (a) covering the still-unlinked one-sided case and (b) surfacing savings as its own figure rather than merely excluding it.
- Decide and document how the **savings total** is presented (e.g. a dedicated tile vs. a line in the period summary) with the FR-STAT owner; the UI placement is a small design call, the classification rules above are the contract.
- Reverse-leg handling (savings → spending) should be explicit so an emergency withdrawal isn't mistaken for income.
