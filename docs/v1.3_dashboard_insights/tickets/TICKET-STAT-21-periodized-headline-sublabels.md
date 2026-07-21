# TICKET-STAT-21 — Periodized sub-labels for Income/Expense/Savings/Cash-flow, retiring the Spending rate card

- **Area:** Statistics (dashboard headline stat cards)
- **Type:** Feature
- **Traceability:** extends FR-STAT-2 (income/expense/net/savings-rate); folds in and supersedes FR-STAT-9's `computeSpendingRate` card

## User story

As a dashboard user, I want the Income, Expense, Savings, and Net cash flow cards to show a day/week/month breakdown beneath their totals, so I can judge a period's figures without mentally dividing by the range length myself.

## Description

Replace the year-over-year sub-labels on the Income and Expense cards, and the "€X to savings" sub-label on the Savings rate card, with a periodized breakdown — `€X/month · €X/week · €X/day` — matching the averaging pattern the Spending rate card already established. The Net cash flow card's sub-label switches to a **net margin** figure (net ÷ income) instead, since a day/week/month breakdown of a figure that's already a difference adds little beyond what Income/Expense already show individually. The standalone **Spending rate** card is removed entirely: its `/day` value plus `/week`/`/month` sub-label is now fully subsumed by the Expense card's new sub-label, so it becomes a duplicate rather than a distinct stat.

## Current situation (as-is)

- [dashboard-overview.component.ts:104-119](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts#L104-L119) — `incomeYoySubLabel`/`expenseYoySubLabel`/`netYoySubLabel` all render `"{delta}% vs. last year"` via the shared `yoySubLabel()` helper.
- [dashboard-overview.component.ts:147-150](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts#L147-L150) — `savingsSubLabel` renders `"{amount} to savings"`.
- [dashboard-overview.component.ts:152-164](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts#L152-L164) — `spendingRateValue`/`spendingRateSubLabel` are the existing precedent: value shows `/day`, sub-label shows `€X/week · €X/month` (gated by `MIN_BUCKETS_FOR_AVERAGE`).
- [spending-rate.ts](../../../src/app/core/stats/spending-rate.ts) — `computeSpendingRate` is hard-wired to `periodStats().expense`; there's no way to get the same day/week/month split for `income`, `net`, or `savings` today.
- [period-stats.ts:52-53](../../../src/app/core/stats/period-stats.ts#L52-L53) — `net = income - expense`, `savingsRate = savings / income`; no existing "net margin" (`net / income`) figure.
- [dashboard-overview.component.html:68-73](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html#L68-L73) — the standalone `mm-stat-card` for "Spending rate" (value `spendingRateValue`, sub-label `spendingRateSubLabel`); confirmed via repo-wide search that `spendingRate`/`computeSpendingRate` have no other consumers, so nothing besides this card depends on them.

## Desired result (to-be)

- `computeSpendingRate` (or a new sibling helper it delegates to) accepts the figure to average as a parameter instead of always reading `expense`, so the same bucket-counting logic serves income, expense, and savings without duplicating `bucketKeysInRange` calls.
- Income card sub-label: `€X/month · €X/week · €X/day`, averaging `periodStats().income`.
- Expense card sub-label: same shape, averaging `periodStats().expense`.
- Savings rate card sub-label: same shape, averaging `periodStats().savings` (replaces `"€X to savings"`); the card's headline **value** stays the rate percentage — only the sub-label changes.
- Each figure keeps the existing gating: `/day` always shows, `/week`/`/month` only appear once the range spans ≥2 of that bucket (`MIN_BUCKETS_FOR_AVERAGE`), joined with `·` — identical rules to today's `spendingRateSubLabel`.
- Net cash flow card sub-label becomes a **net margin**: `net / income` as a percentage, worded to match sign — e.g. `"31% of income kept"` when net ≥ 0, `"12% of income overspent"` (using the absolute value) when net < 0. Reuses `netColor`'s existing success/error split for the wording branch. Falls back to `undefined` when `income` is 0 (mirrors `savingsRate`'s existing `null`-on-zero-income guard).
- The four YoY computeds (`incomeYoySubLabel`, `expenseYoySubLabel`, `netYoySubLabel`, `yoySubLabel`, `showYearOverYear`, `yoyTooltip`/`incomeYoyTooltip`/`expenseYoyTooltip`/`netYoyTooltip`) are removed if nothing else on the dashboard consumes them — confirm via a repo-wide usage check before deleting, since TICKET-STAT-07 introduced them specifically for these three cards.
- The "Spending rate" `mm-stat-card` block is deleted from the template, along with `spendingRateValue`/`spendingRateSubLabel` in the component and the now-unused `spendingRate` computed in `StatsStore`. `computeSpendingRate`'s averaging logic isn't deleted — it's what the new generic helper (used by Income/Expense/Savings) is built from — but the card-specific wiring is removed as dead weight once Expense's sub-label covers the same ground.

## Acceptance criteria

- [x] `computeSpendingRate` (or an extracted generic averaging helper it and the others call) is parameterized on the source figure — no duplicated bucket-counting logic between income/expense/savings/spending-rate.
- [x] Income, Expense, and Savings rate cards render `€X/month · €X/week · €X/day` sub-labels sourced from `periodStats()`, gated by the existing `MIN_BUCKETS_FOR_AVERAGE` rule (verified for a range with <2 weeks, <2 months, and ≥2 of both).
- [x] Net cash flow card renders the net-margin sub-label with correct "kept" vs. "overspent" wording for positive and negative `net`, and is `undefined` when `income` is 0.
- [x] The now-unused YoY sub-label/tooltip computeds and their formatter (`YOY_PERCENT_FORMATTER`) are removed if confirmed dead, or left in place with a one-line note if something else still depends on them.
- [x] The "Spending rate" stat card is removed from `dashboard-overview.component.html`, and its now-dead `spendingRateValue`/`spendingRateSubLabel` computeds and the `spendingRate` property on `StatsStore` are removed (its underlying averaging logic lives on, generalized, for Income/Expense/Savings — only the standalone-card wiring is deleted).
- [x] Persistence/state is unaffected — this is presentation-only (`StatsStore`/`computePeriodStats` outputs are read, not written), so no repository changes are needed.
- [x] Unit tests cover: the generalized averaging helper for a non-expense figure (e.g. income), the gating boundary at exactly 2 buckets, the net-margin sign flip at `net === 0` and `net < 0`, and the zero-income `undefined` case.
- [x] `spending-rate.spec.ts` and `stats.store.spec.ts` are updated for the removed/renamed surface rather than left asserting a deleted card's behaviour.
- [ ] Verified via the fallow skill and coding-conventions skill, plus a live browser check of the remaining four cards (Income, Expense, Net cash flow, Savings rate) across a short range (day-only), a multi-week range, and a multi-month range — confirming "Spending rate" no longer renders.

## Notes

- This removes the year-over-year comparison from the three headline cards it currently lives on. If that comparison is still wanted somewhere, it isn't reintroduced by this ticket — flag to the user if that's a concern before merging, since TICKET-STAT-07 built it specifically for this spot.
- Net margin (`net / income`) is deliberately distinct from Savings rate (`savings / income`) — the former nets against *all* expenses, the latter only against money actually moved into savings accounts. They can legitimately diverge (e.g. positive net margin with zero savings-account activity), which is the point of showing both.
- Alternative considered for the Net cash flow sub-label and rejected as redundant: a plain day/week/month breakdown of `net` itself — since Income and Expense already expose their own breakdowns immediately alongside it, a third copy of the same shape adds little; a ratio metric earns its place better.
