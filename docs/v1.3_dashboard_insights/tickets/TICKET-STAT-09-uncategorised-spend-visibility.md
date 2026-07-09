# TICKET-STAT-09 — Uncategorised spend visibility

- **Area:** Statistics & Dashboard
- **Type:** Feature (suggestion, added during v1.3 scoping)
- **Traceability:** adds FR-STAT-13 (new)
- **Source story:** user-stories.md §6 — *"As a user, I want to see how much of my spend in the selected range is still uncategorised (in € and as a % of expense), so I know how much of my category breakdown to trust."*

## Description

`computeCategoryBreakdown()` already produces an uncategorised entry (`categoryId: null`) inside `expenseByCategory`, and [action-queue-panel.component.ts](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts) already surfaces an app-wide **count** of uncategorised transactions. Neither currently answers "how much of *this range's* spend is uncategorised, in € and %" — the thing this ticket adds is a small, range-scoped, monetary read of data that already exists.

## Current situation (as-is)

- [category-breakdown-panel.component.ts](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) shows the uncategorised entry as just another row in the top-5/donut, with no particular emphasis — a user has to notice it and read its share manually.
- [action-queue-panel.component.ts](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts) shows a global uncategorised transaction **count**, not scoped to the selected range and not in € terms.

## Desired result (to-be)

- No new pure aggregate needed — `computeCategoryBreakdown(...).expenseByCategory.find(e => e.categoryId === null)` already has `total`, `share`, and `transactionCount` for the selected range's uncategorised expense.
- Add a small, explicit callout (e.g. in `category-breakdown-panel` or as its own compact stat card) reading like "€142 uncategorised (8% of expense, 6 transactions) this range" whenever the uncategorised total is non-zero, drill-down-linked to `/transactions` filtered to `categoryId=uncategorised` + the selected range (reusing `UNCATEGORISED_SENTINEL`/`buildTransactionDrilldownParams`, already used by the existing panel).
- Hidden entirely when the uncategorised total is exactly zero (fully categorised range) rather than showing a "0%" no-op line.

## Acceptance criteria

- [ ] Reuses the existing `computeCategoryBreakdown()` uncategorised entry — no new pure function, no duplicated exclusion logic.
- [ ] Callout shows €-total, %-of-expense, and transaction count; hidden when the uncategorised total is 0.
- [ ] Drill-down link reuses `UNCATEGORISED_SENTINEL` + `buildTransactionDrilldownParams`, matching the pattern already in `category-breakdown-panel.component.ts`.
- [ ] Does not duplicate or replace the existing global action-queue count ([action-queue-panel.component.ts](../../../src/app/feature-dashboard/components/action-queue-panel/action-queue-panel.component.ts)) — that one stays app-wide/all-time by design (it's a to-do queue, not a range stat); this ticket adds a range-scoped, monetary sibling, not a redesign.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified live in the browser: a range with some uncategorised transactions shows the callout with correct €/%/count and the drill-down link filters to exactly those transactions; a fully-categorised range shows nothing extra.
