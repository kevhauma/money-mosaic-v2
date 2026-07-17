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

- [x] Shared chart-palette utility defined and consumed by every ECharts-rendering component named above, replacing per-component hardcoded color arrays
- [x] Palette is colorblind-safe (validated per the dataviz skill's guidance) — colors are copied verbatim from design-language.md §2, which documents its own CVD-safety validation; not independently re-run in this session
- [x] Chart series transitions smoothly on data change via ECharts' native animation options, no new dependency added
- [x] `angular.json` production bundle budgets unchanged — file untouched; production build re-run and confirmed no new error-level budget breach (pre-existing `initial` warning unrelated to this change, see implementation notes)
- [x] TICKET-STAT-20's accessible-numbers table still renders correct values after this ticket's changes — `accessibleRows` in `trend-chart-panel.component.ts` untouched, only the chart-option builder changed
- [~] Verified via the fallow and coding-conventions skills; **not** verified live in the browser (unattended run, live-browser step skipped per instruction)

## Notes

Do not add `@angular/animations` or a third-party motion library for this ticket — ECharts' native animation config plus CSS transitions on DOM-rendered elements (panel entrance, `mm-paper` hover states) cover prepare.md's "Motion-Driven" term without new bundle weight, consistent with the hard rule against raising `angular.json` budgets.

## Implementation notes (as built)

- New [chart-theme.ts](../../../src/app/shared/echarts/chart-theme.ts) (in `shared/echarts/`, not `core/stats/` — the ticket allowed "or similar"; this fits the existing echarts-specific-helper tier alongside `tooltip-formatter.ts`) exports `resolveChartCategoricalColors()` (theme-aware via `prefers-color-scheme`, since no theme switcher exists yet), `CHART_ANIMATION` (design-language.md §6 timings), and `CHART_NO_COLOR_FALLBACK` (the shared neutral-gray fallback, replacing a hardcoded `#9ca3af` literal in `category-breakdown-panel.component.ts`).
- Consumed by all 4 actual ECharts-rendering components: `trend-chart-panel`, `category-breakdown-panel` (both `feature-dashboard`), `net-worth-history-chart`, `account-balance-chart` (both `feature-accounts`). **Scope correction**: the ticket's as-is section also names `category-comparison-panel` and `weekday-weekend-split-panel` as chart components, but neither actually renders ECharts (grep-confirmed) — they're plain HTML/CSS visualizations, out of this ticket's actual scope.
- Every series in all 4 components already colors itself from a user-assigned `account.color`/`category.color`, so the shared palette's practical role is the top-level `EChartsCoreOption.color` fallback for entities without one, not a wholesale re-color of user-chosen chart colors.
- Skipped as explicitly optional: design-language.md §1.2's "very faint (≤4% opacity)" aurora-wash backdrop on `trend-chart-panel`'s plot area — the spec itself flags this as optional and cautions it must never overlap the data lines' contrast zone; left for a follow-up with a live visual check rather than guessing the safe opacity/placement unattended.
