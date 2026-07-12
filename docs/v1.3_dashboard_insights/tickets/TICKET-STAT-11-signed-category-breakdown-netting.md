# TICKET-STAT-11 — Category-kind-driven netting for income/expense totals and breakdown

- **Area:** Statistics & Dashboard
- **Type:** Bug fix
- **Traceability:** fixes FR-STAT-2 (period income/expense) and FR-STAT-3 (category breakdown)

## User story

As a user, I want a refund or payback booked under one of my expense categories to reduce that category's expense — both in the category breakdown and in the dashboard's overall expense total — instead of inflating it, so a group-payment payback (or any partial refund) doesn't make it look like I spent more than I did.

## Description

Two stats functions currently disagree on what decides income vs. expense. `computeCategoryBreakdown()` already buckets a transaction by its **category's** kind (expense categories always land in `expenseByCategory`, income categories always in `incomeBySource`), but within a bucket it adds every transaction's magnitude regardless of sign — so a refund on an expense category **inflates** that category's total instead of **reducing** it. `computePeriodStats()` goes further wrong: it ignores category kind entirely for the overall `income`/`expense` totals and buckets purely by raw amount sign, so that same refund is counted as **income** overall, even though it's categorised as an expense. This ticket fixes both: a transaction that carries a category should always contribute according to that category's kind (netted by sign), in both the per-category breakdown and the overall period totals; only an **uncategorised** transaction falls back to raw amount sign, in both places.

## Current situation (as-is)

- [category-breakdown.ts:43-50](../../../src/app/core/stats/category-breakdown.ts) `addTotal()` always does `total + Math.abs(amount)` — no notion of sign, so a €30 "Groceries" spend and a €10 payback booked to "Groceries" currently sum to €40 of expense instead of netting to €20.
- [category-breakdown.ts:104-106](../../../src/app/core/stats/category-breakdown.ts): the transaction is added to the bucket decided by `category.kind` via `addTotal`, unconditionally increasing that bucket's total by the absolute value.
- [period-stats.ts:85-93](../../../src/app/core/stats/period-stats.ts) doesn't look at `category.kind` at all (beyond the `neutral` check on line 87) — it buckets every non-joint, non-neutral transaction purely by `transaction.amount > 0` / `< 0`. A €10 payback booked to an expense category is added to `income`, not netted against `expense` — so the same transaction is counted as an expense-reducing item in the breakdown (once fixed) but as plain income in the overall total, and the two views disagree.
- The uncategorised fallback in both functions (`category` undefined) buckets by raw sign, which is correct — there's no category kind to defer to.

## Desired result (to-be)

- **Category-breakdown netting:** within a category's own bucket, `addTotal` nets by **signed** amount instead of always adding the absolute value: an expense category's total is `sum(-amount for each transaction)` (a spend of -€30 adds €30, a payback of +€10 subtracts €10, netting to €20), symmetrically for income categories. If a category's net total would go **negative** (refunds exceed spend), clamp its displayed total/share to 0 rather than going negative or flipping bucket — bucket membership stays fixed by `kind`.
- **Overall period totals, driven by category kind:** `computePeriodStats()`'s `income`/`expense` totals are built the same way the breakdown is:
  - A transaction with a category of kind `'expense'` always contributes to `expense` (netted: spend adds, refund subtracts), never to `income`, regardless of its raw sign.
  - A transaction with a category of kind `'income'` always contributes to `income` (netted: receipt adds, clawback/correction subtracts), never to `expense`.
  - An **uncategorised** transaction (no `categoryId`, or an unresolved category) keeps today's fallback: positive amount → `income`, negative amount → `expense`.
  - `neutral`-kind categories remain excluded from both, as today.
  - So: **overall income = netted total of income-category transactions + uncategorised transactions with a positive amount**, and **overall expense = netted total of expense-category transactions + uncategorised transactions with a negative amount** — matching the user's framing exactly, and keeping the dashboard's overall totals consistent with the category breakdown they're meant to summarize.
- `net` and `savingsRate` derive from the corrected `income`/`expense` as before — no formula change there, just correct inputs.

## Acceptance criteria

- [ ] `addTotal` (or an equivalent netting step in `computeCategoryBreakdown`) sums the transaction's **signed contribution towards its category's kind** — for an expense category, a negative `amount` (spend) adds to the total and a positive `amount` (refund/payback) subtracts; mirrored for income categories.
- [ ] A category's net total in the breakdown is clamped to 0 when refunds/paybacks exceed spend in the selected range, rather than going negative or moving the category into the other bucket.
- [ ] `computePeriodStats()` routes any transaction with a resolvable, non-`neutral` category through the same kind-driven, signed-netting rule (expense-kind → nets into `expense`; income-kind → nets into `income`), instead of branching on raw amount sign.
- [ ] `computePeriodStats()` still falls back to raw amount sign only for transactions with **no resolvable category** (uncategorised).
- [ ] The joint-account/`resolveContribution` path (lines 76-83 in period-stats, 95-102 in category-breakdown) and the `neutral`-kind exclusion are both unchanged by this ticket.
- [ ] `share` in the breakdown continues to be computed as a fraction of its bucket's (now netted) grand total.
- [ ] Persistence/derivation stays in `core/stats` — no component or store computes this locally.
- [ ] Unit tests cover, for **both** `computeCategoryBreakdown` and `computePeriodStats`: an expense category with only spends nets to the simple sum; an expense category with a spend and a smaller payback nets to `spend - payback`; an expense category where paybacks exceed spend clamps to 0 in the breakdown; an income category with a spend-side correction (e.g. a salary clawback) nets down symmetrically; an uncategorised transaction still buckets by raw sign; a `neutral`-kind category is still excluded entirely; a transaction categorised as expense with a positive amount is reflected in `expense`, not `income`, in `computePeriodStats()` (the specific regression this ticket fixes).
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: booking a positive-amount transaction under an existing expense category (e.g. a payback) visibly reduces that category's total/share in the dashboard category breakdown panel *and* reduces the dashboard's overall expense figure, rather than adding to income in either.

## Notes

- This does not change **where** a categorised transaction lands (still driven by `category.kind`, established by [TICKET-CAT-02](../../v1.1_joint_accounts/tickets/TICKET-CAT-02-neutral-category-kind.md)) — only **how its magnitude nets** once it's in that bucket, and that the overall totals now agree with the per-category ones instead of falling back to raw sign for categorised transactions.
- Joint-account legs already route through `resolveContribution`/`weight` and already net by signed `weight` per transaction in both functions — this ticket only touches the non-joint, non-neutral path in each.
- Consider extracting the "is this category's kind, netted by sign" rule into one small shared helper in `core/stats` that both `computeCategoryBreakdown` and `computePeriodStats` call, rather than duplicating the branch in two files — worth doing here since this ticket is precisely about the two functions falling out of sync.
