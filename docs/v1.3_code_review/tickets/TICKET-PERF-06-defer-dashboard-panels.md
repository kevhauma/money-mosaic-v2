# TICKET-PERF-06 — Defer below-fold dashboard panels with `@defer (on viewport)`

- **Area:** Performance (dashboard rendering)
- **Type:** Refactor
- **Traceability:** CR-5.3 (carried over from the first review, still open — the customize panel got its `@defer` in TICKET-STAT-14, the content panels did not)

## User story

As a user opening the dashboard, I want the below-fold panels (and their ECharts payloads) to initialize only when scrolled near, so first paint renders the stats row and whatever's visible instead of computing every panel eagerly.

## Description

The dashboard renders all visible rows eagerly inside its `@for`/`@switch`; the only `@defer` present guards the customize panel. The chart-heavy panels (trend chart, category breakdown/comparison, weekday-weekend, top transactions) each run their aggregations and instantiate ECharts on load even when below the fold.

## Current situation (as-is)

- [dashboard-overview.component.html:22-89](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) — every `@case` renders its panel eagerly; [line 91](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html) shows the existing `@defer (on interaction(customizeToggle))` pattern for the customize panel.
- Row order is user-configurable (TICKET-STAT-14's `visibleRows()`), so "below fold" is dynamic — viewport triggers handle that naturally.

## Desired result (to-be)

- Each panel `@case` wraps its component in `@defer (on viewport)` with a `@placeholder` sized to roughly the panel's height (prevents scroll jumps) — except the `stats` row, which is the above-fold headline and stays eager.
- Panels still react to range/store changes normally once loaded.

## Acceptance criteria

- [ ] Panels below the initial viewport do not instantiate (no ECharts init, no aggregation computeds run) until scrolled near — verify via a spec using the defer-block testing APIs and live in the browser (Network/Performance tab or a constructor log in dev).
- [ ] No cumulative-layout-shift regression while scrolling: placeholders approximate panel heights (visual check at desktop and mobile widths).
- [ ] Drag-reordering rows in customize mode and toggling hidden rows still works with deferred panels (TICKET-STAT-14 flows re-checked live).
- [ ] Bundle budget untouched; `ng build --configuration development` clean.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Keep the `@defer` blocks *inside* the `@switch` cases (one per panel), not around the `@for` — each panel must trigger independently.
- `prefetch on idle` is a sensible addition so scrolled-to panels appear instantly; optional.
