# TICKET-STAT-13 — Side-by-side income/expense breakdown with expandable category list

- **Area:** Statistics & Dashboard
- **Type:** Feature
- **Traceability:** extends FR-STAT-3 (category breakdown)

## User story

As a user reviewing my category breakdown, I want to see my income and expense categories next to each other instead of behind a tab, and I want to expand the list past the top 5 when I need to see more, so I don't have to click back and forth or lose categories that fall just outside the top 5.

## Description

`category-breakdown-panel` currently shows one donut + top-5 list at a time, switched via an `Expense`/`Income` button toggle — seeing both requires two clicks and you can never see them together. The list is also hard-capped at 5 rows with no way to see the rest. This ticket replaces the toggle with a permanent two-column layout (expense | income, each with its own donut + list) and adds a "Show more" expansion per column so the full, already-sorted category list is reachable.

## Current situation (as-is)

- [category-breakdown-panel.component.ts:40](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) — a single `kind = signal<'expense' | 'income'>('expense')` drives which bucket is shown; `entries()` (lines 42-58) maps only the active bucket.
- [category-breakdown-panel.component.ts:60](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts) — `topEntries = computed(() => this.entries().slice(0, 5))` hard-caps the list at 5 with no way to see the rest; the donut chart (`chartOption`, lines 62-75) already uses the full `entries()`, so the underlying data for "more than 5" is already there, just not rendered in the list.
- [category-breakdown-panel.component.html:5-22](../../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.html) — a daisyUI `.join` button pair (`Expense`/`Income`) calls `setKind()`; only one bucket's donut + list renders at a time (html:25-56).
- `computeCategoryBreakdown()` ([category-breakdown.ts](../../../src/app/core/stats/category-breakdown.ts)) already returns both `expenseByCategory` and `incomeBySource`, each pre-sorted descending by `total` (`finalizeEntries`) — no aggregate change is needed, this is purely a component/template restructuring.
- The closest existing "expand" precedent is [transfer-review.component.ts:36](../../../src/app/feature-transactions/components/transfer-review/transfer-review.component.ts) (`reviewExpanded = signal(false)`, toggled by `toggleReview()`, gating a computed and flipping a button label) — reuse that signal + toggle-button shape rather than inventing a new expand pattern.

## Desired result (to-be)

- Replace the `kind` toggle with two permanent columns rendered side by side (`grid grid-cols-1 lg:grid-cols-2`, stacking on mobile per the existing breakpoint convention), one for expense, one for income — each with its own donut chart and list, built from the existing `entries` computation duplicated per kind (or refactored into one `entriesFor(kind)` helper called twice) rather than gated by a single active-kind signal.
- Because both columns now render at once, the panel card grows from half-width to full-width in the dashboard grid (see [dashboard-layout.md](../dashboard-layout.md)) — `dashboard-overview.component.html`'s two-column row is adjusted so `app-category-breakdown-panel` spans the full row and `app-trend-chart-panel` moves to its own row.
- Each column keeps its own independent "show more" state — a `Set<'expense' | 'income'>` (or two booleans) of expanded columns, following the `transfer-review` expand pattern: collapsed shows the existing top-5 slice, expanded shows the full sorted list for that column, with a ghost-button toggle at the bottom of the list whose label flips ("Show more (N)" / "Show less"), `N` being the count of remaining categories.
- Expanding one column's list does not affect or resize the other column's chart/list.
- Both columns keep their existing per-row drill-down link and each column's own empty state ("No expense/income data for this range.") independently — one column can be empty while the other has data.

## Acceptance criteria

- [ ] Expense and income breakdowns render simultaneously, side by side on `lg`+ (stacked on mobile/tablet), with no button/tab required to switch between them.
- [ ] Each column's list defaults to top-5 (reusing the existing pre-sorted order from `computeCategoryBreakdown()` — no new sort logic), with an independent "Show more" control revealing the remaining categories for that column only.
- [ ] "Show more"/"Show less" state is tracked per column (expanding expense does not expand or affect income, and vice versa) and does not persist across a range change in a way that hides newly-relevant data — resets to collapsed when the selected range changes (component reacts to `RangeStore` the same way `entries()` already does).
- [ ] The donut chart for each column continues to reflect the **full** category list for that column regardless of the list's expanded/collapsed state (unchanged from today).
- [ ] Drill-down links (`buildTransactionDrilldownParams`, `UNCATEGORISED_SENTINEL`) keep working identically for both columns, expanded or collapsed.
- [ ] `dashboard-overview.component.html`'s grid is updated so the now-wider `category-breakdown-panel` doesn't cramp against `trend-chart-panel` — verified visually, not just that it compiles.
- [ ] No new pure aggregate is added; `computeCategoryBreakdown()` is unchanged.
- [ ] Unit tests cover: both columns render with independent data; expanding one column's "show more" does not change the other column's rendered row count; the expanded/collapsed count label matches the actual number of remaining categories; an empty column (no transactions in that bucket) shows its own empty state while the other column still renders normally; expand state resets on range change.
- [ ] `angular.json` bundle budgets are not raised.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: both columns visible at once on desktop width, "Show more" reveals categories beyond the top 5 in one column without affecting the other, and the layout stacks cleanly on a mobile viewport.

## Notes

- This ticket only changes `category-breakdown-panel` and the dashboard grid around it — it does not touch [TICKET-STAT-11](./TICKET-STAT-11-signed-category-breakdown-netting.md)'s netting math or [TICKET-STAT-12](./TICKET-STAT-12-chart-tooltip-decimal-rounding.md)'s tooltip formatting, though all three touch the same component file — sequence however's convenient, but expect trivial merge conflicts if built in parallel.
- "Show more" is a plain expand-in-place toggle, not pagination or infinite scroll — consistent with there being no pagination pattern anywhere else in the codebase outside the Transactions table.
