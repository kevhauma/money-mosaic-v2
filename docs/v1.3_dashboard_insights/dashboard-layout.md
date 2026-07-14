# Money Mosaic — v1.3 Dashboard Layout

Companion to [overview.md](./overview.md) and [../v1.0_foundation/ui-layout-spec.md](../v1.0_foundation/ui-layout-spec.md) §4.1. That section described the v1.0 Dashboard (stats row → category-breakdown/trend-chart pair → action queue → balance strip); this doc **supersedes §4.1 for the Dashboard page only**, folding in every panel the v1.3 tickets add so they land in one coherent grid instead of being placed ad hoc as each ticket ships. Every ticket in [overview.md](./overview.md) remains independently shippable — this is a target layout to build *towards*, not a sequencing requirement. A ticket that ships before this doc's layout is fully assembled just renders in the v1.0 position (or its own row) until the rest catches up.

## Row-by-row layout

| # | Row | Contents | Width | Source ticket(s) | Notes |
|---|---|---|---|---|---|
| 1 | Page header | Title + net worth header (point-in-time, range-independent) | full | v1.0 | Unchanged. |
| 2 | Primary stats | `stats stats-horizontal`: Income, Expense, Net cash flow, Savings rate (`mm-stat-card` ×4) | full, 4→2→1 cols | v1.0 + [STAT-07](./tickets/TICKET-STAT-07-year-over-year-comparison.md) | STAT-07 adds a "+12% vs. same period last year" delta as each card's existing `subLabel` — no new row, hidden per-card when no valid prior year exists. |
| 3 | Rate & rhythm | Average spending rate card ([STAT-05](./tickets/TICKET-STAT-05-average-spending-rate.md)) \| Weekday vs. weekend split card ([STAT-06](./tickets/TICKET-STAT-06-weekday-weekend-split.md)) | `grid grid-cols-1 lg:grid-cols-2` | STAT-05, STAT-06 | New row. Both are small, single-range "rate" framings (€/day·week·month; weekday vs. weekend €/day + ratio) — their tickets already call for building them back-to-back and placing them near each other. |
| 4 | Category breakdown | `category-breakdown-panel`: expense column \| income column, each donut + expandable list | **full** (was half in v1.0) | [STAT-13](./tickets/TICKET-STAT-13-side-by-side-breakdown-expand.md), nets via [STAT-11](./tickets/TICKET-STAT-11-signed-category-breakdown-netting.md), tooltips via [STAT-12](./tickets/TICKET-STAT-12-chart-tooltip-decimal-rounding.md) | STAT-13 replaces the v1.0 expense/income tab toggle with permanent side-by-side columns, which needs the full row width instead of sharing a row with the trend chart. STAT-09's uncategorised-spend callout renders as a small line under whichever column(s) have a non-zero uncategorised entry. STAT-11/STAT-12 are data-correctness/display fixes underneath this same panel, not layout changes. |
| 5 | Category period comparison | `category-comparison-panel`: top-5 expense categories, each a mini multi-bar/sparkline across the 5-period comparison window + average/high/low + "biggest movers" callout | full | [STAT-04](./tickets/TICKET-STAT-04-category-period-comparison.md) | New row. Full width because each of the 5 categories needs its own mini-chart — the widest, most complex panel in v1.3; hidden on `all-time` or when <2 window periods have data. |
| 6 | Trend chart | `trend-chart-panel`: Income \| Expense, each a same-scale, category-stacked bar chart, side by side within the panel's own internal grid | full | v1.0 (trend chart) + [STAT-17](./tickets/TICKET-STAT-17-split-trend-chart-income-expense.md) | Trend chart moves out of row 4 (bumped by STAT-13 going full-width) into its own full-width row. Originally planned to share a row with `top-transactions-panel`, but two side-by-side stacked-by-category charts already fill a half-width column on their own — squeezing that into half the page read as too cramped, so STAT-17 gave it the full row instead; `top-transactions-panel` moved to its own row below. |
| 7 | Biggest transactions | `top-transactions-panel`: biggest individual transactions | full | [STAT-08](./tickets/TICKET-STAT-08-biggest-transactions.md) | Split out of the former shared row 6 into its own full-width row (see row 6's note). |
| 8 | Action queue | Uncategorised-count card, transfer-review-count card | full | v1.0 | Unchanged. Hidden per-card at zero, as today. |
| 9 | Account balance strip | Per-account name + balance | full | v1.0 | Unchanged, stays last. |

## Grid sketch (desktop, `≥1024px`)

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                    [net worth]     │
├───────────────┬───────────────┬───────────────┬─────────────┤
│ Income (±YoY) │ Expense (±YoY)│ Net (±YoY)    │ Savings rate │
├───────────────────────────────┬──────────────────────────────┤
│ Avg spending rate              │ Weekday vs weekend split     │
├────────────────────────────────────────────────────────────────┤
│ Category breakdown — Expense (donut+list)  │ Income (donut+list)│
│ [uncategorised callout under the relevant column(s)]           │
├────────────────────────────────────────────────────────────────┤
│ Category period comparison — 5 categories × 5-period bars      │
├────────────────────────────────────────────────────────────────┤
│ Trend chart — Income (stacked by category) │ Expense (stacked)  │
├────────────────────────────────────────────────────────────────┤
│ Biggest transactions list                                       │
├────────────────────────────────────────────────────────────────┤
│ Action queue: uncategorised · transfers to review               │
├────────────────────────────────────────────────────────────────┤
│ Account balance strip                                           │
└────────────────────────────────────────────────────────────────┘
```

## Responsive rules

Follows the existing breakpoint table in [ui-layout-spec.md §2](../v1.0_foundation/ui-layout-spec.md) — no new breakpoints introduced:

- **`<640px` (mobile) / `640–1023px` (tablet):** every multi-column row or panel-internal grid (stats, rate & rhythm, category breakdown's expense/income columns, the trend chart's Income/Expense columns) collapses to 1 column, stacked top-to-bottom in the same row order as the desktop table above. The stats row uses daisyUI's existing `stats-vertical` fallback.
- **`≥1024px` (desktop):** row 3 uses `lg:grid-cols-2` at the dashboard-grid level; row 4's expense/income columns and row 6's Income/Expense trend columns use the same `lg:grid-cols-2` internally, within a full-width card — neither row is itself split at the dashboard-grid level.
- Category breakdown's per-column "show more" (STAT-13) doesn't change row height allocation for the *other* column or any other row — each column's expansion is local to its own list.

## Required change to existing code

[dashboard-overview.component.html:30-33](../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) currently has:

```html
<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
  <app-category-breakdown-panel />
  <app-trend-chart-panel />
</div>
```

Once STAT-13 ships, this splits into two rows — `category-breakdown-panel` full width, `trend-chart-panel` moved into its own row 6 (originally paired with `top-transactions-panel` in a shared half-width row; STAT-17 later gave the trend chart the full row to itself and moved `top-transactions-panel` (STAT-08) to row 7 — see row 6's note above). Each new panel component (`category-comparison-panel`, `top-transactions-panel`, the rate/rhythm cards) is added to this template as its own ticket lands; this doc is the target arrangement each of those tickets' "placed on the dashboard grid" notes should converge on, so two tickets landing in either order don't fight over row/column placement.

## Definition of Done

Layout changes ride along with whichever ticket introduces the panel — this doc adds no separate acceptance criteria of its own. Each ticket that touches `dashboard-overview.component.html` should leave the grid matching the row table above (or the closest approximation given what's shipped so far) and verify it live in the browser per that ticket's own acceptance criteria.
