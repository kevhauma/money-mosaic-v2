# TICKET-UI-13 — Chart visual language & motion pass

- **Area:** Design System / Statistics
- **Type:** Feature
- **Traceability:** FR-UI-13

## User story

As a user, I want the app's charts to be the visual centerpiece (this version's "Information Visualization" and "Data Storytelling" terms), with the new accent palette and smooth transitions when data changes, so the numbers read as a story rather than a static report.

## Description

`ngx-echarts` already renders every chart in the app; this ticket recolors those charts to consume [TICKET-UI-11](./TICKET-UI-11-design-tokens-theme.md)'s new tokens and adds a "Motion-Driven" transition treatment (prepare.md's term) when a chart's underlying data changes — without adding a new animation dependency.

[design-language.md](../design-language.md) §2 has the validated 6-slot categorical palette (light + dark, CVD-checked) and §6 has the animation duration/easing values to use.

## Current situation (as-is)

- Chart color options across `feature-dashboard/components/*` (`trend-chart-panel`, `category-breakdown-panel`, `category-comparison-panel`, `weekday-weekend-split-panel`) and `feature-stats`/`feature-income`-style panels each set their own ECharts `color`/series styling, independent of daisyUI theme tokens (canvas rendering can't consume CSS custom properties directly the way DOM elements can).
- [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md) already mirrors the trend chart's key numbers into an `sr-only` DOM table for screen readers — any palette change here must not regress that accessible-numbers coverage.
- No `@angular/animations` dependency exists in the project; ECharts already ships its own transition/animation config independent of Angular's animation system.

## Desired result (to-be)

- A single shared chart-palette utility (e.g. `core/stats/chart-theme.ts` or similar, read once by every chart-rendering component) maps the app's daisyUI theme tokens into a fixed ECharts color array read at chart-init time — colorblind-safe per the dataviz skill's palette guidance, not just visually matched to the new accent.
- ECharts' own built-in `animationDuration`/`animationEasing` series options are tuned for a subtle, consistent transition whenever series data updates (e.g. switching date range/granularity), rather than an instant redraw — this uses ECharts' existing animation engine, adding no new dependency and no bundle-budget impact.
- [TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)'s `sr-only` table continues to reflect the same series data unchanged by this ticket's palette/motion work.

## Acceptance criteria

- [ ] Shared chart-palette utility defined and consumed by every ECharts-rendering component named above, replacing per-component hardcoded color arrays
- [ ] Palette is colorblind-safe (validated per the dataviz skill's guidance)
- [ ] Chart series transitions smoothly on data change via ECharts' native animation options, no new dependency added
- [ ] `angular.json` production bundle budgets unchanged
- [ ] TICKET-STAT-20's accessible-numbers table still renders correct values after this ticket's changes
- [ ] Verified via the fallow and coding-conventions skills, and live in the browser (switch date range/granularity on the Dashboard, confirm smooth transition and correct colors in both light and dark theme)

## Notes

Do not add `@angular/animations` or a third-party motion library for this ticket — ECharts' native animation config plus CSS transitions on DOM-rendered elements (panel entrance, `mm-paper` hover states) cover prepare.md's "Motion-Driven" term without new bundle weight, consistent with the hard rule against raising `angular.json` budgets.
