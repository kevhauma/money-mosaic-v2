# TICKET-STAT-20 — Expose the trend chart's key numbers as DOM text

- **Area:** Statistics / a11y (dashboard trend chart)
- **Type:** Feature
- **Traceability:** CR-8's chart item (carried over from the first review, still open)

## User story

As a screen-reader user on the dashboard, I want the trend chart's underlying figures available as text, so the income/expense trend isn't information locked inside a canvas.

## Description

ECharts renders to canvas — assistive tech gets nothing. The first review's remedy stands: mirror the chart's key numbers into DOM text, e.g. a visually-hidden table (period, income, expense/net per bucket), sourced from the same computed data the chart consumes so it can never diverge.

## Current situation (as-is)

- [trend-chart-panel.component.ts](../../../src/app/feature-dashboard/components/trend-chart-panel/trend-chart-panel.component.ts) — builds the series data for the ECharts option; nothing mirrors it into accessible DOM (no `sr-only` content, no `aria-label` summary on the chart host).

## Desired result (to-be)

- A visually-hidden (`sr-only`) table rendered from the same series signal: one row per bucket with the period label and each series' value; the canvas host gets `role="img"` and a concise `aria-label` (e.g. "Income and expense trend, <granularity>, <from>–<to>; table with values follows").
- The pattern is written so the other chart panels can copy it later (out of scope to apply everywhere now).

## Acceptance criteria

- [ ] The hidden table renders exactly the buckets/values the chart shows, updates with range/granularity changes, and is reachable by screen readers (spec asserts rows against the series signal; live check via the accessibility tree).
- [ ] Visually nothing changes (sr-only styling; no layout shift) — browser check at desktop and mobile widths.
- [ ] Values use the app's existing currency formatting so spoken output matches the visible tooltips.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- If TICKET-PERF-06 wraps this panel in `@defer`, the table defers with it — acceptable (the placeholder should carry a brief accessible note that the section loads on scroll).
- Consider extracting the sr-only-table as a tiny shared component only if a second chart adopts it — resist premature generalisation here.
